(async function () {
    'use strict';

    const SCRIPT_ID = 'loading';
    const CONFIG_KEY = 'neuronUserConfig';

    const LOCK_PANE_ID = 'skm_LockPane';
    const LOCK_PANE_TEXT_ID = 'skm_LockPaneText';
    const NEURON_LOADING_CSS_CLASS = 'neuron-loading-active';

    function getTemplateURL() {
        try {
            return chrome.runtime.getURL('modules/loading/loading.html');
        } catch (e) {
            return null;
        }
    }

    function isContextValid() {
        try {
            return !!chrome.runtime && !!chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    let config = {};
    let paneObserver = null;
    let manifestVersion = 'v?.?.?';
    let activeAnimationFrameId = null;
    let isNeuronStyleApplied = false;
    let originalPaneTextInnerHTML = null;

    async function carregarConfiguracoes() {
        config = await NeuronDB.getConfig(CONFIG_KEY) || {};
        console.log(`[Neuron|${SCRIPT_ID}] Configurações carregadas.`);
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron !== false && config.modules?.[SCRIPT_ID] !== false;
    }

    function carregarVersaoManifest() {
        if (!isContextValid()) return;
        try {
            const manifest = chrome.runtime.getManifest();
            if (manifest && manifest.version) {
                manifestVersion = "v" + manifest.version;
            }
        } catch (e) {
            // Silently keep default version if context is invalidated
        }
    }

    function pararAnimacao() {
        if (activeAnimationFrameId) {
            cancelAnimationFrame(activeAnimationFrameId);
            activeAnimationFrameId = null;
        }
    }

    function iniciarAnimacao() {
        pararAnimacao();
        const rotatingChar = document.getElementById("neuronRotatingCharLoading");
        if (!rotatingChar) return;

        const frames = [".", "..", "...", "...."];
        let frameIndex = 0;
        let lastTime = 0;
        const intervalo = 350;

        function animar(timestamp) {
            if (!isNeuronStyleApplied) {
                pararAnimacao();
                return;
            }
            if (timestamp - lastTime >= intervalo) {
                rotatingChar.textContent = frames[frameIndex];
                frameIndex = (frameIndex + 1) % frames.length;
                lastTime = timestamp;
            }
            activeAnimationFrameId = requestAnimationFrame(animar);
        }
        activeAnimationFrameId = requestAnimationFrame(animar);
    }

    async function aplicarEstiloNeuron() {
        if (!isContextValid()) return;

        const lockPane = document.getElementById(LOCK_PANE_ID);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);

        if (!lockPane || !lockPaneText || isNeuronStyleApplied) {
            return;
        }

        if (originalPaneTextInnerHTML === null && !lockPaneText.querySelector('.neuron-loading-container')) {
            originalPaneTextInnerHTML = lockPaneText.innerHTML;
        }

        try {
            const templateUrl = getTemplateURL();
            if (!templateUrl) return;

            const response = await fetch(templateUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            let htmlContent = await response.text();
            htmlContent = htmlContent.replace('{{GIF_URL}}', chrome.runtime.getURL('images/Intro-Neuron.gif'));
            htmlContent = htmlContent.replace('{{MANIFEST_VERSION}}', manifestVersion);

            lockPaneText.innerHTML = htmlContent;
            lockPane.classList.add(NEURON_LOADING_CSS_CLASS);
            isNeuronStyleApplied = true;
            iniciarAnimacao();
        } catch (error) {
            if (error?.message?.includes('Extension context invalidated')) return;
            console.error(`[Neuron|${SCRIPT_ID}] Falha ao aplicar estilo de loading.`, error);
            reverterEstiloNeuron();
        }
    }

    function reverterEstiloNeuron() {
        pararAnimacao();
        const lockPane = document.getElementById(LOCK_PANE_ID);
        if (!lockPane || !isNeuronStyleApplied) return;

        lockPane.classList.remove(NEURON_LOADING_CSS_CLASS);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);
        if (lockPaneText) {
            lockPaneText.innerHTML = originalPaneTextInnerHTML || '';
            originalPaneTextInnerHTML = null;
        }
        isNeuronStyleApplied = false;
    }
    
    function observarMudancasNoPainel() {
        let lockPane = document.getElementById(LOCK_PANE_ID);
        if (!lockPane || paneObserver) return;

        paneObserver = new MutationObserver(async () => {
            lockPane = document.getElementById(LOCK_PANE_ID);
            if (!lockPane) {
                reverterEstiloNeuron();
                return;
            }
            const isVisible = lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff');
            if (isVisible) {
                await aplicarEstiloNeuron();
            } else {
                reverterEstiloNeuron();
            }
        });
        
        paneObserver.observe(lockPane, { attributes: ['style', 'class'], childList: true, subtree: false });

        if (lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff')) {
            aplicarEstiloNeuron();
        }
    }

    function desconectarObserver() {
        if (paneObserver) {
            paneObserver.disconnect();
            paneObserver = null;
        }
        reverterEstiloNeuron();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();

        if (isScriptAtivo()) {
            observarMudancasNoPainel();
        } else {
            desconectarObserver();
        }
    }
    
    NeuronSync.onConfigChange((key) => {
        if (key === CONFIG_KEY) {
            if (!isContextValid()) return;
            console.warn(`[Neuron|${SCRIPT_ID}] Configuração alterada. Reavaliando...`);
            verificarEstadoAtualEAgir();
        }
    });

    function isNewStylePage() {
        return window.location.pathname.startsWith('/web/');
    }

    function createNewStyleOverlay() {
        const lockPane = document.createElement('div');
        lockPane.id = LOCK_PANE_ID;

        const lockPaneText = document.createElement('div');
        lockPaneText.id = LOCK_PANE_TEXT_ID;

        lockPane.appendChild(lockPaneText);
        document.body.appendChild(lockPane);
    }

    function removeNewStyleOverlay() {
        reverterEstiloNeuron();
        const lockPane = document.getElementById(LOCK_PANE_ID);
        if (lockPane) {
            lockPane.remove();
        }
    }

    async function init() {
        // Initialize NeuronDB with site context from current URL
        await NeuronDB.init(NeuronSite.getFromUrl(window.location.href));

        carregarVersaoManifest();

        if (isNewStylePage()) {
            if (document.readyState === 'loading') {
                await new Promise(resolve =>
                    document.addEventListener('DOMContentLoaded', resolve, { once: true })
                );
            }

            await carregarConfiguracoes();
            if (!isScriptAtivo()) return;

            createNewStyleOverlay();
            await aplicarEstiloNeuron();

            if (document.readyState === 'complete') {
                removeNewStyleOverlay();
            } else {
                window.addEventListener('load', () => removeNewStyleOverlay(), { once: true });
            }
            return;
        }

        // Legacy ASP.NET page: poll for skm_LockPane element
        const MAX_ATTEMPTS = 100;
        let attempts = 0;

        await new Promise((resolve, reject) => {
            const checkElement = () => {
                if (document.getElementById(LOCK_PANE_ID)) {
                    resolve();
                } else if (attempts >= MAX_ATTEMPTS) {
                    console.warn(`[Neuron|${SCRIPT_ID}] Elemento ${LOCK_PANE_ID} não encontrado após ${MAX_ATTEMPTS} tentativas.`);
                    resolve();
                } else {
                    attempts++;
                    setTimeout(checkElement, 100);
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkElement, { once: true });
            } else {
                checkElement();
            }
        });

        verificarEstadoAtualEAgir();
    }

    init();
})();