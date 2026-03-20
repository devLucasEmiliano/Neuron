# vendor/bootstrap/

## Purpose
Houses the Bootstrap v5.3.3 distribution files used to style and add interactive behavior to the Neuron extension's UI pages (options page, popup, injected panels).

## Functionality
Provides two sub-packages:
- **css/** — the complete Bootstrap stylesheet (grid, components, utilities).
- **js/** — the Bootstrap JavaScript bundle, which includes Popper.js for dropdowns, tooltips, and modals.
- **icons/** — the Bootstrap Icons v1.11.3 icon font for scalable vector icons.

## Key Files
- `css/bootstrap.min.css` — main stylesheet (Bootstrap v5.3.3).
- `js/bootstrap.bundle.min.js` — Bootstrap JS + Popper.js bundle (Bootstrap v5.3.3).
- `icons/bootstrap-icons.min.css` — icon font stylesheet (Bootstrap Icons v1.11.3).
- `icons/fonts/` — woff/woff2 font files referenced by the icons stylesheet.

## Dependencies
- `icons/bootstrap-icons.min.css` resolves font paths relative to `icons/fonts/`. The CSS and font files must remain in their current relative positions.
- No dependency on other Neuron source files.
