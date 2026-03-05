# PRD: Theme Enable/Disable Toggle

## Introduction

Add an on/off toggle for the Neuron custom theme system, allowing users to completely disable the custom CSS styling injected into Fala.br pages, the popup, and the options page. When disabled, pages revert to their native/default appearance. The existing theme mode selector (light/dark/system) becomes inactive (grayed out) when the theme is off, and fully functional when the theme is on. The preference persists across sessions and syncs between popup and options in real time.

## Goals

- Allow users to completely disable the Neuron custom theme on injected pages, popup, and options
- Provide a clear on/off toggle separate from the theme mode selector (light/dark/system)
- Visually indicate when the theme is disabled by graying out the mode selector
- Persist the enable/disable preference in NeuronDB
- Sync the preference across popup, options, and content scripts via NeuronSync
- Smooth visual transition when toggling the theme on/off

## User Stories

### US-001: Store theme enabled preference
**Description:** As a developer, I need to persist the theme enabled/disabled state so it survives extension restarts.

**Acceptance Criteria:**
- [ ] Add a `neuronThemeEnabled` key to the NeuronDB `preferences` store (default: `true`)
- [ ] ThemeManager exposes `getEnabled()` and `setEnabled(boolean)` methods
- [ ] `setEnabled()` persists to NeuronDB and dispatches a sync event via NeuronSync
- [ ] `init()` reads the enabled state and applies it on startup
- [ ] Typecheck/lint passes

### US-002: Theme toggle switch in popup
**Description:** As a user, I want an on/off switch in the popup so I can quickly enable or disable the Neuron theme.

**Acceptance Criteria:**
- [ ] Add a labeled toggle switch (e.g., "Tema Neuron") above or beside the existing theme mode cycle button in popup.html
- [ ] Toggle switch reflects current enabled state on popup open
- [ ] Clicking the toggle calls `ThemeManager.setEnabled()` and updates the UI immediately
- [ ] When theme is OFF: the theme mode cycle button is visually grayed out / disabled (non-clickable)
- [ ] When theme is ON: the theme mode cycle button works normally (light/dark/system cycle)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Theme toggle switch in options page
**Description:** As a user, I want an on/off switch in the options page so I can enable or disable the Neuron theme from the settings dashboard.

**Acceptance Criteria:**
- [ ] Add a labeled toggle switch (e.g., "Habilitar tema personalizado") in the General settings section of options.html
- [ ] Toggle switch reflects current enabled state on page load
- [ ] Clicking the toggle calls `ThemeManager.setEnabled()` and updates the UI immediately
- [ ] When theme is OFF: the theme mode selector (if present in options) is grayed out / disabled
- [ ] When theme is ON: the theme mode selector works normally
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Sync theme enabled state between popup and options
**Description:** As a user, I want the theme toggle state to stay in sync when I have both the popup and options page open.

**Acceptance Criteria:**
- [ ] When theme is toggled in popup, the options page updates its toggle switch and theme mode selector state in real time (and vice versa)
- [ ] Uses existing NeuronSync broadcast mechanism (BroadcastChannel or similar)
- [ ] ThemeManager listens for sync events and calls the appropriate apply logic
- [ ] Typecheck/lint passes

### US-005: Disable theme CSS on content pages (Fala.br)
**Description:** As a user, I want the custom Neuron styling to be removed from Fala.br pages when the theme is disabled, so the site looks like its original default.

**Acceptance Criteria:**
- [ ] When theme is disabled, content scripts stop applying custom theme styling to the page
- [ ] When theme is re-enabled, content scripts re-apply the custom theme styling
- [ ] The mechanism must work for CSS declared in manifest.json `content_scripts` (consider adding a body class like `neuron-theme-active` that gates all custom styles, or dynamically injecting/removing CSS via `chrome.scripting`)
- [ ] Transition between enabled/disabled states is smooth (no harsh flash)
- [ ] Typecheck/lint passes

### US-006: Disable theme on popup and options pages
**Description:** As a user, when theme is disabled, the popup and options pages should also revert to default Bootstrap styling (no custom Neuron colors).

