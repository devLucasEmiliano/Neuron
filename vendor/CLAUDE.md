# vendor/

## Purpose
Contains all third-party libraries used by the Neuron Chrome Extension. Libraries are committed directly to the repository — there is no package manager (npm, yarn, etc.).

## Functionality
Provides the complete runtime dependencies required by content scripts, the options page, the popup, and other extension pages. All files are pre-built, minified distributions ready for direct inclusion via `manifest.json` web-accessible resources or HTML `<script>`/`<link>` tags.

## Key Files
- `chart.min.js` — Chart.js v4.5.1, used for data visualizations (e.g., demand statistics charts).
- `bootstrap/` — Bootstrap v5.3.3 CSS framework and bundled JS (includes Popper.js).
- `bootstrap/icons/` — Bootstrap Icons v1.11.3 icon font.
- `fonts/inter/` — Inter typeface (Regular, Medium, Bold) in woff2 format, used as the extension's UI font.

## Dependencies
No external dependencies. All libraries are self-contained and vendored. Nothing in this directory depends on other Neuron source files.
