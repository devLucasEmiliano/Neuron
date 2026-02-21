(function() {
    'use strict';

    const SCRIPT_ID = 'tratarTriar';
    const ID_CAMPO_TAMANHO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_txtTamanhoPagina';
    const ID_BOTAO_CONFIRMAR = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_btnAlterarTamanhoPagina';

    let observer = null;
    let debounceTimer;

    async function verificarEAtualizarTamanho() {
        if (!await window.NeuronUtils.isScriptAtivo(SCRIPT_ID)) return;

        const result = await chrome.storage.local.get(window.NeuronUtils.CONFIG_KEY);
        const config = result[window.NeuronUtils.CONFIG_KEY] || {};
        const itensPorPaginaDesejado = String(config.generalSettings?.qtdItensTratarTriar || '50');

        const campoTamanho = document.getElementById(ID_CAMPO_TAMANHO);
        const botaoConfirmar = document.getElementById(ID_BOTAO_CONFIRMAR);

        if (!campoTamanho || !botaoConfirmar || campoTamanho.value === itensPorPaginaDesejado) {
            return;
        }

        console.log(`%cNeuron (${SCRIPT_ID}): Corrigindo paginação para ${itensPorPaginaDesejado}...`, "color: orange;");
        campoTamanho.value = itensPorPaginaDesejado;
        botaoConfirmar.click();
    }

    async function gerenciarEstado() {
        if (await window.NeuronUtils.isScriptAtivo(SCRIPT_ID)) {
            if (observer) return;

            const onPageChange = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(verificarEAtualizarTamanho, 300);
            };

            observer = new MutationObserver(onPageChange);
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                onPageChange();
            }
        } else {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
    }

    window.NeuronUtils.createStorageListener(SCRIPT_ID, gerenciarEstado);
    gerenciarEstado();
})();
