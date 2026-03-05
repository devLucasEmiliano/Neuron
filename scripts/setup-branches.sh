#!/usr/bin/env bash
# setup-branches.sh — Create permanent branch structure and configure GitHub repo
#
# Creates three permanent branches (stable, testing, developing) from main,
# sets developing as the default branch, and applies branch protection rules.
#
# Prerequisites:
#   - gh CLI authenticated with admin access: gh auth login
#   - Git remote 'origin' pointing to the GitHub repo
#
# Usage:
#   ./scripts/setup-branches.sh [--dry-run] [--skip-protection] [--source BRANCH]
#
# Options:
#   --dry-run          Show what would be done without making changes
#   --skip-protection  Skip branch protection rule configuration
#   --source BRANCH    Branch to create from (default: main)

set -euo pipefail

DRY_RUN=false
SKIP_PROTECTION=false
SOURCE_BRANCH="main"
REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --skip-protection) SKIP_PROTECTION=true; shift ;;
    --source) SOURCE_BRANCH="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Detect repo from git remote
REPO=$(git remote get-url origin | sed -E 's#.*github\.com[:/](.+)(\.git)?$#\1#' | sed 's/\.git$//')
if [[ -z "$REPO" ]]; then
  echo "ERROR: Could not detect GitHub repo from git remote"
  exit 1
fi
echo "Repository: $REPO"
echo "Source branch: $SOURCE_BRANCH"
echo ""

run() {
  if $DRY_RUN; then
    echo "[DRY RUN] $*"
  else
    echo ">> $*"
    "$@"
  fi
}

# --- Step 1: Create branches from source ---
echo "=== Step 1: Creating permanent branches ==="

for BRANCH in stable testing developing; do
  if git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
    echo "  Branch '$BRANCH' already exists on remote — skipping"
  else
    echo "  Creating branch '$BRANCH' from '$SOURCE_BRANCH'..."
    run git branch "$BRANCH" "origin/$SOURCE_BRANCH" 2>/dev/null || true
    run git push origin "$BRANCH"
  fi
done
echo ""

# --- Step 2: Set default branch to developing ---
echo "=== Step 2: Setting default branch to 'developing' ==="
if ! command -v gh &>/dev/null; then
  echo "  WARNING: gh CLI not found. Set default branch manually in GitHub repo settings."
elif ! gh auth status &>/dev/null 2>&1; then
  echo "  WARNING: gh CLI not authenticated. Run 'gh auth login' first."
  echo "  Then run: gh repo edit $REPO --default-branch developing"
else
  run gh repo edit "$REPO" --default-branch developing
fi
echo ""

# --- Step 3: Branch protection rules ---
if $SKIP_PROTECTION; then
  echo "=== Step 3: Skipped (--skip-protection) ==="
else
  echo "=== Step 3: Configuring branch protection rules ==="
  if ! command -v gh &>/dev/null || ! gh auth status &>/dev/null 2>&1; then
    echo "  WARNING: gh CLI not available/authenticated."
    echo "  Configure branch protection manually in GitHub repo Settings > Branches:"
    echo "    - stable: Require PR reviews, require status checks (Validate), no direct push"
    echo "    - testing: Require PR reviews, require status checks (Validate), no direct push"
    echo ""
  else
    for BRANCH in stable testing; do
      echo "  Protecting branch '$BRANCH'..."
      run gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
        --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Validate"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF
    done
  fi
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Branch structure:"
echo "  developing (default) — active development"
echo "  testing              — QA / integration"
echo "  stable               — production-ready releases"
echo ""
echo "Workflow: feature branches -> developing -> testing -> stable"
