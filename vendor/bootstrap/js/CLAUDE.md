# vendor/bootstrap/js/

## Purpose
Contains the minified Bootstrap v5.3.3 JavaScript bundle used to power interactive UI components in the Neuron extension.

## Functionality
The bundle includes both Bootstrap's component JavaScript (modals, dropdowns, tooltips, collapses, toasts, popovers, tabs, etc.) and Popper.js (for positioning floating elements). Loaded via `<script>` tags in the extension's HTML pages.

## Key Files
- `bootstrap.bundle.min.js` — Bootstrap v5.3.3 + Popper.js bundled and minified (Copyright 2011-2024 The Bootstrap Authors, MIT License).

## Dependencies
No external file dependencies. Popper.js is included inside the bundle itself. Must be loaded after `bootstrap.min.css` for correct styling of JS-driven components.
