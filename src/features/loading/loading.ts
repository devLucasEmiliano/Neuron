import { browser } from 'wxt/browser';
import { NeuronDB } from '@/lib/neuron-db';
import { NeuronSync } from '@/lib/neuron-sync';
import { NeuronSite } from '@/lib/neuron-site';
import { isContextInvalidatedError } from '@/lib/neuron-utils';
import type { NeuronUserConfig } from '@/lib/types';
import template from './loading.html?raw';

export function initLoading(): void {
    'use strict';

    const SCRIPT_ID = 'loading';
    const CONFIG_KEY = 'neuronUserConfig';

    const LOCK_PANE_ID = 'skm_LockPane';
    const LOCK_PANE_TEXT_ID = 'skm_LockPaneText';
    const NEURON_LOADING_CSS_CLASS = 'neuron-loading-active';

    function isContextValid(): boolean {
        try {
            return !!browser.runtime && !!browser.runtime.id;
        } catch (e) {
            return false;
        }
    }

    let config: NeuronUserConfig = {};
    let paneObserver: MutationObserver | null = null;
    let manifestVersion = 'v?.?.?';
    let activeAnimationFrameId: number | null = null;
    let isNeuronStyleApplied = false;
    let originalPaneTextInnerHTML: string | null = null;

    async function carregarConfiguracoes(): Promise<void> {
        config = await NeuronDB.getConfig(CONFIG_KEY) || {};
        console.log(`[Fala.BR CGU - Neuron|${SCRIPT_ID}] Configurações carregadas.`);
    }

    function isScriptAtivo(): boolean {
        return config.masterEnableNeuron !== false && config.modules?.[SCRIPT_ID] !== false;
    }

    function carregarVersaoManifest(): void {
        if (!isContextValid()) return;
        try {
            const manifest = browser.runtime.getManifest();
            if (manifest && manifest.version) {
                manifestVersion = "v" + manifest.version;
            }
        } catch (e) {
            // Silently keep default version if context is invalidated
        }
    }

    function pararAnimacao(): void {
        if (activeAnimationFrameId) {
            cancelAnimationFrame(activeAnimationFrameId);
            activeAnimationFrameId = null;
        }
    }

    function iniciarAnimacao(): void {
        pararAnimacao();
        const rotatingChar = document.getElementById("neuronRotatingCharLoading");
        if (!rotatingChar) return;

        const frames = [".", "..", "...", "...."];
        let frameIndex = 0;
        let lastTime = 0;
        const intervalo = 350;

        // Arrow (e não "function animar" como no legado): a declaração içada perde o narrowing de rotatingChar (TS18047)
        const animar = (timestamp: number): void => {
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
        };
        activeAnimationFrameId = requestAnimationFrame(animar);
    }

    async function aplicarEstiloNeuron(): Promise<void> {
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
            let htmlContent = template;
            htmlContent = htmlContent.replace('{{GIF_URL}}', browser.runtime.getURL('/images/Intro-Neuron.gif'));
            htmlContent = htmlContent.replace('{{MANIFEST_VERSION}}', manifestVersion);

            lockPaneText.innerHTML = htmlContent;
            lockPane.classList.add(NEURON_LOADING_CSS_CLASS);
            isNeuronStyleApplied = true;
            iniciarAnimacao();
        } catch (error) {
            if (isContextInvalidatedError(error)) return;
            console.error(`[Fala.BR CGU - Neuron|${SCRIPT_ID}] Falha ao aplicar estilo de loading.`, error);
            reverterEstiloNeuron();
        }
    }

    function reverterEstiloNeuron(): void {
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

    function observarMudancasNoPainel(): void {
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

        paneObserver.observe(lockPane, { attributes: true, childList: true, subtree: false });

        if (lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff')) {
            aplicarEstiloNeuron();
        }
    }

    function desconectarObserver(): void {
        if (paneObserver) {
            paneObserver.disconnect();
            paneObserver = null;
        }
        reverterEstiloNeuron();
    }

    async function verificarEstadoAtualEAgir(): Promise<void> {
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
            console.debug(`[Fala.BR CGU - Neuron|${SCRIPT_ID}] Configuração alterada. Reavaliando...`);
            verificarEstadoAtualEAgir();
        }
    });

    function isNewStylePage(): boolean {
        return window.location.pathname.startsWith('/web/');
    }

    function createNewStyleOverlay(): void {
        const lockPane = document.createElement('div');
        lockPane.id = LOCK_PANE_ID;

        const lockPaneText = document.createElement('div');
        lockPaneText.id = LOCK_PANE_TEXT_ID;

        lockPane.appendChild(lockPaneText);
        document.body.appendChild(lockPane);
    }

    function removeNewStyleOverlay(): void {
        reverterEstiloNeuron();
        const lockPane = document.getElementById(LOCK_PANE_ID);
        if (lockPane) {
            lockPane.remove();
        }
    }

    async function init(): Promise<void> {
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
        const MAX_ATTEMPTS = 30;
        let attempts = 0;

        await new Promise<void>((resolve, reject) => {
            const checkElement = () => {
                if (document.getElementById(LOCK_PANE_ID)) {
                    resolve();
                } else if (attempts >= MAX_ATTEMPTS) {
                    console.debug(`[Fala.BR CGU - Neuron|${SCRIPT_ID}] Elemento ${LOCK_PANE_ID} não encontrado após ${MAX_ATTEMPTS} tentativas.`);
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
}
