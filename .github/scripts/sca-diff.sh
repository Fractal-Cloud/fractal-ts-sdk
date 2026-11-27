#!/usr/bin/env bash
# Dependency vulnerability scan: HIGH and CRITICAL findings, in one of four modes (SCA_MODE).
#
#   pr       Scans the working tree and the commit SCA_BASE names (in a temporary git worktree), and
#            fails only on findings the working tree has and the base does not. A vulnerability that
#            already exists on the base branch, or one published today against a dependency nobody
#            touched, never blocks an unrelated pull request.
#   release  Scans the working tree and fails on every finding that has a fix and is not accepted in
#            the suppression file, and on a suppression file with an undocumented or expired entry.
#   nightly  As release, but never fails: the number that would block a release is written to
#            GITHUB_OUTPUT for the nightly issue.
#   report   Lists the working tree's findings and fails nothing (a manual run).
# Without SCA_MODE: pr when SCA_BASE is set, report otherwise. Every mode lists every finding in the
# job summary, which is the debt to work off.
#
# Usage: sca-diff.sh <stack> <path>...
#   npm     <path> is a directory holding package.json and package-lock.json. HIGH and CRITICAL
#           advisories of production dependencies: `npm audit --omit=dev`. Fixable when npm reports a
#           fix is available.
#   go      <path> is a Go module directory. Findings govulncheck reports as reachable (symbol level);
#           govulncheck must be on PATH. Fixable when a fixed version is published.
#   dotnet  <path> is a solution or project file. High and Critical advisories from
#           `dotnet list package --vulnerable --include-transitive`; it restores first. That report
#           carries no fixed version, so every finding counts as fixable.
#   gradle  <path> is a Gradle build directory. Every project's runtimeClasspath, which is what a
#           distribution ships, is resolved into gradle.lockfile files by an init script (the build
#           files are not changed), then osv-scanner reads them; HIGH and CRITICAL means a CVSS score
#           of 7.0 or more. Build tooling (checkstyle, annotation processors) and compile-only
#           dependencies are left out: they never ship. Fixable when an advisory names a fixed
#           version. osv-scanner must be on PATH.
#
# Environment: SCA_MODE; SCA_BASE (pr mode: a commit, usually HEAD^1 of a pull request's merge
# commit); SCA_IGNORE (the suppression file, default .trivyignore, checked by check-trivyignore.sh
# next to this script); GITHUB_STEP_SUMMARY and GITHUB_OUTPUT (optional; outside pr mode the outputs
# are `findings`, the number that blocks a release, and `report`, the summary in Markdown).
set -euo pipefail

stack="${1:?stack: npm, go, dotnet or gradle}"
shift
if [ "$#" -eq 0 ]; then
  echo "usage: sca-diff.sh <stack> <path>..." >&2
  exit 2
fi
paths=("$@")
base="${SCA_BASE:-}"
mode="${SCA_MODE:-}"
if [ -z "$mode" ]; then
  if [ -n "$base" ]; then
    mode="pr"
  else
    mode="report"
  fi
fi
case "$mode" in
  pr)
    if [ -z "$base" ]; then
      echo "SCA_MODE=pr needs SCA_BASE" >&2
      exit 2
    fi
    ;;
  release|nightly|report) base="" ;;
  *) echo "unknown SCA_MODE: $mode" >&2; exit 2 ;;
