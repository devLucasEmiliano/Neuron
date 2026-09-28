// File: modules/ouvidoria/prorrogar/prorrogar.js

import type { NeuronModuleOptions } from '@/lib/types';

export const prorrogarModule: NeuronModuleOptions = {
    scriptId: 'prorrogar',
    configKey: 'neuronUserConfig',

    onScriptAtivo: ({ config, log }) => {
        const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
        const MOTIVO_DROPDOWN_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
        const JUSTIFICATIVA_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';

        if (document.getElementById(DROPDOWN_ID_NEURON)) return;

        const motivoAncora = document.getElementById(MOTIVO_DROPDOWN_ID);
        if (!motivoAncora) return;

        const container = document.createElement('div');
        container.className = 'form-group neuron-prorrogar-container';

        const label = document.createElement('label');
        label.htmlFor = DROPDOWN_ID_NEURON;
        label.textContent = 'Modelos de Justificativa (Fala.BR CGU - Neuron):';

        const dropdown = document.createElement('select');
        dropdown.id = DROPDOWN_ID_NEURON;
        dropdown.className = 'form-control';

        container.appendChild(label);
        container.appendChild(dropdown);

        dropdown.innerHTML = '<option value="">Selecione um modelo...</option>';
        const modelos: Record<string, string> = config.textModels?.Prorrogar || { "Erro": "Modelos não carregados." };

        for (const key in modelos) {
            const option = document.createElement('option');
            option.value = modelos[key];
            option.textContent = key;
            dropdown.appendChild(option);
        }

        dropdown.addEventListener('change', () => {
            // txtJustificativaProrrogacao é o <textarea> de justificativa
            const justificativaInput = document.getElementById(JUSTIFICATIVA_TEXTAREA_ID) as HTMLTextAreaElement | null;
            if (justificativaInput) {
                justificativaInput.value = dropdown.value;
            }
        });

        // Como no legado, se o select não estiver dentro de um .form-group o acesso lança TypeError
        motivoAncora.closest('.form-group')!.insertAdjacentElement('afterend', container);
        log("UI de prorrogação criada.");
    },

    onScriptInativo: () => {
        document.querySelector('.neuron-prorrogar-container')?.remove();
    }
};
