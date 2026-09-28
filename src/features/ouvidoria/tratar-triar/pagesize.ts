import { NeuronDB } from '@/lib/neuron-db';
import { CONFIG_KEY, isScriptAtivo, createStorageListener } from '@/lib/neuron-utils';
import type { NeuronUserConfig } from '@/lib/types';

export function initPagesize(): void {
    const SCRIPT_ID = 'tratarTriar';
    const ID_CAMPO_TAMANHO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_txtTamanhoPagina';
    const ID_BOTAO_CONFIRMAR = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_btnAlterarTamanhoPagina';

    let observer: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    async function verificarEAtualizarTamanho() {
        if (!await isScriptAtivo(SCRIPT_ID)) return;

        const painelTriagem = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_upTriagem');
        if (painelTriagem && painelTriagem.querySelector('.alert.alert-info')) {
            return;
        }

        const config: NeuronUserConfig = await NeuronDB.getConfig(CONFIG_KEY) || {};
        const itensPorPaginaDesejado = String(config.generalSettings?.qtdItensTratarTriar || '50');

        // #..._pagTriagem_ctl03_txtTamanhoPagina é o <input> de tamanho da página
        const campoTamanho = document.getElementById(ID_CAMPO_TAMANHO) as HTMLInputElement | null;
        // #..._pagTriagem_ctl03_btnAlterarTamanhoPagina é o botão de confirmar
        const botaoConfirmar = document.getElementById(ID_BOTAO_CONFIRMAR);

        if (!campoTamanho || !botaoConfirmar || campoTamanho.value === itensPorPaginaDesejado) {
            return;
        }

        console.log(`%cFala.BR CGU - Neuron (${SCRIPT_ID}): Corrigindo paginação para ${itensPorPaginaDesejado}...`, "color: orange;");
        campoTamanho.value = itensPorPaginaDesejado;
        botaoConfirmar.click();
    }

    async function gerenciarEstado() {
        if (await isScriptAtivo(SCRIPT_ID)) {
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

    createStorageListener(SCRIPT_ID, gerenciarEstado);
    gerenciarEstado();
}
