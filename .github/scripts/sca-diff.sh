#!/usr/bin/env bash
# Dependency vulnerability gate that blocks only what a change adds.
#
# Scans the working tree, and, when SCA_BASE names a commit, that commit too (in a temporary git
# worktree). It fails only on findings the working tree has and the base does not, so a vulnerability
# that already exists on the base branch, or one published today against a dependency nobody touched,
# never blocks an unrelated pull request. Every finding is listed in the job summary either way, which
# is the debt to work off. Without SCA_BASE it reports and never fails.
#
# Usage: sca-diff.sh <stack> <path>...
#   npm     <path> is a directory holding package.json and package-lock.json. HIGH and CRITICAL
#           advisories of production dependencies: `npm audit --omit=dev --audit-level=high`.
#   go      <path> is a Go module directory. Findings govulncheck reports as reachable (symbol level);
#           govulncheck must be on PATH.
#   dotnet  <path> is a solution or project file. High and Critical advisories from
#           `dotnet list package --vulnerable --include-transitive`; it restores first.
#   gradle  <path> is a Gradle build directory. Every resolvable configuration is resolved into
#           gradle.lockfile files by an init script (the build files are not changed), then
#           osv-scanner reads them; HIGH and CRITICAL means a CVSS score of 7.0 or more. osv-scanner
#           must be on PATH.
#
# Environment: SCA_BASE (a commit, usually HEAD^1 of a pull request's merge commit; empty to only
# report), GITHUB_STEP_SUMMARY (optional).
set -euo pipefail

stack="${1:?stack: npm, go, dotnet or gradle}"
shift
if [ "$#" -eq 0 ]; then
  echo "usage: sca-diff.sh <stack> <path>..." >&2
  exit 2
fi
paths=("$@")
base="${SCA_BASE:-}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
work="$(mktemp -d)"
cleanup() {
  if [ -n "${base_tree:-}" ]; then
    git worktree remove --force "$base_tree" > /dev/null 2>&1 || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT

# Each scanner prints one finding per line: <key> TAB <severity> TAB <description>. The key is what
# base and head are compared on, so it names the path, the advisory and the package, not the version:
# a version bump that keeps an advisory open is not a new finding.

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
  jq -r --arg p "$2" '.vulnerabilities | to_entries[] | .value.via[] | objects
    | select(.severity == "high" or .severity == "critical")
    | "\($p) \(.url) \(.name)\t\(.severity)\t\(.name) \(.range): \(.title)"' "$tmp/audit.json"
}

scan_go() { # <tree> <path>
  local out
  out="$(mktemp "$work/go.XXXXXX")"
  (cd "$1/$2" && govulncheck -format json ./...) > "$out"
  jq -rs --arg p "$2" '
    (map(select(.osv)) | map({key: .osv.id, value: (.osv.summary // .osv.details // "")}) | from_entries) as $s
    | .[] | select(.finding) | .finding
    | select((.trace[0].function // "") != "")
    | "\($p) \(.osv) \(.trace[0].module)\treachable\t\(.trace[0].module)@\(.trace[0].version // "?") (fixed in \(.fixed_version // "none")): \($s[.osv] // "")"' "$out"
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
    | "\($p) \(.advisoryurl) \($pkg.id)\t\(.severity)\t\($pkg.id) \($pkg.resolvedVersion)"' "$out"
}

scan_gradle() { # <tree> <path>
  local dir="$1/$2" init out
  init="$work/sca-locks.init.gradle"
  cat > "$init" <<'GRADLE'
// Locks every resolvable configuration so osv-scanner can read the resolved graph. Run with
// --write-locks; it changes nothing in the build itself.
allprojects {
    dependencyLocking {
        lockAllConfigurations()
    }
    tasks.register('scaResolveAll') {
        notCompatibleWithConfigurationCache('resolves every configuration of the project')
        doLast {
            project.configurations.findAll { it.canBeResolved }.each { configuration ->
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
  jq -r --arg p "$2" '.results[]? | .packages[]? | .package as $pkg | .groups[]?
    | select(((.max_severity // "0") | tonumber? // 0) >= 7.0)
    | "\($p) \(.ids | sort | first) \($pkg.name)\t\(if ((.max_severity | tonumber) >= 9.0) then "critical" else "high" end)\t\($pkg.name) \($pkg.version) (CVSS \(.max_severity))"' "$out"
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

scan_tree "$PWD" > "$work/head.tsv"

new="$work/head.tsv"
if [ -n "$base" ]; then
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
{
  echo "### Dependency vulnerabilities ($stack): $total HIGH/CRITICAL"
  echo
  if [ -n "$base" ]; then
    echo "$added added by this change (these fail the check); the rest already exist on the base."
  else
    echo "Report only: no base commit to compare against."
  fi
  echo
  if [ "$total" -gt 0 ]; then
    echo "| New | Severity | Finding | Path and advisory |"
    echo "|---|---|---|---|"
    while IFS=$'\t' read -r key severity description; do
      is_new=""
      if [ -n "$base" ] && grep -qxF -- "$key" <(cut -f1 "$new"); then
        is_new="**new**"
      fi
      echo "| $is_new | $severity | ${description//|/\\|} | $key |"
    done < "$work/head.tsv"
  fi
} | tee -a "$summary"

if [ -n "$base" ]; then
  while IFS=$'\t' read -r key severity description; do
    echo "::error::New $severity dependency vulnerability: $description ($key)"
  done < "$new"
  if [ "$added" -gt 0 ]; then
    exit 1
  fi
fi
