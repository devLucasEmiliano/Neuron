# PRD: Git Branching Strategy, Versioning Scheme & CI/CD Pipeline

## Introduction

Establish a structured Git branching workflow with three permanent branches (stable, testing, developing), a custom versioning scheme that encodes major/minor features, commit hash, and branch origin, and a GitHub Actions CI/CD pipeline that automates validation, version stamping, promotions, releases, and changelog generation for the Neuron Chrome Extension.

## Goals

- Create three permanent branches: `stable`, `testing`, `developing` with a clear promotion flow (developing -> testing -> stable)
- Implement a custom version format `X.XX.XXXXs/b/d` displayed via `version_name` in manifest.json, alongside Chrome's strict `X.Y.Z` in `version`
- Store the version in `manifest.json`, a root `VERSION` file, and the popup UI
- Automate promotion from developing to testing when all CI checks pass
- Automate version string updates on merge
- Build `.zip` release artifacts for stable releases
- Create GitHub Releases with auto-generated changelogs on stable merges
- Support hotfix branches off stable that merge back to both stable and developing

## User Stories

### US-001: Create permanent branch structure
**Description:** As a developer, I want three permanent branches (`stable`, `testing`, `developing`) so that code flows through a structured promotion pipeline.

**Acceptance Criteria:**
- [ ] Branch `developing` exists and is the default working branch for new features
- [ ] Branch `testing` exists as the integration/QA stage
- [ ] Branch `stable` exists as the production-ready branch
- [ ] Repository default branch is set to `developing`
- [ ] Branch protection rules prevent direct pushes to `stable` and `testing`

### US-002: Implement custom versioning scheme
**Description:** As a developer, I want a version format `X.XX.XXXXy` (where X = major, XX = minor features, XXXX = first 4 chars of commit hash, y = s/b/d for branch) so that any version string immediately tells me the feature level, commit origin, and branch.

**Acceptance Criteria:**
- [ ] `manifest.json` `version` field uses Chrome's strict `X.Y.Z` format (e.g., `2.1.0`)
- [ ] `manifest.json` `version_name` field uses the custom format (e.g., `2.01.a3f4s`)
- [ ] A root `VERSION` file contains the custom version string
- [ ] The suffix is `s` for stable, `b` for testing, `d` for developing
- [ ] The 4-char commit hash portion updates automatically on each merge/build

### US-003: Display version in popup UI
**Description:** As a user, I want to see the current extension version in the popup so I know which build I'm running.

**Acceptance Criteria:**
- [ ] The popup page displays the custom `version_name` from manifest.json
- [ ] Version label is visible without scrolling (e.g., footer or header of popup)
- [ ] Version updates correctly after each new build
- [ ] Verify in browser using dev-browser skill

### US-004: CI pipeline - Validate on push/PR
**Description:** As a developer, I want the CI pipeline to run validation (lint, manifest checks) on every push and PR so that broken code is caught early.

**Acceptance Criteria:**
- [ ] GitHub Actions workflow triggers on push to `developing`, `testing`, `stable`
- [ ] GitHub Actions workflow triggers on PRs targeting any of the three branches
- [ ] Workflow validates manifest.json is well-formed
- [ ] Workflow runs any configured linters
- [ ] Failed checks block PR merges

### US-005: CI pipeline - Auto-update version on merge
**Description:** As a developer, I want the version string to be automatically updated when code is merged into any of the three main branches so that I don't have to do it manually.

**Acceptance Criteria:**
- [ ] On merge to `developing`, version is stamped with suffix `d` and current commit hash
- [ ] On merge to `testing`, version is stamped with suffix `b` and current commit hash
- [ ] On merge to `stable`, version is stamped with suffix `s` and current commit hash
- [ ] Both `manifest.json` (`version_name`) and `VERSION` file are updated
- [ ] The Chrome `version` field (`X.Y.Z`) is incremented appropriately (patch bump on stable merges)

### US-006: CI pipeline - Auto-promote developing to testing
**Description:** As a developer, I want code to be automatically promoted from `developing` to `testing` when all CI checks pass so that validated code moves forward without manual intervention.

**Acceptance Criteria:**
- [ ] When all checks pass on a push/merge to `developing`, a PR is auto-created from `developing` to `testing`
- [ ] The auto-PR includes a summary of commits being promoted
- [ ] If an open promotion PR already exists, it is updated rather than duplicated

### US-007: CI pipeline - Build release artifact for stable
**Description:** As a developer, I want a `.zip` artifact built automatically when code is merged to `stable` so that I have a ready-to-publish extension package.

