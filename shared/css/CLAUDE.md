# shared/css/

## Purpose
Global stylesheet layer for the Neuron extension. Provides the design token system, dark/light theme switching, Bootstrap overrides, and Selectize dropdown corrections. These files are injected alongside content scripts and included in the popup and options page HTML.

## Functionality

### Design System and Theme (`theme.css`)
Defines all visual design tokens as CSS custom properties and applies them across both light and dark modes using Bootstrap 5's `data-bs-theme` attribute mechanism.

**Font loading:** Embeds the Inter typeface (Regular 400, Medium 500, Bold 700) from `vendor/fonts/inter/` via `@font-face`.

**Global tokens (`:root`):** Transition duration, font stack, primary brand colour, border radii (card, pill, icon, input), card/input shadow values.

**Light theme (`:root, [data-bs-theme="light"]`):**
- Brand: `--neuron-primary` `#1476FF`, `--neuron-accent` `#4A3AFF`
- Status: success, warning, danger, info with matching light background variants
- Surface: three background levels from white to `#E9EAF3`
- Text: primary `#0B0E2C`, secondary, muted
- Borders and shadows tuned for a clean, low-contrast light UI
- Overrides Bootstrap variables (`--bs-primary`, `--bs-success`, etc.) so all Bootstrap components automatically adopt Neuron brand colours

**Dark theme (`[data-bs-theme="dark"]`):**
- Shifts brand and status colours to higher-luminance variants for WCAG contrast on dark backgrounds
- Surface palette uses a navy scale (`#0B0E2C` to `#1E2145`)
- All Bootstrap variable overrides mirrored from the light theme

**Smooth transitions:** `[data-bs-theme]` selector applies `0.3s ease` transitions on `background-color`, `color`, `border-color`, and `box-shadow` for fluid theme switches.

**Component overrides:** Customises Bootstrap buttons (`.btn-neuron-primary`, `.btn-neuron-accent`, `.btn-outline-neuron-primary`), form controls, nav tabs, cards, accordions, alerts, and badges to use Neuron tokens.

**Utility classes:** `.text-neuron-primary/accent`, `.bg-neuron-primary/accent`, `.border-neuron-primary/accent`, `.neuron-header-gradient`, `.btn-theme-toggle`.

**Scrollbar styling:** Custom thin scrollbar for WebKit browsers, with dark-mode variant.

### Selectize Dropdown Overrides (`selectize-fix.css`)
Complements `selectize-fix.js` with the visual side of the adaptive dropdown positioning fix.

- Caps dropdown height at 250 px with `overflow-y: auto` and a thin custom scrollbar.
- Applies Neuron theme tokens (`--neuron-bg-primary`, `--neuron-border-color`, `--neuron-shadow`) with CSS variable fallbacks to legacy variables (`--cor-card`, `--cor-borda`) for backward compatibility.
- Styles dropdown options with hover/active state using secondary background.
- Defines `.selectize-dropdown--dropup` — the class toggled by `selectize-fix.js` — to flip the dropdown above the input (`bottom: 100%`, `top: auto`, adjusted border-radius).

## Dependencies
- Bootstrap 5 (`vendor/bootstrap/`) — `theme.css` overrides Bootstrap CSS custom properties and extends Bootstrap component classes. Both files must be loaded after Bootstrap.
- `vendor/fonts/inter/` — `theme.css` references woff2 font files at a relative path two levels up (`../../vendor/fonts/inter/`).
- `shared/js/theme-manager.js` — sets `data-bs-theme` on `<html>` at runtime; `theme.css` responds to that attribute. The two files are designed as a pair.
- Selectize.js — `selectize-fix.css` targets Selectize's own class names (`.selectize-dropdown`, `.selectize-control`, `.selectize-dropdown-content`).
