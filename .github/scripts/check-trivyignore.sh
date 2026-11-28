#!/usr/bin/env bash
# Refuses a .trivyignore entry that is not documented, or whose expiry has passed.
#
# Every entry is one ID line, directly below one comment line of this exact shape:
#   # <ID> | reason: <why it is accepted> | owner: <GitHub handle> | expires: <YYYY-MM-DD>
#   <ID>
# The comment's ID must equal the entry's ID. An entry expires at the end of its day (UTC).
#
# Usage: check-trivyignore.sh [path]   (default .trivyignore; a missing file passes)
# Used by the image scan action and by .github/scripts/sca-diff.sh.
set -euo pipefail

file="${1:-.trivyignore}"
if [ ! -f "$file" ]; then
  echo "No $file: nothing to check."
  exit 0
fi

today="$(date -u +%Y-%m-%d)"
errors=0
entries=0
previous=""
line_no=0

while IFS= read -r line || [ -n "$line" ]; do
  line_no=$((line_no + 1))
  trimmed="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [ -z "$trimmed" ] || [ "${trimmed:0:1}" = "#" ]; then
    previous="$trimmed"
    continue
  fi

  entries=$((entries + 1))
  id="${trimmed%%[[:space:]]*}"
  pattern="^#[[:space:]]*([^[:space:]|]+)[[:space:]]*\|[[:space:]]*reason:[[:space:]]*[^|[:space:]][^|]*\|[[:space:]]*owner:[[:space:]]*[^|[:space:]][^|]*\|[[:space:]]*expires:[[:space:]]*([0-9]{4}-[0-9]{2}-[0-9]{2})$"
  if [[ ! "$previous" =~ $pattern ]]; then
    echo "::error file=$file,line=$line_no::$id has no '# $id | reason: ... | owner: ... | expires: YYYY-MM-DD' comment on the line above it."
    errors=$((errors + 1))
  else
    documented_id="${BASH_REMATCH[1]}"
    expires="${BASH_REMATCH[2]}"
    if [ "$documented_id" != "$id" ]; then
      echo "::error file=$file,line=$line_no::The comment above $id documents $documented_id."
      errors=$((errors + 1))
    elif ! date -u -d "$expires" +%Y-%m-%d > /dev/null 2>&1 && ! date -u -j -f %Y-%m-%d "$expires" +%Y-%m-%d > /dev/null 2>&1; then
      echo "::error file=$file,line=$line_no::$id has an expiry that is not a date: $expires."
      errors=$((errors + 1))
    elif [[ "$expires" < "$today" ]]; then
      echo "::error file=$file,line=$line_no::$id expired on $expires. Fix the vulnerability, or review the suppression and set a new expiry."
      errors=$((errors + 1))
    fi
  fi
  previous=""
done < "$file"

if [ "$errors" -gt 0 ]; then
  echo "$file: $errors of $entries entries refused."
  exit 1
fi
echo "$file: $entries entries, all documented and unexpired."
