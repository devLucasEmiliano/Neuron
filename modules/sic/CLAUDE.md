# sic

## Purpose
Parent directory for modules targeting the SIC (Sistema de Informacao ao Cidadao) section of Fala.BR. SIC modules handle requests made under the Access to Information Law (LAI) and are structurally separate from the ouvidoria modules.

## Functionality
Contains two sub-modules injected into different SIC pages:

- **analisar/** — Injected into the SIC analysis page. Repositions the action button container to improve the page layout.
- **tratar/** — Injected into the SIC treatment/listing page. Extracts and enriches each demand row with deadline calculations (original deadline, internal deadline, internal charge date) and adds a protocol copy-to-clipboard feature.

## Key Files
- `analisar/sic-analisar-move-buttons.js`
- `tratar/sic-tratar-extract.js`
- `tratar/sic-tratar-style.css`

## Dependencies
Each sub-module documents its own dependencies. See `analisar/CLAUDE.md` and `tratar/CLAUDE.md`.
