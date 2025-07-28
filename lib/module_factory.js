// File: lib/module_factory.js

/**
 * Cria e gere o ciclo de vida de um módulo de conteúdo do Neuron.
 * @param {object} options - As opções de configuração para o módulo.
 * @param {string} options.scriptId - O ID da funcionalidade (ex: 'arquivar').
 * @param {string} options.configKey - A chave para aceder às configurações no storage (ex: 'neuronUserConfig').
 * @param {function} options.onScriptAtivo - Função a ser executada quando o script deve estar ativo.
 * @param {function} options.onScriptInativo - Função a ser executada para limpar/desativar a funcionalidade.
 * @param {function} [options.onConfigChange] - (Opcional) Função para lidar com mudanças de configuração.
 */

function createNeuronModule(options) {
    const { scriptId, configKey, onScriptAtivo, onScriptInativo, onConfigChange } = options;
    let config = {};
    let observer = null;

    // Create standardized logger for this module
    const logger = window.NeuronLogger.createLogger(scriptId);

    async function carregarConfiguracoes() {
        try {
            const result = await chrome.storage.local.get(configKey);
            config = result[configKey] || {};
        } catch (error) {
            logger.error('Erro ao carregar configurações', error);
        }
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron && config.featureSettings?.[scriptId]?.enabled;
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();
        if (isScriptAtivo()) {
            logger.success("Ativando funcionalidade");
            onScriptAtivo({ config, logger });
        } else {
            logger.warning("Desativando funcionalidade");
            onScriptInativo();
        }
    }

    function observarMudancas() {
        if (observer) return;
        observer = new MutationObserver(verificarEstadoAtualEAgir);
        observer.observe(document.body, { childList: true, subtree: true });
        logger.debug("Observer da página configurado");
    }
    
    function pararDeObservar() {
        if (observer) {
            observer.disconnect();
            observer = null;
            logger.debug("Observer da página DESCONECTADO");
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[configKey]) {
            logger.config("Configuração alterada. Reavaliando...");
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

    init().catch(error => logger.error('Erro na inicialização', error));
}