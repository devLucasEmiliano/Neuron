# vendor/bootstrap/icons/fonts/

## Purpose
Contains the binary font files for Bootstrap Icons v1.11.3, referenced by `../bootstrap-icons.min.css` via `@font-face`.

## Functionality
Provides the icon glyph data in two web font formats:
- **woff2** — compressed format, preferred by all modern browsers; served first.
- **woff** — wider-compatibility fallback format for older browsers.

The fonts encode all Bootstrap Icons glyphs as a symbol font, enabling icon rendering through CSS `content` values mapped to Unicode code points.

## Key Files
- `bootstrap-icons.woff2` — Bootstrap Icons v1.11.3 font, woff2 format.
- `bootstrap-icons.woff` — Bootstrap Icons v1.11.3 font, woff format.

## Dependencies
- Must remain co-located with `../bootstrap-icons.min.css`. The stylesheet's `@font-face` declarations use relative paths (`fonts/bootstrap-icons.woff2`, `fonts/bootstrap-icons.woff`).
- No dependency on other Neuron source files.
