# loading

## Purpose
Replaces Fala.BR's default loading overlay (`skm_LockPane`) with a branded Neuron animation while the platform is processing requests. Supports both legacy ASP.NET pages and new-style pages (URL paths starting with `/web/`).

## Functionality
- **Overlay detection**: Polls for or observes the `skm_LockPane` / `skm_LockPaneText` elements that Fala.BR uses as its loading overlay.
- **Style injection**: Fetches `loading.html`, injects a GIF (`images/Intro-Neuron.gif`) and the current extension version (`{{GIF_URL}}` / `{{MANIFEST_VERSION}}` placeholders), then replaces the inner content of the lock pane.
- **Dot animation**: Runs a `requestAnimationFrame` loop that cycles through `.` → `..` → `...` → `....` at 350ms intervals inside `#neuronRotatingCharLoading`.
- **MutationObserver**: Watches the lock pane's `style` and `class` attributes to apply or revert the Neuron style whenever the overlay becomes visible or hidden.
- **New-style page support**: On `/web/` pages, programmatically creates the overlay div, applies the style immediately on `DOMContentLoaded`, then removes it on `load`.
- **Toggle awareness**: Reads `masterEnableNeuron` and `modules.loading` from `NeuronDB`; reacts to config changes via `NeuronSync.onConfigChange` to enable or disable without a page reload.
- **Safe teardown**: Reverts to the original inner HTML on deactivation and disconnects the observer.

## Key Files
- `loading.js` — Main script; handles init, MutationObserver, animation loop, and config reactivity.
- `loading.html` — HTML fragment injected into the lock pane; contains the GIF `<img>`, animated text, version number, and credit line.
- `loading.css` — Styles for the custom overlay (`.neuron-loading-active`, `.neuron-loading-container`, etc.).

## Dependencies
- `shared/js/neuron-site.js` — Used to resolve the site alias for `NeuronDB.init()`.
- `shared/js/neuron-db.js` — Reads `neuronUserConfig` to check master toggle and module toggle.
- `shared/js/neuron-sync.js` — Listens for config changes via `NeuronSync.onConfigChange`.
- `images/Intro-Neuron.gif` — Branding GIF injected into the loading template.
- Does **not** use Module Factory (`createNeuronModule`); manages its own lifecycle directly.
