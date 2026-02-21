# /init Skill - Development Workflow Orchestrator

**Version:** 1.0.0 | **Status:** Production Ready

## Overview

Automates the Neuron Chrome Extension development workflow:

- 🔍 **Change Detection** - Git-based detection of new/modified/deleted modules
- ✅ **Code Validation** - Context7 validation against Chrome Extension, Bootstrap 5, IndexedDB best practices
- 📝 **Changelog Generation** - Dual format (CHANGELOG.md + changelog.json)
- 🏗️ **Boilerplate Generation** - Template-based module file creation
- ⚙️ **Config Sync** - Auto-updates manifest.json and config.json

## Quick Start

```bash
/init
```

The skill guides you through 6 phases with interactive prompts.

## Workflow Phases

### 1. Change Detection
- Reads `.claude/data/init/state.json` for last commit SHA
- Runs `git diff --name-status` to find changes
- Classifies: new/modified/deleted modules, configs, libraries
- Prompts: **"Proceed with validation? (y/n)"**

### 2. Context7 Validation
- Budget: 9 queries per run (prioritizes: new > modified > config)
- Libraries: `/chrome/extensions`, `/twbs/bootstrap/v5`, `/jakearchibald/idb`
- Stores results: passed/warning/failed with suggestions
- Prompts: **"Apply suggestions? (y/n)"**

### 3. Changelog Generation
- Updates `CHANGELOG.md` (Keep a Changelog format)
- Updates `.claude/data/init/changelog.json` (structured)
- Categories: Added, Changed, Fixed, Removed

### 4. Boilerplate Generation
- Detects incomplete modules (missing .css/.html)
- Prompts for: URL pattern, anchor selector, generate HTML modal
- Replaces template variables, writes files

### 5. Configuration Sync
- Updates `manifest.json` (content_scripts entries)
- Updates `config/config.json` (modules.{name}: true)
- Creates .backup files before modifying
- Prompts: **"Apply changes? (y/n/e)"**

### 6. Final Summary
- Lists changes, validations, files modified
- Updates `state.json` with current commit
- Suggests next steps

## Template Variables

| Variable | Example | Usage |
|----------|---------|-------|
| `{{MODULE_NAME}}` | `visualizar` | Lowercase identifier |
| `{{MODULE_NAME_CAPITALIZED}}` | `Visualizar` | PascalCase for UI/IDs |
| `{{CATEGORY}}` | `ouvidoria` | Module category directory |
| `{{ANCHOR_ELEMENT_ID}}` | `#conteudoPrincipal` | CSS selector for injection |
| `{{URL_PATTERN}}` | `https://falabr.cgu.gov.br/*` | manifest.json URL match |

## Configuration

Located in `skill.json`:

- **trackedPaths**: `modules/**/*`, `lib/**/*`, `shared/**/*`, `config/**/*`, `manifest.json`
- **context7.maxQueriesPerRun**: 9
- **autoGenerate.confirmBeforeCreate**: true (always prompts)
- **autoSync.confirmBeforeUpdate**: true (always prompts)

## Common Workflows

### Adding a New Module

1. Create: `modules/ouvidoria/visualizar/` + basic `visualizar.js`
2. Run: `/init`
3. Provide: URL pattern, anchor selector, generate HTML modal (y/n)
4. Review generated files
5. Test in Chrome, commit

### Modifying Existing Code

1. Edit module files
2. Run: `/init`
3. Review Context7 suggestions
4. Apply if needed, commit with generated changelog

### Deleting a Module

1. Delete module directory
2. Run: `/init`
3. Confirm config cleanup
4. Commit

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No changes detected | Reset `state.json` to `"lastProcessedCommit": null` |
| Context7 quota exceeded | Make smaller changes, skill prioritizes critical files |
| JSON errors | Check `{file}.backup`, validate syntax |
| Template not found | Verify `.claude/data/init/templates/` exists |

## File Structure

```
.claude/
├── skills/init/
│   ├── skill.json          # Skill configuration
│   ├── README.md           # This file
│   ├── QUICK_START.md      # Brief reference
│   └── prompts/init.md     # Execution logic
└── data/init/
    ├── state.json          # Runtime state (gitignored)
    ├── changelog.json      # Structured changelog (gitignored)
    └── templates/content-script-module/
        ├── template.js     # Module using module_factory pattern
        ├── template.css    # Neuron-themed styles
        └── template.html   # Bootstrap modal
```

## Edge Cases Handled

- No changes → Updates state, exits gracefully
- Git unavailable → Offers manual mode
- Invalid module structure → Helpful warnings
- Context7 quota exceeded → Skips remaining, continues
- JSON parse errors → Creates backups, requires manual fix
- File conflicts → Prompts for overwrite/rename
- Deleted modules → Offers config cleanup

## Important Notes

- **Config Mismatch**: `module_factory.js` checks `featureSettings` but `config.json` uses `modules` - templates follow `config.json` pattern
- **URL Patterns**: Must match Fala.BR domains (`https://falabr.cgu.gov.br/*`)
- **Dependencies**: All content scripts must include `lib/module_factory.js` first
- **Backups**: Created before any JSON modification (`{file}.backup`)

## Best Practices

1. Run `/init` after significant changes
2. Review Context7 suggestions before committing
3. Test generated code in Chrome
4. Keep templates updated as patterns evolve
5. Commit changelog updates with code changes

## Future Enhancements

- Auto-commit with changelog as message
- Version bump integration
- Performance profiling
- Testing scaffold generation
- Background script templates

---

**For quick reference:** See `QUICK_START.md`
**For detailed workflow logic:** See `prompts/init.md`