**Acceptance Criteria:**
- [ ] On merge to `stable`, workflow packages the extension into a `.zip` file
- [ ] The `.zip` excludes dev-only files (e.g., `.github/`, `tasks/`, `tests/`, `.claude/`)
- [ ] The `.zip` filename includes the version string (e.g., `neuron-2.01.a3f4s.zip`)
- [ ] The artifact is uploaded to the GitHub Actions run

### US-008: CI pipeline - Create GitHub Release with changelog
**Description:** As a developer, I want a GitHub Release created automatically on stable merges with an auto-generated changelog so that release history is documented.

**Acceptance Criteria:**
- [ ] A GitHub Release is created with the version tag (e.g., `v2.01.a3f4s`)
- [ ] The release includes the `.zip` artifact as a downloadable asset
- [ ] The release body contains an auto-generated changelog (commits since last stable release)
- [ ] The release is marked as "latest"

### US-009: Hotfix workflow
**Description:** As a developer, I want to create hotfix branches off `stable` and merge them back to both `stable` and `developing` so that critical fixes reach production quickly without losing the fix in the dev branch.

**Acceptance Criteria:**
- [ ] Hotfix branches are named `hotfix/<description>` and branch from `stable`
- [ ] On merge of a hotfix to `stable`, CI auto-creates a PR to merge the same fix into `developing`
- [ ] Version is bumped as a patch release on stable
- [ ] The hotfix triggers the same release artifact and GitHub Release creation as a normal stable merge

### US-010: Version bump script
**Description:** As a developer, I want a script that handles version bumping so that the CI and local workflows can reliably update version strings.

**Acceptance Criteria:**
- [ ] A script (e.g., `scripts/bump-version.sh`) accepts parameters: major/minor increment, branch suffix, commit hash
- [ ] Script updates `manifest.json` `version` (X.Y.Z), `manifest.json` `version_name` (custom format), and `VERSION` file
- [ ] Script can be run locally for manual version bumps
- [ ] Script is idempotent (running twice with same params produces same result)

## Functional Requirements

- FR-1: Three permanent branches exist: `stable`, `testing`, `developing`, with `developing` as the default branch
- FR-2: The custom version format is `X.XX.XXXXy` where X = major version (integer), XX = zero-padded minor version (00-99), XXXX = first 4 hex chars of the commit SHA, y = branch suffix (`s` = stable, `b` = testing, `d` = developing)
- FR-3: `manifest.json` contains both `version` (Chrome format X.Y.Z) and `version_name` (custom format)
- FR-4: A `VERSION` file at the repository root contains the custom version string
- FR-5: The popup UI reads and displays `version_name` from the manifest
- FR-6: GitHub Actions workflows run on push/PR to all three main branches
- FR-7: On successful CI on `developing`, an auto-PR is created to `testing`
- FR-8: On merge to any main branch, version strings are auto-updated via a version bump script
- FR-9: On merge to `stable`, a `.zip` release artifact is built and a GitHub Release is created with changelog
- FR-10: Hotfix branches follow the naming convention `hotfix/*`, branch from `stable`, and merge back to both `stable` and `developing`
- FR-11: A `scripts/bump-version.sh` utility handles all version string mutations

## Non-Goals

- No automatic publishing to Chrome Web Store (manual upload for now)
- No automated end-to-end testing of the extension in a browser
- No staging/preview environment deployment
- No semantic-release or conventional-commits enforcement (custom scheme takes priority)
- No branch-specific feature flags

## Technical Considerations

- Chrome's `manifest.json` `version` field must be strictly `X.Y.Z` or `X.Y.Z.W` (no letters allowed), so the custom format lives in `version_name`
- The `version_name` is what Chrome displays to users in `chrome://extensions` if present
- GitHub Actions needs write permissions to push version bump commits back to branches (use `GITHUB_TOKEN` or a PAT with appropriate scopes)
- The auto-promotion PR (developing -> testing) should use `gh` CLI or GitHub API via Actions
- The `.zip` build should mirror what would be uploaded to Chrome Web Store
- Consider using `jq` in the bump script to safely modify `manifest.json`
- Branch protection rules may need "Allow GitHub Actions to bypass" for auto-version commits

## Success Metrics

- Every merge to a main branch results in correct, automatic version stamping within 2 minutes
- Every stable release has a corresponding GitHub Release with downloadable `.zip` and changelog
- Hotfixes reach stable within one PR cycle (no manual branch juggling)
- Developers never manually edit version strings

## Open Questions

- Should the minor version (`XX`) be incremented automatically on each testing->stable promotion, or manually controlled?
- Should the auto-promotion PR (dev->testing) be auto-merged if tests pass, or always require manual approval?
- Do we need branch-specific icons or badge overlays (e.g., a "DEV" watermark on the icon for developing builds)?
- Should the changelog format follow any specific template (Keep a Changelog, etc.)?
