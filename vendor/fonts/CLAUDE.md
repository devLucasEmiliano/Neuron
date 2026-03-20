# vendor/fonts/

## Purpose
Contains custom web fonts used by the Neuron extension's UI to establish a consistent visual identity independent of the host page's typography.

## Functionality
Provides the Inter typeface in the weights needed by the extension's design system. Fonts are loaded via `@font-face` declarations in module or global stylesheets, ensuring the extension's panels and pages render with Inter regardless of what fonts Fala.BR loads.

## Key Files
- `inter/` — Inter typeface directory containing Regular, Medium, and Bold weights in woff2 format.

## Dependencies
No external dependencies. Font files are self-contained binary assets. Consuming stylesheets must reference the correct relative or extension-URL paths.
