#!/usr/bin/env bash
#
# check-context-memoization.sh
#
# CI script that ensures all React context providers in contexts/ pass
# memoized values (not inline object literals) as the value prop.
#
# Flags:
#   value={{  — inline object literal (unmemoized, causes re-renders)
#
# Safe:
#   value={someVar}  — a pre-computed variable (presumably from useMemo)
#
# Also flags context files that have a value= prop but are missing a
# useMemo import, which strongly suggests the value is not memoized.

set -euo pipefail

CONTEXTS_DIR="$(cd "$(dirname "$0")/../contexts" && pwd)"
EXIT_CODE=0

if [ ! -d "$CONTEXTS_DIR" ]; then
  echo "ERROR: contexts/ directory not found at $CONTEXTS_DIR"
  exit 1
fi

shopt -s nullglob
FILES=("$CONTEXTS_DIR"/*.tsx)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "WARNING: No .tsx files found in $CONTEXTS_DIR"
  exit 0
fi

echo "Checking context memoization in ${#FILES[@]} file(s)..."
echo ""

# ------------------------------------------------------------------
# Check 1: Inline object literals passed as value prop
#   Matches patterns like:  value={{   or  value={ {
# ------------------------------------------------------------------
for file in "${FILES[@]}"; do
  basename="$(basename "$file")"
  matches=$(grep -n 'value={{\|value={ {' "$file" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "FAIL: Inline object literal in value prop (not memoized)"
    echo "  File: $basename"
    while IFS= read -r line; do
      echo "  $line"
    done <<< "$matches"
    echo ""
    EXIT_CODE=1
  fi
done

# ------------------------------------------------------------------
# Check 2: Context file has a value= prop but no useMemo import
#   This catches cases where someone assigns a plain object to a
#   variable and passes it, but never memoizes it.
# ------------------------------------------------------------------
for file in "${FILES[@]}"; do
  basename="$(basename "$file")"
  has_value_prop=$(grep -c 'value={' "$file" 2>/dev/null || true)
  has_usememo_import=$(grep -c 'useMemo' "$file" 2>/dev/null || true)

  # Allow opt-out if the hook handles memoization (comment: "useMemo applied inside hook")
  has_memo_comment=$(grep -c 'useMemo applied inside' "$file" 2>/dev/null || true)

  if [ "$has_value_prop" -gt 0 ] && [ "$has_usememo_import" -eq 0 ] && [ "$has_memo_comment" -eq 0 ]; then
    echo "FAIL: Context provides a value prop but never imports/uses useMemo"
    echo "  File: $basename"
    grep -n 'value={' "$file" | while IFS= read -r line; do
      echo "  $line"
    done
    echo ""
    EXIT_CODE=1
  fi
done

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "OK: All context providers use memoized values."
else
  echo "---"
  echo "Fix: Wrap inline objects with useMemo and pass the memoized variable."
  echo "  Example:"
  echo "    const value = useMemo(() => ({ foo, bar }), [foo, bar]);"
  echo "    return <MyContext value={value}>...</MyContext>;"
fi

exit "$EXIT_CODE"
