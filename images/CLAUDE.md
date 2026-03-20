# images

## Purpose

Stores all static image assets for the Neuron Chrome Extension — the extension icons declared in `manifest.json` and promotional/documentation media.

## Functionality

- **Extension icons (`icons/`):** PNG icons consumed by Chrome for the browser toolbar, extension management page, and the action button. Three visual states are provided:
  - `neuron128.png` / `neuron64.png` — default icon (blue globe with yellow nodes and "neuron" wordmark).
  - `neuronon128.png` — active/enabled state variant (yellow/gold globe with yellow nodes, no wordmark); used when the extension is turned on.
  - `neuronoff128.png` — inactive/disabled state variant (blue-grey desaturated globe with white nodes, no wordmark); used when the extension is turned off via the popup toggle.
- **Promotional media:** `Intro-Neuron.gif` is an animated walkthrough used in documentation or the extension store listing to demonstrate the extension's features.

## Key Files

| File | Description |
|------|-------------|
| `icons/neuron128.png` | Default 128px icon (with wordmark) |
| `icons/neuron64.png` | Default 64px icon (with wordmark) |
| `icons/neuronon128.png` | 128px icon for enabled state |
| `icons/neuronoff128.png` | 128px icon for disabled state |
| `Intro-Neuron.gif` | Animated feature demo |

## Dependencies

- **`manifest.json`** references the icon files under the `icons` key and the `action.default_icon` key.
- **`popup/popup.js`** or **`background.js`** switches between `neuronon128.png` and `neuronoff128.png` via `chrome.action.setIcon()` based on the `masterEnableNeuron` state stored in `NeuronDB`.
- No build step — files are used as-is by Chrome.