esac
ignore_file="${SCA_IGNORE:-.trivyignore}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
cleanup() {
  if [ -n "${base_tree:-}" ]; then
    git worktree remove --force "$base_tree" > /dev/null 2>&1 || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT

# Each scanner prints one finding per line, tab-separated:
#   <key> <severity> <description> <ids> <fixable>
# The key is what base and head are compared on, so it names the path, the advisory and the
# package, not the version: a version bump that keeps an advisory open is not a new finding. <ids>
# are the advisory's identifiers and aliases, space-separated, matched against the suppression file.
# <fixable> is yes, or no when no fixed version is published.

scan_npm() { # <tree> <path>
  local dir="$1/$2" tmp
  if [ ! -f "$dir/package-lock.json" ]; then
    return 0
  fi
  # Audit a copy holding just the manifest and the lockfile: no install, no .npmrc, no scripts.
  tmp="$(mktemp -d "$work/npm.XXXXXX")"
  cp "$dir/package.json" "$dir/package-lock.json" "$tmp/"
  (cd "$tmp" && npm audit --omit=dev --json > audit.json 2> audit.err) || true
  if ! jq -e 'has("vulnerabilities")' "$tmp/audit.json" > /dev/null 2>&1; then
    echo "::error::npm audit of $2 did not produce a report:" >&2
    cat "$tmp/audit.json" "$tmp/audit.err" >&2 || true
    return 1
  fi
  jq -r --arg p "$2" '.vulnerabilities | to_entries[] | .value as $v | $v.via[] | objects
    | select(.severity == "high" or .severity == "critical")
    | "\($p) \(.url) \(.name)\t\(.severity)\t\(.name) \(.range): \(.title)\t\(.url | split("/") | last)\t\(if ($v.fixAvailable // false) == false then "no" else "yes" end)"' "$tmp/audit.json"
}

scan_go() { # <tree> <path>
  local out
  out="$(mktemp "$work/go.XXXXXX")"
  (cd "$1/$2" && govulncheck -format json ./...) > "$out"
  jq -rs --arg p "$2" '
    (map(select(.osv)) | map({key: .osv.id, value: .osv}) | from_entries) as $osv
    | .[] | select(.finding) | .finding
    | select((.trace[0].function // "") != "")
    | "\($p) \(.osv) \(.trace[0].module)\treachable\t\(.trace[0].module)@\(.trace[0].version // "?") (fixed in \(.fixed_version // "none")): \($osv[.osv].summary // $osv[.osv].details // "")\t\(([.osv] + ($osv[.osv].aliases // [])) | join(" "))\t\(if (.fixed_version // "") == "" then "no" else "yes" end)"' "$out"
}

scan_dotnet() { # <tree> <path>
  local out
  out="$(mktemp "$work/dotnet.XXXXXX")"
  (cd "$1" && dotnet restore "$2" > "$out.restore" 2>&1) || { cat "$out.restore" >&2; return 1; }
  (cd "$1" && dotnet list "$2" package --vulnerable --include-transitive --format json) > "$out"
  if ! jq -e 'has("projects")' "$out" > /dev/null 2>&1; then
    echo "::error::dotnet list package --vulnerable for $2 did not produce a report:" >&2
    cat "$out" >&2
    return 1
  fi
  jq -r --arg p "$2" '.projects[] | .frameworks[]?
    | (.topLevelPackages[]?, .transitivePackages[]?) as $pkg
    | $pkg.vulnerabilities[]? | select(.severity == "High" or .severity == "Critical")
    | "\($p) \(.advisoryurl) \($pkg.id)\t\(.severity)\t\($pkg.id) \($pkg.resolvedVersion)\t\(.advisoryurl | split("/") | last)\tyes"' "$out"
}

scan_gradle() { # <tree> <path>
  local dir="$1/$2" init out
  init="$work/sca-locks.init.gradle"
  cat > "$init" <<'GRADLE'
// Locks each project's runtimeClasspath so osv-scanner can read the graph that ships. Run with
// --write-locks; it changes nothing in the build itself.
allprojects {
    dependencyLocking {
        lockAllConfigurations()
    }
    tasks.register('scaResolveAll') {
        notCompatibleWithConfigurationCache('resolves configurations of the project')
        doLast {
            project.configurations.findAll { it.canBeResolved && it.name == 'runtimeClasspath' }.each { configuration ->
                try {
                    configuration.resolve()
                } catch (Exception e) {
                    logger.warn("sca-diff: ${project.path}:${configuration.name} not resolved: ${e.message}")
                }
            }
        }
    }
}
GRADLE
  (cd "$dir" && ./gradlew --quiet --no-configuration-cache --init-script "$init" scaResolveAll --write-locks) >&2
  out="$(mktemp "$work/osv.XXXXXX")"
  # Exit 1 means "vulnerabilities found", which is decided below; anything else is a failed scan.
  set +e
  osv-scanner scan source --recursive --format json --output-file "$out" "$dir" > /dev/null 2> "$out.err"
  status=$?
  set -e
  if [ "$status" -ne 0 ] && [ "$status" -ne 1 ]; then
    echo "::error::osv-scanner failed on $2 (exit $status):" >&2
    cat "$out.err" >&2
    return 1
  fi
  jq -r --arg p "$2" '.results[]? | .packages[]? | .package as $pkg
    | ([.vulnerabilities[]? | select([.affected[]?.ranges[]?.events[]? | has("fixed")] | any) | .id]) as $fixed
    | .groups[]?
    | select(((.max_severity // "0") | tonumber? // 0) >= 7.0)
    | "\($p) \(.ids | sort | first) \($pkg.name)\t\(if ((.max_severity | tonumber) >= 9.0) then "critical" else "high" end)\t\($pkg.name) \($pkg.version) (CVSS \(.max_severity))\t\(((.ids // []) + (.aliases // [])) | unique | join(" "))\t\(if ([.ids[] | IN($fixed[])] | any) then "yes" else "no" end)"' "$out"
}

scan_tree() { # <tree>
  local p
  for p in "${paths[@]}"; do
    "scan_$stack" "$1" "$p"
  done | sort -u
}

case "$stack" in
  npm|go|dotnet|gradle) ;;
  *) echo "unknown stack: $stack" >&2; exit 2 ;;
esac

# Suppressions apply outside pull requests only; a pull request gate is already relative to its base.
ignore_invalid=0
: > "$work/ignored.ids"
if [ "$mode" != pr ] && [ -f "$ignore_file" ]; then
  if ! bash "$here/check-trivyignore.sh" "$ignore_file" > "$work/ignore.check" 2>&1; then
    ignore_invalid=1
  fi
  cat "$work/ignore.check"
  # awk, not grep -v: grep exits 1 on a file with no entries, which pipefail would turn into a failure.
  awk '$1 !~ /^#/ && NF > 0 { print $1 }' "$ignore_file" | sort -u > "$work/ignored.ids"
fi

scan_tree "$PWD" > "$work/head.tsv"

# Marks each finding: suppressed (an id is in the suppression file) and blocking (fixable, not
# suppressed). Columns 6 and 7 are appended.
awk -F'\t' -v OFS='\t' '
  FILENAME == ARGV[1] { ignored[$1] = 1; next }
  {
    suppressed = "no"
    n = split($4, ids, " ")
    for (i = 1; i <= n; i++) {
      if (ids[i] in ignored) {
        suppressed = "yes"
      }
    }
    blocking = ($5 == "yes" && suppressed == "no") ? "yes" : "no"
    print $1, $2, $3, $4, $5, suppressed, blocking
  }' "$work/ignored.ids" "$work/head.tsv" > "$work/head.marked.tsv"

new="$work/head.tsv"
if [ "$mode" = pr ]; then
  base_tree="$work/base"
  git worktree add --detach "$base_tree" "$base" > /dev/null 2>&1
  scan_tree "$base_tree" > "$work/base.tsv"
  cut -f1 "$work/base.tsv" | sort -u > "$work/base.keys"
  # FILENAME, not NR == FNR: with no findings on the base, base.keys is empty and NR == FNR would
  # hold for every head line, reporting nothing as new.
  awk -F'\t' 'FILENAME == ARGV[1] { known[$0] = 1; next } !($1 in known)' "$work/base.keys" "$work/head.tsv" > "$work/new.tsv"
  new="$work/new.tsv"
fi

total=$(wc -l < "$work/head.tsv" | tr -d ' ')
added=$(wc -l < "$new" | tr -d ' ')
blocking=$(awk -F'\t' '$7 == "yes"' "$work/head.marked.tsv" | wc -l | tr -d ' ')
report="$work/report.md"
{
  echo "### Dependency vulnerabilities ($stack): $total HIGH/CRITICAL"
  echo
  case "$mode" in
    pr) echo "$added added by this change (these fail the check); the rest already exist on the base." ;;
    release) echo "$blocking have a fix and are not accepted in \`$ignore_file\`: these fail the release." ;;
    nightly) echo "$blocking have a fix and are not accepted in \`$ignore_file\`: these would fail a release." ;;
    report) echo "Report only. $blocking have a fix and are not accepted in \`$ignore_file\`, and would fail a release." ;;
  esac
  if [ "$ignore_invalid" -ne 0 ]; then
    echo
    echo "**\`$ignore_file\` has undocumented or expired entries**, which fail a release:"
    echo '```'
    cat "$work/ignore.check"
    echo '```'
  fi
  echo
  if [ "$total" -gt 0 ]; then
    echo "| New | Severity | Fix | Accepted | Finding | Path and advisory |"
    echo "|---|---|---|---|---|---|"
    while IFS=$'\t' read -r key severity description _ids fixable suppressed _blocking; do
      is_new=""
      if [ "$mode" = pr ] && grep -qxF -- "$key" <(cut -f1 "$new"); then
        is_new="**new**"
      fi
      echo "| $is_new | $severity | $fixable | $suppressed | ${description//|/\\|} | $key |"
    done < "$work/head.marked.tsv"
  fi
} > "$report"
tee -a "$summary" < "$report"

if [ "$mode" = pr ]; then
  while IFS=$'\t' read -r key severity description _rest; do
    echo "::error::New $severity dependency vulnerability: $description ($key)"
  done < "$new"
  if [ "$added" -gt 0 ]; then
    exit 1
  fi
  exit 0
fi

findings=$((blocking + ignore_invalid))
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  delimiter="EOF_$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
  {
    echo "findings=$findings"
    echo "report<<$delimiter"
    # Step outputs are size-limited; the full table stays in the job summary.
    head -c 15000 "$report"
    echo
    echo "$delimiter"
  } >> "$GITHUB_OUTPUT"
fi

if [ "$mode" = release ]; then
  while IFS=$'\t' read -r key severity description _ids _fixable _suppressed is_blocking; do
    if [ "$is_blocking" = yes ]; then
      echo "::error::$severity dependency vulnerability with a fix: $description ($key)"
    fi
  done < "$work/head.marked.tsv"
  if [ "$findings" -gt 0 ]; then
    exit 1
  fi
fi
