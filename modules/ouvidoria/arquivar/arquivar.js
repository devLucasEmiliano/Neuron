// File: modules/ouvidoria/arquivar/arquivar.js

// Primeiro, certifica-te de que o script da fábrica é carregado antes deste no manifest.json

createNeuronModule({
    scriptId: 'arquivar',
    configKey: 'neuronUserConfig',

    /**
     * Função chamada quando a funcionalidade deve estar ativa.
     * @param {object} context - O contexto fornecido pela fábrica.
     * @param {object} context.config - A configuração carregada.
     * @param {function} context.log - Função de log personalizada.
     */
    onScriptAtivo: ({ config, log }) => {
        const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar';

        // IDs da página legada
        const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
        const INPUT_JUSTIFICATIVA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
        const NUMERO_MANIFESTACAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';

        // IDs da página nova
        const MOTIVO_SELECT_NOVO = 'idSelectMotivoArquivamento-select';
        const INPUT_JUSTIFICATIVA_NOVO = 'txtJustificativaArquivamento-textarea';

        // Se a UI já existe, não faz nada.
        if (document.getElementById(DROPDOWN_ID_NEURON)) return;

        // Detecta qual página está ativa (nova ou legada)
        const motivoAncoraLegado = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
        const motivoAncoranovo = document.getElementById(MOTIVO_SELECT_NOVO);

        let pontoDeInsercao = null;
        let justificativaInput = null;
        let metodoInsercao = 'afterend';

        if (motivoAncoranovo) {
            // Página nova: inserir abaixo do select de motivo
            justificativaInput = document.getElementById(INPUT_JUSTIFICATIVA_NOVO);
            pontoDeInsercao = motivoAncoranovo.closest('.br-select');
            metodoInsercao = 'afterend';
        } else if (motivoAncoraLegado) {
            // Página legada: comportamento original
            justificativaInput = document.getElementById(INPUT_JUSTIFICATIVA_ID);
            pontoDeInsercao = motivoAncoraLegado.parentElement;
            metodoInsercao = 'afterend';
        }

        if (!pontoDeInsercao || !justificativaInput) return;

        const isPaginaNova = !!motivoAncoranovo;
        const modelosArquivar = config.textModels?.Arquivar || { "Erro": "Modelos não carregados." };
        const numeroManifestacao = document.getElementById(NUMERO_MANIFESTACAO_ID)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        const container = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = 'Modelos de Texto (Fala.BR CGU - Neuron):';

        if (isPaginaNova) {
            // Estrutura br-select do Design System gov.br
            container.id = DROPDOWN_ID_NEURON;
            container.className = 'br-select neuron-arquivar-novo';
            label.className = 'text-bold';

            const brInput = document.createElement('div');
            brInput.className = 'br-input';

            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';

            const displayInput = document.createElement('input');
            displayInput.type = 'text';
            displayInput.placeholder = 'Selecione um modelo...';
            displayInput.readOnly = true;
            displayInput.style.cursor = 'pointer';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'br-button';
            toggleBtn.type = 'button';
            toggleBtn.setAttribute('aria-label', 'Exibir lista');
            toggleBtn.innerHTML = '<i class="fas fa-angle-down" aria-hidden="true"></i>';

            inputGroup.appendChild(displayInput);
            brInput.appendChild(inputGroup);
            brInput.appendChild(toggleBtn);

            // Lista de opções
            const brList = document.createElement('div');
            brList.className = 'br-list';
            brList.tabIndex = 0;

            Object.entries(modelosArquivar).forEach(([key, textoTemplate], index) => {
                const textoFinal = String(textoTemplate).replace(/\(NUP\)/g, `(${numeroManifestacao})`);
                const itemId = `neuronArquivar-list-item-${index}`;

                const brItem = document.createElement('div');
                brItem.className = 'br-item';
                brItem.tabIndex = -1;

                const brRadio = document.createElement('div');
                brRadio.className = 'br-radio';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'neuronModeloArquivar';
                radio.id = `${itemId}-input`;
                radio.value = textoFinal;

                const radioLabel = document.createElement('label');
                radioLabel.htmlFor = `${itemId}-input`;
                radioLabel.textContent = key;

                brRadio.appendChild(radio);
                brRadio.appendChild(radioLabel);
                brItem.appendChild(brRadio);
                brList.appendChild(brItem);

                // Ao selecionar um item
                radio.addEventListener('change', () => {
                    displayInput.value = key;
                    justificativaInput.value = textoFinal;
                    justificativaInput.dispatchEvent(new Event('input', { bubbles: true }));
                    container.removeAttribute('expanded');
                });
            });

            // Toggle abrir/fechar lista
            const toggleList = () => {
                if (container.hasAttribute('expanded')) {
                    container.removeAttribute('expanded');
                } else {
                    container.setAttribute('expanded', '');
                }
            };
            displayInput.addEventListener('click', toggleList);
            toggleBtn.addEventListener('click', toggleList);

            // Fechar ao clicar fora
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    container.removeAttribute('expanded');
                }
            });

            container.appendChild(label);
            container.appendChild(brInput);
            container.appendChild(brList);
        } else {
            // Página legada: select nativo
            container.className = 'form-group';
            label.className = 'neuronLabelArquivar';
            label.htmlFor = DROPDOWN_ID_NEURON;

            const dropdown = document.createElement('select');
            dropdown.id = DROPDOWN_ID_NEURON;
            dropdown.className = 'form-control';
            dropdown.innerHTML = '<option value="">Selecione um modelo...</option>';

            for (const [key, textoTemplate] of Object.entries(modelosArquivar)) {
                const option = document.createElement('option');
                const textoFinal = String(textoTemplate).replace(/\(NUP\)/g, `(${numeroManifestacao})`);
                option.value = textoFinal;
                option.textContent = key;
                dropdown.appendChild(option);
            }

            dropdown.addEventListener('change', (e) => {
                justificativaInput.value = e.target.value;
                justificativaInput.dispatchEvent(new Event('input', { bubbles: true }));
            });

            container.appendChild(label);
            container.appendChild(dropdown);
        }

        // Insere a UI no local correto da página
        pontoDeInsercao.insertAdjacentElement(metodoInsercao, container);
        log("UI de arquivamento criada.");
    },

    /**
     * Função chamada para remover a UI e limpar event listeners quando a funcionalidade é desativada.
     */
    onScriptInativo: () => {
        const elemento = document.getElementById('neuronDropdownArquivar');
        if (!elemento) return;
        // Na página nova o container É o elemento com o ID; na legada é o select dentro do container
        if (elemento.classList.contains('neuron-arquivar-novo')) {
            elemento.remove();
        } else {
            elemento.parentElement.remove();
        }
    }
});