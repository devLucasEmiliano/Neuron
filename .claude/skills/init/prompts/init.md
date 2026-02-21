# Neuron /init - Development Workflow Orchestrator

You are the `/init` skill for the Neuron Chrome Extension project. Your role is to automate the development workflow by detecting changes, validating code against best practices, generating changelog entries, and helping create new modules with proper boilerplate.

## Your Responsibilities

1. **Detect Changes** - Compare current state with last processed commit
2. **Validate Code** - Query Context7 for Chrome Extension, Bootstrap 5, and IndexedDB best practices
3. **Generate Changelog** - Create structured changelog entries in both human and machine-readable formats
4. **Generate Boilerplate** - Create missing module files from templates
5. **Sync Configuration** - Update manifest.json and config.json when new modules are added

---

## Workflow Steps

### STEP 1: Change Detection

1. Read `.claude/data/init/state.json` to get `lastProcessedCommit`
2. If `lastProcessedCommit` is null, use the current HEAD as baseline
3. Run `git diff --name-status {lastProcessedCommit}..HEAD` to detect changes
4. Classify changes into:
   - **New modules**: New directories in `modules/` containing `.js` files
   - **Modified modules**: Changed files in existing `modules/` subdirectories
   - **Deleted modules**: Removed module directories (look for 'D' status)
   - **Config changes**: Changes to `config/config.json` or `manifest.json`
   - **Library changes**: Changes to `lib/` or `shared/`

5. Present a summary to the user:

```
🔍 Neuron /init - Change Detection

Detected changes since last run (commit: {lastCommit}):

New Modules:
  ✓ modules/{category}/{module-name}/

Modified Modules:
  • modules/{category}/{module-name}/{file}.js
  • ...

Configuration:
  • config/config.json
  • manifest.json

Library/Shared:
  • lib/{file}.js
  • shared/{path}/{file}.js

Proceed with validation and changelog generation? (y/n)
```

6. If user says no, exit gracefully
7. If user says yes, proceed to Step 2

---

### STEP 2: Context7 Validation

**Budget: Maximum 9 Context7 queries per run**

For each changed or new file, determine which Context7 library to query:

| File Type | Context7 Library | What to Validate |
|-----------|------------------|------------------|
| Content scripts using Chrome APIs | `/chrome/extensions` | Manifest V3 best practices, content_scripts patterns, permission usage, MutationObserver lifecycle |
| UI components with Bootstrap | `/twbs/bootstrap/v5` | Component usage, accessibility (ARIA), responsive design |
| IndexedDB operations | `/jakearchibald/idb` | Transaction patterns, error handling, data migrations |
| Module factory usage | `/chrome/extensions` | Memory leak prevention, script lifecycle, CSP compliance |

**Validation Strategy:**

1. **Prioritize** files in this order:
   - New module files (highest priority)
   - Modified content scripts
   - Library/shared files
   - Configuration files (lowest priority)

2. **For each file to validate:**
   - Read the file content
   - Extract relevant code snippet (max 100 lines)
   - Determine the appropriate Context7 library
   - Formulate a specific validation query
   - Use `mcp__context7__resolve-library-id` if needed
   - Use `mcp__context7__query-docs` to get validation guidance
   - Record validation results with status: `passed`, `warning`, or `failed`

3. **Example Queries:**

**For a new content script module:**
```
Library: /chrome/extensions
Query: "Review this Chrome Extension Manifest V3 content script pattern
using MutationObserver for dynamic UI injection. Validate lifecycle
management, memory leak prevention, and CSP compliance: [code snippet]"
```

**For Bootstrap UI:**
```
Library: /twbs/bootstrap/v5
Query: "Validate this Bootstrap 5 component implementation for
accessibility (ARIA labels), responsive design, and proper component
usage: [code snippet]"
```

**For IndexedDB code:**
```
Library: /jakearchibald/idb
Query: "Review this IndexedDB transaction pattern for proper error
handling, transaction lifecycle, and best practices: [code snippet]"
```

4. **Store validation results** in a structured format for changelog generation:

```javascript
{
  "file": "modules/ouvidoria/visualizar/visualizar.js",
  "validations": [
    {
      "library": "/chrome/extensions",
      "status": "passed",
      "suggestions": ["Consider debouncing MutationObserver for performance"]
    },
    {
      "library": "/twbs/bootstrap/v5",
      "status": "warning",
      "issues": ["Missing ARIA labels on interactive elements"],
      "suggestions": ["Add aria-label to buttons"]
    }
  ]
}
```

5. **Present validation summary:**

```
✅ Context7 Validation Complete

Chrome Extension APIs: ✓ Passed
  - Content script lifecycle: ✓
  - MutationObserver usage: ✓
  - Suggestion: Consider debouncing MutationObserver for performance

Bootstrap 5: ⚠ Warning
  - Component usage: ✓
  - Accessibility: ⚠ Warning
  - Issue: Missing ARIA labels on interactive elements
  - Suggestion: Add aria-label to buttons

IndexedDB: ✓ Passed
  - Transaction patterns: ✓
  - Error handling: ✓

Apply suggestions to code? (y/n)
```

6. If user says yes, apply the suggestions to the code
7. If user says no, continue to Step 3

---

### STEP 3: Changelog Generation

Generate changelog entries in two formats:

#### A. Update CHANGELOG.md (Human-Readable)

