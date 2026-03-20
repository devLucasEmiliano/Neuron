# vendor/fonts/inter/

## Purpose
Contains the Inter typeface woff2 files used as the primary UI font for all Neuron extension pages and injected UI panels.

## Functionality
Provides three weights of the Inter typeface, covering the full range of typographic use in the extension:
- **Regular (400)** — body text, labels, general UI copy.
- **Medium (500)** — secondary emphasis, sub-headings, table headers.
- **Bold (700)** — primary headings, strong emphasis.

All files are in woff2 format, which is supported by all Chromium-based browsers (the only target environment for this extension).

## Key Files
- `Inter-Regular.woff2` — Inter weight 400.
- `Inter-Medium.woff2` — Inter weight 500.
- `Inter-Bold.woff2` — Inter weight 700.

## Dependencies
No external dependencies. Files are standalone binary font assets. Must be declared accessible in `manifest.json` under `web_accessible_resources` if referenced from injected content script stylesheets.
