# sic/analisar

## Purpose
Improves the layout of the SIC (Sistema de Informacao ao Cidadao) analysis page on Fala.BR by repositioning the action button row to appear before the sections div, making the primary actions more immediately accessible to operators.

## Functionality
- Uses a `MutationObserver` on `document.body` (childList + subtree) to wait for the target elements to appear, since the page is rendered dynamically.
- Once both `.row.justify-content-center.my-3` (the button container) and `#sections` are present, moves the button container to the position immediately before `#sections` using `insertBefore`.
- Sets `buttonContainer.dataset.neuronMoved = 'true'` to prevent re-processing on subsequent mutations.
- Disconnects the observer immediately after the move to avoid unnecessary overhead.

## Key Files
- `sic-analisar-move-buttons.js` — Complete module; self-contained IIFE with no external dependencies beyond the DOM.

## Dependencies
- No Neuron core dependencies (NeuronDB, NeuronSync, NeuronSite, Module Factory).
- Does not read configuration; always runs if injected by the manifest.
- Injected via `manifest.json` content script matching the SIC analysis page URL pattern.
