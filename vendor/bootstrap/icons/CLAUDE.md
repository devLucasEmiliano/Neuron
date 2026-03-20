# vendor/bootstrap/icons/

## Purpose
Contains the Bootstrap Icons v1.11.3 icon font distribution used throughout the Neuron extension UI for scalable, CSS-driven icons.

## Functionality
The icon font allows rendering over 1,900 icons purely through CSS classes (e.g., `<i class="bi bi-check-circle">`). The stylesheet references the woff/woff2 font files in the `fonts/` subdirectory via relative `@font-face` declarations.

## Key Files
- `bootstrap-icons.min.css` — Bootstrap Icons v1.11.3 minified stylesheet with all icon class definitions (Copyright 2019-2024 The Bootstrap Authors, MIT License).
- `fonts/bootstrap-icons.woff` — icon font in woff format (fallback).
- `fonts/bootstrap-icons.woff2` — icon font in woff2 format (preferred by modern browsers).

## Dependencies
- `bootstrap-icons.min.css` depends on the `fonts/` subdirectory being present at the same relative path. Do not move the CSS or font files independently.
- No dependency on `bootstrap.min.css` or `bootstrap.bundle.min.js`.