**Acceptance Criteria:**
- [ ] When theme is OFF, the popup and options pages use default Bootstrap appearance (no Neuron custom properties applied)
- [ ] When theme is ON, the Neuron theme variables and custom styles are active
- [ ] The theme mode cycle button / selector remains visible but grayed out and non-interactive when OFF
- [ ] Smooth CSS transition when toggling (no jarring flash)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Add `neuronThemeEnabled` preference to NeuronDB (boolean, default `true`)
- FR-2: ThemeManager must expose `getEnabled()`, `setEnabled(enabled)`, and check enabled state in `init()`
- FR-3: When `setEnabled(false)` is called, remove the `data-bs-theme` attribute (or set to browser default) and deactivate all Neuron custom CSS variables
- FR-4: When `setEnabled(true)` is called, re-apply the saved theme preference (light/dark/system) and reactivate Neuron custom CSS
- FR-5: The popup must show a toggle switch for theme on/off, separate from the existing cycle button
- FR-6: The options page must show a toggle switch for theme on/off in the General settings section
- FR-7: When theme is OFF, the theme mode cycle button (popup) and any theme mode selector (options) must appear disabled / grayed out and not respond to clicks
- FR-8: `setEnabled()` must broadcast the change via NeuronSync so other open contexts (popup, options, content scripts) update immediately
- FR-9: Content scripts must check the enabled state and conditionally apply or remove custom styling
- FR-10: All Neuron custom CSS injected into content pages should be gated so it can be toggled off (e.g., scope under `.neuron-theme-active` class on `<body>`, or use `chrome.scripting.insertCSS` / `removeCSS` dynamically)

## Non-Goals

- No per-page or per-module theme enable/disable (this is a global toggle)
- No changes to the theme color schemes themselves (light/dark/system modes stay as-is)
- No changes to non-theme CSS (functional module styles like layout, positioning remain active even when theme is off)
- No new theme presets or color customization options

## Design Considerations

- The toggle switch should use Bootstrap's `form-check form-switch` component for consistency
- Label text in Portuguese: "Tema Neuron" (popup, compact) or "Habilitar tema personalizado" (options, descriptive)
- When grayed out, the theme mode button should have `opacity: 0.5` and `pointer-events: none` (or equivalent)
- Smooth transition: use the existing `--neuron-transition-duration: 0.3s` for enable/disable transitions
- Consider adding a brief tooltip on the disabled cycle button: "Ative o tema para alterar o modo"

## Technical Considerations

- **Content script CSS gating:** Manifest-declared CSS (`content_scripts.css`) is injected automatically and cannot be removed at runtime. Two approaches:
  1. **Preferred:** Scope all Neuron theme CSS rules under a `.neuron-theme-active` class on `<body>`. Content scripts add/remove this class based on the enabled preference. This approach requires refactoring theme.css selectors for content pages.
  2. **Alternative:** Move content page theme injection from manifest to dynamic injection via `chrome.scripting.insertCSS()` / `chrome.scripting.removeCSS()` in a background script, triggered by preference changes.
- **Popup/Options CSS gating:** These pages load theme.css via `<link>` tags. Toggling can be done by enabling/disabling the stylesheet (`document.querySelector('link[href*="theme.css"]').disabled = true`) or by adding/removing a gating class.
- **NeuronSync event:** Add a new event type (e.g., `'themeEnabledChange'`) or extend the existing `'neuron-theme-change'` event payload to include the enabled state.
- **Startup performance:** The enabled state should be checked synchronously (or as early as possible) to avoid a flash of styled/unstyled content. Consider storing the flag in `chrome.storage.local` for synchronous-like access in content scripts, in addition to NeuronDB.

## Success Metrics

- User can toggle theme on/off in under 1 click from either popup or options
- Theme disable takes effect on content pages within 300ms (transition duration)
- Theme state syncs between popup and options in real time (< 500ms)
- No flash of incorrect styling on page load (enabled state applied before first paint)
- Zero regressions in existing theme mode cycling (light/dark/system)

## Open Questions

- Should functional module CSS (e.g., notificacoes.css, tratar-novo.css) also be disabled when the theme is off, or only the theme colors/variables? (Current assumption: only theme styling, not functional layout CSS)
- Should the toggle state be included in the JSON export/import feature in options?
- Should there be a keyboard shortcut for toggling theme on/off?
