# /init Quick Reference

## Run the Skill

```bash
/init
```

## What Happens (6 Phases)

1. **Change Detection** → Git diff analysis
2. **Validation** → Context7 queries (max 9)
3. **Changelog** → Updates CHANGELOG.md + changelog.json
4. **Boilerplate** → Generates missing module files
5. **Config Sync** → Updates manifest.json + config.json
6. **Summary** → Report + next steps

## Interactive Prompts

```
Proceed with validation? (y/n)
Generate missing files? (y/n)
  URL pattern: https://falabr.cgu.gov.br/path/*
  Anchor selector: #elementId
  Generate HTML modal? (y/n)
Apply config changes? (y/n/e)
Apply code suggestions? (y/n)
```

## Common Tasks

**New module:**
```bash
mkdir -p modules/category/feature
# Create feature.js
/init
# Answer prompts
```

**Update code:**
```bash
# Edit files
/init
# Review suggestions
```

**Delete module:**
```bash
rm -rf modules/category/feature
/init
# Confirm cleanup
```

## Quick Fixes

| Problem | Fix |
|---------|-----|
| No changes | Set `state.json` → `"lastProcessedCommit": null` |
| Quota exceeded | Smaller changes, skill auto-prioritizes |
| JSON error | Check `{file}.backup` |

## Template Variables

- `{{MODULE_NAME}}` → `feature`
- `{{MODULE_NAME_CAPITALIZED}}` → `Feature`
- `{{CATEGORY}}` → `ouvidoria`
- `{{ANCHOR_ELEMENT_ID}}` → `#mainContent`
- `{{URL_PATTERN}}` → `https://falabr.cgu.gov.br/*`

## Files Modified

- `CHANGELOG.md`
- `manifest.json` (+ .backup)
- `config/config.json` (+ .backup)
- `.claude/data/init/state.json`
- `.claude/data/init/changelog.json`
- `modules/{category}/{feature}/` (generated)

---

**Full docs:** See `README.md`
