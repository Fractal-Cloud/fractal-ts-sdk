#!/usr/bin/env bash
# Writes the nightly security issue from the outputs of security.yml in nightly mode, then opens,
# rewrites or closes it with security-issue.sh.
#
# Usage: security-nightly-issue.sh <scan>...
#   For each <scan> (for example: secrets dependencies sast) the environment holds
#   <SCAN>_FINDINGS (a count; empty when the scan did not complete) and <SCAN>_REPORT (Markdown).
#   Dashes in a scan's name become underscores in its variables.
# Needs GH_TOKEN with issues: write, and GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID,
# GITHUB_REF_NAME, RUNNER_TEMP.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: security-nightly-issue.sh <scan>..." >&2
  exit 2
fi
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
total=0
incomplete=()
details="$RUNNER_TEMP/security-nightly-details.md"
: > "$details"
table="| Scan | Findings |"$'\n'"|---|---|"

for scan in "$@"; do
  var="$(echo "$scan" | tr '[:lower:]-' '[:upper:]_')"
  findings_var="${var}_FINDINGS"
  report_var="${var}_REPORT"
  findings="${!findings_var:-}"
  if ! [[ "$findings" =~ ^[0-9]+$ ]]; then
    incomplete+=("$scan")
    table+=$'\n'"| $scan | **did not complete** |"
    continue
  fi
  total=$((total + findings))
  table+=$'\n'"| $scan | $findings |"
  if [ "$findings" -gt 0 ]; then
    {
      printf '%s\n\n' "${!report_var:-}"
    } >> "$details"
  fi
done

# A scan that did not complete keeps the issue open: silence is not a clean result.
problems=$((total + ${#incomplete[@]}))
body="$RUNNER_TEMP/security-nightly-issue.md"
{
  echo "The nightly scan of \`$GITHUB_REF_NAME\` found **$total** findings."
  echo "Dependency and secret findings counted here would fail a release (security.yml in release mode)."
  echo "Static-analysis findings are reported only."
  if [ "${#incomplete[@]}" -gt 0 ]; then
    echo
    echo "**Did not complete:** ${incomplete[*]}. See the run for the error."
  fi
  echo
  echo "Last scan: $run_url ($(date -u +%Y-%m-%dT%H:%MZ)). This issue is rewritten each night and closed when the scan is clean."
  echo
  echo "$table"
  echo
  cat "$details"
} > "$body"

bash "$here/security-issue.sh" \
  "Nightly security scan: dependencies, secrets and static analysis" \
  "$problems" "$body" "The nightly scan of \`$GITHUB_REF_NAME\` is clean: $run_url"