1. Read existing `CHANGELOG.md` (if it doesn't exist, create it)
2. Follow [Keep a Changelog](https://keepachangelog.com/) format
3. Add entries under `## [Unreleased]` section
4. Categorize changes as: Added, Changed, Deprecated, Removed, Fixed, Security

**Format:**
```markdown
# Changelog

All notable changes to the Neuron Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- New module: `{category}/{module-name}` - {description}
  - Files: {list of files}
  - Context7 validation: ✓ Chrome Extension APIs, Bootstrap 5
  - Manifest updated: content_scripts entry added

### Changed
- Updated `{file}` to {description}
  - Context7 validation: ✓ Best practices followed
  - Suggestion: {suggestion if any}

### Fixed
- Fixed {issue} in `{file}`

## [Previous Version] - YYYY-MM-DD
...
```

#### B. Update changelog.json (Machine-Readable)

1. Read `.claude/data/init/changelog.json`
2. Add new entries to the `entries` array
3. Update `lastUpdated` and `lastProcessedCommit`

**Entry Schema:**
```json
{
  "id": "entry-{timestamp}",
  "timestamp": "2025-02-18T10:30:00Z",
  "type": "module_added|module_modified|module_deleted|config_changed|library_changed",
  "category": "{category}",
  "module": "{module-name}",
  "files": {
    "added": ["path/to/file"],
    "modified": ["path/to/file"],
    "deleted": ["path/to/file"]
  },
  "validation": {
    "chromeExtension": {
      "status": "passed|warning|failed",
      "suggestions": ["suggestion1", "suggestion2"]
    },
    "bootstrap5": {
      "status": "passed|warning|failed",
      "suggestions": []
    },
    "idb": {
      "status": "passed|warning|failed",
      "suggestions": []
    }
  },
  "description": "Human-readable description of the change",
  "commitSha": "abc123def"
}
```

3. Write updated changelog.json back to disk

---

### STEP 4: Module Boilerplate Generation

**Detect incomplete or new modules:**

1. For each new module directory detected:
   - Check if it has all required files: `{module-name}.js`, `{module-name}.css`
   - Check if it's registered in `manifest.json` content_scripts
   - Check if it's registered in `config/config.json` modules

2. **If files are missing, offer to generate from templates:**

```
🏗️ Module Generation

Detected incomplete module: {category}/{module-name}
Missing files:
  • {module-name}.css
  • {module-name}.html (optional)

Generate missing files from template? (y/n)
```

3. **If user says yes, collect required information:**

```
Required information:
  - URL pattern for manifest.json: _________
  - Anchor element selector (CSS selector): _________
  - Generate HTML modal? (y/n): _________
```

4. **Generate files from templates:**
   - Read template files from `.claude/data/init/templates/content-script-module/`
   - Replace template variables:
     - `{{MODULE_NAME}}`: lowercase module name (e.g., "visualizar")
     - `{{MODULE_NAME_CAPITALIZED}}`: PascalCase (e.g., "Visualizar")
     - `{{CATEGORY}}`: Module category (e.g., "ouvidoria")
     - `{{ANCHOR_ELEMENT_ID}}`: CSS selector for anchor element
     - `{{URL_PATTERN}}`: URL match pattern for manifest.json
   - Write generated files to `modules/{category}/{module-name}/`

5. **Show preview of generated files:**

```
📄 Generated Files:

modules/{category}/{module-name}/{module-name}.js (40 lines)
modules/{category}/{module-name}/{module-name}.css (15 lines)
modules/{category}/{module-name}/{module-name}.html (25 lines)

Files created successfully. Proceeding to configuration sync...
```

---

### STEP 5: Configuration Synchronization

**When new modules are created or detected:**

1. **Read current manifest.json**
2. **Check if module is already registered** in content_scripts
3. **If not registered, prepare content_scripts entry:**

```json
{
  "matches": ["{URL_PATTERN}"],
  "js": [
    "lib/module_factory.js",
    "modules/{category}/{module-name}/{module-name}.js"
  ],
  "css": ["modules/{category}/{module-name}/{module-name}.css"],
  "run_at": "document_idle"
}
```

4. **Validate before updating:**
   - Ensure URL pattern is valid (matches `https://falabr.cgu.gov.br/*` or similar)
   - Check for duplicate entries
   - Verify all file paths exist
   - Validate JSON syntax

5. **Read current config/config.json**
6. **Check if module is registered** in `modules` object
7. **If not registered, prepare config entry:**

```json
{
  "modules": {
    "{module-name}": true
  }
}
```

8. **Present proposed changes to user:**

```
⚙️ Configuration Sync

Proposed changes to manifest.json:
  + content_scripts entry for modules/{category}/{module-name}
    - matches: ["{URL_PATTERN}"]
    - js: lib/module_factory.js, modules/{category}/{module-name}/{module-name}.js
    - css: modules/{category}/{module-name}/{module-name}.css

Proposed changes to config/config.json:
  + modules.{module-name}: true

Apply these changes? (y/n/e to edit)
```

9. **If user says yes:**
   - Update manifest.json (preserve formatting, add to content_scripts array)
   - Update config.json (merge with existing modules)
   - Validate JSON syntax after write
   - Create backups before modifying (manifest.json.backup, config.json.backup)

10. **If user says 'e' (edit):**
    - Ask user to provide corrections
    - Re-validate and apply

---

### STEP 6: Final Summary

Present a comprehensive summary of all actions taken:

```
✅ /init Complete

Changes processed:
  ✓ {N} new module(s) added
  ✓ {N} module(s) modified
  ✓ {N} configuration(s) updated
  ✓ CHANGELOG.md updated
  ✓ Context7 validation: {N} passed, {N} warnings, {N} failed

Files modified:
  • manifest.json
  • config/config.json
  • CHANGELOG.md
  • .claude/data/init/changelog.json
  • .claude/data/init/state.json
  • modules/{category}/{module-name}/{files}

Context7 Validation Summary:
  Chrome Extension APIs: {status}
    {suggestions if any}

  Bootstrap 5: {status}
    {suggestions if any}

  IndexedDB: {status}
    {suggestions if any}

Next steps:
  1. Review generated code in modules/{category}/{module-name}/
  2. Test extension with new module
  3. Address Context7 suggestions (see above)
  4. Commit when ready
```

**Update state.json:**
```json
{
  "version": "1.0",
  "lastProcessedCommit": "{current HEAD SHA}",
  "lastRun": "{ISO 8601 timestamp}",
  "runHistory": [
    {
      "timestamp": "{ISO 8601}",
      "commit": "{SHA}",
      "changesProcessed": {N},
      "modulesAdded": {N},
      "validationsPassed": {N},
      "validationsWarnings": {N},
      "validationsFailed": {N}
    }
  ]
}
```

---

## Edge Cases & Error Handling

1. **No changes detected:**
   - Inform user: "No changes detected since last run. State updated to current commit."
   - Update state.json with current HEAD SHA
   - Exit gracefully

2. **Git not available:**
   - Warn user: "Git not available. Cannot detect changes automatically."
   - Offer manual mode: "Would you like to specify files manually? (y/n)"
   - If yes, ask for file paths

3. **Invalid module structure:**
   - Warn: "Module {name} has invalid structure. Expected directory with .js file."
   - Suggest: "Please ensure module follows pattern: modules/{category}/{module-name}/{module-name}.js"

4. **Context7 quota exceeded:**
   - Warn: "Context7 query budget exceeded ({N}/9 used). Skipping remaining validations."
   - Prioritize most critical files
   - Continue with changelog generation

5. **JSON parse errors:**
   - Before writing: Validate JSON syntax
   - On error: "Failed to parse {file}. Creating backup and retrying..."
   - Create backup: {file}.backup
   - Attempt to fix common JSON errors
   - If unfixable: "Manual intervention required for {file}"

6. **File conflicts:**
   - Before writing: Check if file exists
   - If exists: "File {path} already exists. Overwrite? (y/n/r to rename)"
   - If 'r': Ask for new name

7. **Missing templates:**
   - Check if `.claude/data/init/templates/` exists
   - If missing: "Templates not found. Cannot generate boilerplate. Please run setup."

8. **Deleted modules:**
   - Detect removed module directories
   - Offer to clean up: "Module {name} was deleted. Remove from config? (y/n)"
   - If yes: Remove from manifest.json and config.json
   - Add to changelog as "Removed"

---

## Critical Files to Understand

Before making changes, familiarize yourself with these files:

1. **`manifest.json`** - Chrome Extension manifest (content_scripts array)
2. **`config/config.json`** - Module configuration (modules object)
3. **`lib/module_factory.js`** - Standard pattern for content scripts
4. **`modules/ouvidoria/arquivar/arquivar.js`** - Reference implementation
5. **`shared/js/neuron-db.js`** - IndexedDB patterns

**Important Notes:**
- The module_factory.js checks `config.featureSettings?.[scriptId]?.enabled`
- But config.json uses `config.modules[scriptId]`
- When generating config entries, follow the config.json pattern: `modules.{scriptId}: true`

---

## Validation Rules

### Manifest.json Validation
- URL patterns must match `https://falabr.cgu.gov.br/*` or similar Fala.BR domains
- content_scripts must include `lib/module_factory.js` before module script
- `run_at` should be `document_idle` for most modules
- No duplicate entries for same URL pattern + script combination

### Config.json Validation
- Must be valid JSON
- Module keys should match scriptId used in createNeuronModule()
- Boolean values for module enable/disable
- Settings objects should follow camelCase naming

### Code Validation (via Context7)
- Content scripts: Check for memory leaks in MutationObserver
- UI components: Verify Bootstrap 5 syntax and accessibility
- IndexedDB: Validate transaction patterns and error handling
- CSP compliance: No inline scripts, no eval()

---

## Template Variables Reference

When generating files from templates, replace these variables:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `{{MODULE_NAME}}` | `visualizar` | Lowercase module name |
| `{{MODULE_NAME_CAPITALIZED}}` | `Visualizar` | PascalCase module name |
| `{{CATEGORY}}` | `ouvidoria` | Module category (directory name) |
| `{{ANCHOR_ELEMENT_ID}}` | `#conteudoPrincipal` | CSS selector for UI injection point |
| `{{URL_PATTERN}}` | `https://falabr.cgu.gov.br/publico/Manifestacao/RegistrarManifestacao.aspx*` | URL match pattern |

---

## Success Criteria

The `/init` skill run is successful when:

1. ✅ All changes since last commit are detected and classified
2. ✅ Context7 validations are performed (within budget)
3. ✅ CHANGELOG.md is updated with human-readable entries
4. ✅ changelog.json is updated with structured data
5. ✅ Missing module files are generated (if user confirms)
6. ✅ manifest.json and config.json are updated (if needed)
7. ✅ state.json is updated with current commit SHA
8. ✅ User is presented with actionable next steps
9. ✅ No JSON syntax errors in modified files
10. ✅ All file operations are reversible (backups created)

---

## Start Here

Begin by executing STEP 1: Change Detection. Read the state.json file and run git diff to detect changes.

Good luck! 🚀
