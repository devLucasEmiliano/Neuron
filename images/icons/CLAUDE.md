# icons

## Purpose

Contains the extension's icon assets used in `manifest.json` for the browser toolbar and Chrome Web Store listing.

## Functionality

These PNG icons are referenced by `manifest.json` `icons` and `action.default_icon` fields. The "on" and "off" variants are swapped at runtime via `chrome.action.setIcon()` based on the `masterEnableNeuron` toggle.

## Key Files

- **neuron128.png** — Default 128px icon (used in manifest `icons`).
- **neuron64.png** — Default 64px icon.
- **neuronon128.png** — "Enabled" state icon (yellow/gold) shown when Neuron is active.
- **neuronoff128.png** — "Disabled" state icon (blue-grey) shown when Neuron is off.

## Dependencies

- Referenced by `manifest.json` and `background.js` (for dynamic icon switching).
