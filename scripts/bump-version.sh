#!/usr/bin/env bash
#
# bump-version.sh - Updates version strings for the Neuron Chrome Extension
#
# Custom version format: X.XX.XXXXy
#   X    = major version (integer)
#   XX   = zero-padded minor version (00-99)
#   XXXX = first 4 hex chars of the commit SHA
#   y    = branch suffix: s (stable), b (testing), d (developing)
#
# Chrome manifest version format: X.Y.Z (strict numeric)
#
# Usage:
#   bump-version.sh [options]
#
# Options:
#   --major            Increment major version (resets minor to 0)
#   --minor            Increment minor version
#   --patch            Increment patch version (Chrome X.Y.Z only)
#   --branch <suffix>  Set branch suffix: s, b, or d (default: d)
#   --hash <hash>      Set commit hash (default: current HEAD)
#   --set-major <N>    Set major version to specific value
#   --set-minor <N>    Set minor version to specific value
#   --dry-run          Print changes without writing files
#   -h, --help         Show this help message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$ROOT_DIR/manifest.json"
VERSION_FILE="$ROOT_DIR/VERSION"

# Defaults
INCREMENT=""
BRANCH_SUFFIX="d"
COMMIT_HASH=""
SET_MAJOR=""
SET_MINOR=""
DRY_RUN=false

usage() {
  sed -n '/^# Usage:/,/^$/p' "$0" | sed 's/^# \?//'
  exit 0
}

die() {
  echo "Error: $1" >&2
  exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --major)    INCREMENT="major"; shift ;;
    --minor)    INCREMENT="minor"; shift ;;
    --patch)    INCREMENT="patch"; shift ;;
    --branch)   BRANCH_SUFFIX="$2"; shift 2 ;;
    --hash)     COMMIT_HASH="$2"; shift 2 ;;
    --set-major) SET_MAJOR="$2"; shift 2 ;;
    --set-minor) SET_MINOR="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    -h|--help)  usage ;;
    *)          die "Unknown option: $1" ;;
  esac
done

# Validate branch suffix
case "$BRANCH_SUFFIX" in
  s|b|d) ;;
  *) die "Invalid branch suffix '$BRANCH_SUFFIX'. Must be s, b, or d." ;;
esac

# Resolve commit hash (first 4 hex chars)
if [[ -z "$COMMIT_HASH" ]]; then
  COMMIT_HASH="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null)" || die "Not a git repo or no commits"
fi
SHORT_HASH="${COMMIT_HASH:0:4}"

# Validate hash is hex
if ! [[ "$SHORT_HASH" =~ ^[0-9a-fA-F]{4}$ ]]; then
  die "Invalid commit hash. First 4 characters must be hex: '$SHORT_HASH'"
fi
SHORT_HASH="$(echo "$SHORT_HASH" | tr '[:upper:]' '[:lower:]')"

# Read current versions from manifest.json
if [[ ! -f "$MANIFEST" ]]; then
  die "manifest.json not found at $MANIFEST"
fi

CURRENT_CHROME_VERSION="$(jq -r '.version // "2.0.0"' "$MANIFEST")"

# Parse Chrome version X.Y.Z
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_CHROME_VERSION"
MAJOR="${MAJOR:-2}"
MINOR="${MINOR:-0}"
PATCH="${PATCH:-0}"

# Apply explicit set values
if [[ -n "$SET_MAJOR" ]]; then
  MAJOR="$SET_MAJOR"
fi
if [[ -n "$SET_MINOR" ]]; then
  MINOR="$SET_MINOR"
fi

# Apply increment
case "${INCREMENT:-}" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

# Build version strings
CHROME_VERSION="${MAJOR}.${MINOR}.${PATCH}"
MINOR_PADDED="$(printf '%02d' "$MINOR")"
CUSTOM_VERSION="${MAJOR}.${MINOR_PADDED}.${SHORT_HASH}${BRANCH_SUFFIX}"

if $DRY_RUN; then
  echo "Dry run - no files modified"
  echo "  Chrome version (manifest version):      $CHROME_VERSION"
  echo "  Custom version (manifest version_name):  $CUSTOM_VERSION"
  echo "  VERSION file:                            $CUSTOM_VERSION"
  exit 0
fi

# Update manifest.json using jq (read) + sed (write) to preserve formatting
# First verify manifest is valid JSON
jq empty "$MANIFEST" 2>/dev/null || die "manifest.json is not valid JSON"

# Check if version_name field already exists
if jq -e '.version_name' "$MANIFEST" > /dev/null 2>&1; then
  # Update existing version_name
  sed -i "s/\"version_name\": \"[^\"]*\"/\"version_name\": \"$CUSTOM_VERSION\"/" "$MANIFEST"
else
  # Add version_name after version field
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$CHROME_VERSION\",\n  \"version_name\": \"$CUSTOM_VERSION\"/" "$MANIFEST"
fi

# Update version field (match the line that has "version" but NOT "version_name" or "manifest_version")
sed -i "/\"manifest_version\"/!{ /\"version_name\"/!{ s/\"version\": \"[^\"]*\"/\"version\": \"$CHROME_VERSION\"/; } }" "$MANIFEST"

# Validate the result is still valid JSON
jq empty "$MANIFEST" 2>/dev/null || die "manifest.json became invalid after update"

# Update VERSION file
echo "$CUSTOM_VERSION" > "$VERSION_FILE"

echo "Version updated:"
echo "  Chrome version (manifest version):      $CHROME_VERSION"
echo "  Custom version (manifest version_name):  $CUSTOM_VERSION"
echo "  VERSION file:                            $CUSTOM_VERSION"
