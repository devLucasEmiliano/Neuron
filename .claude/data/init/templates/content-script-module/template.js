// File: modules/{{CATEGORY}}/{{MODULE_NAME}}/{{MODULE_NAME}}.js

createNeuronModule({
    scriptId: '{{MODULE_NAME}}',
    configKey: 'neuronUserConfig',

    onScriptAtivo: ({ config, log }) => {
        const UI_CONTAINER_ID = 'neuron{{MODULE_NAME_CAPITALIZED}}Container';

        // Prevent duplicate UI
        if (document.getElementById(UI_CONTAINER_ID)) return;

        // Find anchor element on the page
        const anchorElement = document.querySelector('{{ANCHOR_ELEMENT_ID}}');
        if (!anchorElement) {
            log('Anchor element not found', 'red');
            return;
        }

        // Create UI container
        const container = document.createElement('div');
        container.id = UI_CONTAINER_ID;
        container.className = 'neuron-{{MODULE_NAME}}-container';

        // TODO: Build your UI here
        container.innerHTML = `
            <div class="neuronLabel{{MODULE_NAME_CAPITALIZED}}">
                {{MODULE_NAME_CAPITALIZED}} Module
            </div>
        `;

        // Insert into DOM
        anchorElement.insertAdjacentElement('afterend', container);
        log('UI initialized successfully');
    },

    onScriptInativo: () => {
        const elemento = document.getElementById('neuron{{MODULE_NAME_CAPITALIZED}}Container');
        if (elemento) elemento.remove();
    }
});
