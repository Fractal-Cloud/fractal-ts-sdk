#!/usr/bin/env bash
# Keeps one open issue, labeled `security` and found by its exact title, in step with a nightly scan:
# opens or rewrites it while there are findings, closes it once the scan is clean.
#
# Usage: security-issue.sh <title> <findings-count> <body.md> <clean-comment>
#   <body.md> is the issue body while there are findings; <clean-comment> is posted when closing.
# Needs GH_TOKEN with issues: write, and GITHUB_REPOSITORY.
set -euo pipefail

title="$1"
findings="$2"
body="$3"
clean_comment="$4"

existing="$(gh issue list --repo "$GITHUB_REPOSITORY" --state open --label security \
  --search "\"$title\" in:title" --json number,title \
  --jq ".[] | select(.title == \"$title\") | .number" | head -1)"

if [ "$findings" -eq 0 ]; then
  if [ -n "$existing" ]; then
    gh issue close "$existing" --repo "$GITHUB_REPOSITORY" --comment "$clean_comment"
    echo "Closed #$existing: clean."
  else
    echo "Clean, and no open issue."
  fi
  exit 0
fi

# An issue body is limited to 65536 characters; the full tables stay in the run's summary.
if [ "$(wc -c < "$body")" -gt 60000 ]; then
  head -c 60000 "$body" > "$body.cut"
  printf '\n\n… truncated; the full tables are in the run summary.\n' >> "$body.cut"
  body="$body.cut"
fi

if [ -n "$existing" ]; then
  gh issue edit "$existing" --repo "$GITHUB_REPOSITORY" --body-file "$body"
  echo "Updated #$existing."
else
  if ! gh label list --repo "$GITHUB_REPOSITORY" --search security --json name --jq '.[].name' | grep -qx security; then
    gh label create security --repo "$GITHUB_REPOSITORY" --color B60205 \
      --description "Security findings and hardening"
  fi
  gh issue create --repo "$GITHUB_REPOSITORY" --title "$title" --label security --body-file "$body"
fi
