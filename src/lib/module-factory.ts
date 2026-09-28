// File: src/lib/module-factory.ts

import { NeuronDB } from '@/lib/neuron-db';
import { NeuronSync } from '@/lib/neuron-sync';
import type { NeuronModuleOptions, NeuronUserConfig } from '@/lib/types';

/**
 * Cria e gere o ciclo de vida de um módulo de conteúdo do Neuron.
 * @param {object} options - As opções de configuração para o módulo.
 * @param {string} options.scriptId - O ID da funcionalidade (ex: 'arquivar').
 * @param {string} options.configKey - A chave para aceder às configurações no storage (ex: 'neuronUserConfig').
 * @param {function} options.onScriptAtivo - Função a ser executada quando o script deve estar ativo.
 * @param {function} options.onScriptInativo - Função a ser executada para limpar/desativar a funcionalidade.
 * @param {function} [options.onConfigChange] - (Opcional) Função para lidar com mudanças de configuração.
 */

export function createNeuronModule(options: NeuronModuleOptions): void {
    const { scriptId, configKey, onScriptAtivo, onScriptInativo, onConfigChange } = options;
    let config: NeuronUserConfig = {};
    let observer: MutationObserver | null = null;

    const log = (message: string, color = "blue") => console.log(`%c[Neuron|${scriptId}] ${message}`, `color: ${color}; font-weight: bold;`);

    async function carregarConfiguracoes() {
        try {
            config = await NeuronDB.getConfig(configKey) || {};
        } catch (error) {
            console.error(`[Neuron|${scriptId}] Erro ao carregar configurações:`, error);
        }
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron !== false && config.modules?.[scriptId] !== false;
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();
        if (isScriptAtivo()) {
            log("Ativando funcionalidade.");
            onScriptAtivo({ config, log });
        } else {
            log("Desativando funcionalidade.", "red");
            onScriptInativo();
        }
    }

    function observarMudancas() {
        if (observer) return;
        observer = new MutationObserver(() => { void verificarEstadoAtualEAgir(); });
        observer.observe(document.body, { childList: true, subtree: true });
        log("Observer da página configurado.");
    }
    
    function pararDeObservar() {
        if (observer) {
            observer.disconnect();
            observer = null;
            log("Observer da página DESCONECTADO.");
        }
    }

    NeuronSync.onConfigChange((key, newValue) => {
        if (key === configKey) {
            log("Configuração alterada. Reavaliando...", "orange");
            if (onConfigChange) {
                onConfigChange();
            }
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        await verificarEstadoAtualEAgir();
        observarMudancas(); // Inicia o observer para monitorar a página
    }

    init().catch((error: unknown) => console.error(`[Neuron|${scriptId}] Erro na inicialização:`, error));
}
