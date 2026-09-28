import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@/styles/theme.css';
import './popup.css';
import 'bootstrap'; // data-bs-* API (collapse)
import { browser } from 'wxt/browser';
import { NeuronSite } from '@/lib/neuron-site';
import { NeuronDB } from '@/lib/neuron-db';
import { NeuronSync } from '@/lib/neuron-sync';
import { ThemeManager, applySystemThemeEarly, installThemeSyncListener } from '@/lib/theme-manager';
import { isSiteAlias } from '@/lib/types';
import type { NeuronUserConfig, SiteAlias } from '@/lib/types';
applySystemThemeEarly();       // was theme-manager.js load-time IIFE — FIRST statement
installThemeSyncListener();    // was theme-manager.js top-level subscription

/** Elemento obrigatório da própria página (existe em index.html); lança se ausente. */
function byId<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Neuron (Popup): elemento #${id} não encontrado.`);
    return el as T;
}

/** Contexto 2d obrigatório do canvas; lança se indisponível. */
function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Neuron (Popup): contexto 2d do canvas indisponível.');
    return ctx;
}

interface Leaf {
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    // Initialize theme first to prevent flash
    await ThemeManager.init();

    const CONFIG_KEY = 'neuronUserConfig';
    const masterSwitch = byId<HTMLInputElement>('masterEnableNeuron');
    const itemsInput = byId<HTMLInputElement>('qtdItensTratarTriar');
    const itemsCard = byId<HTMLElement>('items-per-page-card');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const canvas = byId<HTMLCanvasElement>('falling-leaves-canvas');
    const ctx = get2dContext(canvas);

    // Notification settings elements
    const notificationSettingsSection = document.getElementById('notification-settings');
    // #deadlineThreshold / #dangerCountThreshold: <input type="number">
    const deadlineThresholdInput = document.getElementById('deadlineThreshold') as HTMLInputElement | null;
    const dangerCountThresholdInput = document.getElementById('dangerCountThreshold') as HTMLInputElement | null;
    // #filterDefault: não existe em index.html (código morto mantido); usado como checkbox
    const filterDefaultInput = document.getElementById('filterDefault') as HTMLInputElement | null;
    // #cat*: <input type="checkbox">
    const catPrazosCurtosInput = document.getElementById('catPrazosCurtos') as HTMLInputElement | null;
    const catPossiveisRespondidasInput = document.getElementById('catPossiveisRespondidas') as HTMLInputElement | null;
    const catComObservacaoInput = document.getElementById('catComObservacao') as HTMLInputElement | null;
    const catProrrogadasInput = document.getElementById('catProrrogadas') as HTMLInputElement | null;
    const catComplementadasInput = document.getElementById('catComplementadas') as HTMLInputElement | null;

    // Default notification settings
    const DEFAULT_NOTIFICACOES_SETTINGS = {
        deadlineThreshold: 2,
        dangerCountThreshold: 5,
        filterDefault: true,
        categoryVisibility: {
            prazosCurtos: true,
            possiveisRespondidas: true,
            comObservacao: true,
            prorrogadas: true,
            complementadas: true
        }
    };

    let userConfig: NeuronUserConfig = {};
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let notificacoesDebounceTimer: ReturnType<typeof setTimeout> | undefined;
    let leaves: Leaf[] = [];
    let animationFrameId: number | null = null;
    const numberOfLeaves = 50;
    const LEAF_COLOR = '#ffd401';

    // ========== Theme Management ==========

    async function updateThemeIcon() {
        const preference = await ThemeManager.getPreference();
        if (themeIcon) {
            themeIcon.className = `bi ${ThemeManager.getIconClass(preference)}`;
        }
        if (themeToggle) {
            themeToggle.title = ThemeManager.getLabel(preference);
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', async () => {
            await ThemeManager.cycle();
            await updateThemeIcon();
        });
    }

    // Listen for theme changes from other pages
    document.addEventListener('neuron-theme-change', updateThemeIcon);

    // Initialize theme icon
    await updateThemeIcon();

    // ========== Site Selector ==========

    const siteBtns = document.querySelectorAll<HTMLElement>('.site-btn[data-site]');

    async function detectAndSetSite() {
        let siteAlias: SiteAlias = 'producao';
        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                const detected = NeuronSite.getFromUrl(tab.url);
                if (detected) siteAlias = detected;
            }
        } catch (e) {
            // Default to producao
        }
        await selectSite(siteAlias, false);
    }

    async function selectSite(alias: SiteAlias, reload = true) {
        siteBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.site === alias);
        });
        if (reload) {
            await NeuronDB.switchSite(alias);
            userConfig = await carregarConfiguracoes();
            atualizarUIFromConfig();
        } else {
            await NeuronDB.init(alias);
        }
    }

    siteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const site = btn.dataset.site;
            if (isSiteAlias(site)) selectSite(site);
        });
    });

    // ========== Configuration Management ==========

    async function carregarConfiguracoes(): Promise<NeuronUserConfig> {
        try {
            return (await NeuronDB.getConfig(CONFIG_KEY)) || {};
        } catch (error) {
            console.error("Neuron (Popup): Erro ao carregar configuracoes.", error);
            return {};
        }
    }

    async function salvarConfiguracoes() {
        try {
            await NeuronDB.setConfig(CONFIG_KEY, userConfig);
        } catch (error) {
            console.error("Neuron (Popup): Erro ao salvar configuracoes.", error);
        }
    }

    function atualizarUI() {
        const isEnabled = masterSwitch.checked;
        if (isEnabled) {
            itemsCard.classList.remove('disabled');
            notificationSettingsSection?.classList.remove('disabled');
        } else {
            itemsCard.classList.add('disabled');
            notificationSettingsSection?.classList.add('disabled');
        }
        itemsInput.disabled = !isEnabled;
    }

    function atualizarUIFromConfig() {
        masterSwitch.checked = userConfig.masterEnableNeuron !== false;
        itemsInput.value = String(userConfig.generalSettings?.qtdItensTratarTriar || 50);

        const notifSettings = userConfig.notificacoesSettings || DEFAULT_NOTIFICACOES_SETTINGS;
        if (deadlineThresholdInput) deadlineThresholdInput.value = String(notifSettings.deadlineThreshold ?? DEFAULT_NOTIFICACOES_SETTINGS.deadlineThreshold);
        if (dangerCountThresholdInput) dangerCountThresholdInput.value = String(notifSettings.dangerCountThreshold ?? DEFAULT_NOTIFICACOES_SETTINGS.dangerCountThreshold);
        if (filterDefaultInput) filterDefaultInput.checked = notifSettings.filterDefault ?? DEFAULT_NOTIFICACOES_SETTINGS.filterDefault;

        const catVis = notifSettings.categoryVisibility || DEFAULT_NOTIFICACOES_SETTINGS.categoryVisibility;
        if (catPrazosCurtosInput) catPrazosCurtosInput.checked = catVis.prazosCurtos ?? true;
        if (catPossiveisRespondidasInput) catPossiveisRespondidasInput.checked = catVis.possiveisRespondidas ?? true;
        if (catComObservacaoInput) catComObservacaoInput.checked = catVis.comObservacao ?? true;
        if (catProrrogadasInput) catProrrogadasInput.checked = catVis.prorrogadas ?? true;
        if (catComplementadasInput) catComplementadasInput.checked = catVis.complementadas ?? true;

        atualizarUI();
    }

    async function handleMasterSwitchChange() {
        userConfig.masterEnableNeuron = masterSwitch.checked;
        atualizarUI();
        await salvarConfiguracoes();
    }

    function handleItemsInputChange() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (!userConfig.generalSettings) {
                userConfig.generalSettings = {};
            }
            const parsedValue = parseInt(itemsInput.value, 10);
            userConfig.generalSettings.qtdItensTratarTriar = isNaN(parsedValue) || parsedValue < 1 ? 50 : parsedValue;
            await salvarConfiguracoes();
        }, 500);
    }

    function handleNotificacoesSettingChange() {
        clearTimeout(notificacoesDebounceTimer);
        notificacoesDebounceTimer = setTimeout(async () => {
            if (!userConfig.notificacoesSettings) {
                userConfig.notificacoesSettings = { ...DEFAULT_NOTIFICACOES_SETTINGS };
            }

            // Update threshold values
            const deadlineVal = parseInt(deadlineThresholdInput?.value ?? '', 10);
            userConfig.notificacoesSettings.deadlineThreshold = isNaN(deadlineVal) || deadlineVal < 1 ? 2 : deadlineVal;

            const dangerVal = parseInt(dangerCountThresholdInput?.value ?? '', 10);
            userConfig.notificacoesSettings.dangerCountThreshold = isNaN(dangerVal) || dangerVal < 1 ? 5 : dangerVal;

            // Update filter default
            userConfig.notificacoesSettings.filterDefault = filterDefaultInput?.checked ?? true;

            // Update category visibility
            if (!userConfig.notificacoesSettings.categoryVisibility) {
                userConfig.notificacoesSettings.categoryVisibility = { ...DEFAULT_NOTIFICACOES_SETTINGS.categoryVisibility };
            }
            userConfig.notificacoesSettings.categoryVisibility.prazosCurtos = catPrazosCurtosInput?.checked ?? true;
            userConfig.notificacoesSettings.categoryVisibility.possiveisRespondidas = catPossiveisRespondidasInput?.checked ?? true;
            userConfig.notificacoesSettings.categoryVisibility.comObservacao = catComObservacaoInput?.checked ?? true;
            userConfig.notificacoesSettings.categoryVisibility.prorrogadas = catProrrogadasInput?.checked ?? true;
            userConfig.notificacoesSettings.categoryVisibility.complementadas = catComplementadasInput?.checked ?? true;

            await salvarConfiguracoes();
        }, 300);
    }

    async function inicializarControlos() {
        // Detect site from active tab and initialize NeuronDB
        await detectAndSetSite();
        userConfig = await carregarConfiguracoes();
        atualizarUIFromConfig();

        // Master switch and items input listeners
        masterSwitch.addEventListener('change', handleMasterSwitchChange);
        itemsInput.addEventListener('input', handleItemsInputChange);

        // Notification settings listeners
        deadlineThresholdInput?.addEventListener('input', handleNotificacoesSettingChange);
        dangerCountThresholdInput?.addEventListener('input', handleNotificacoesSettingChange);
        filterDefaultInput?.addEventListener('change', handleNotificacoesSettingChange);
        catPrazosCurtosInput?.addEventListener('change', handleNotificacoesSettingChange);
        catPossiveisRespondidasInput?.addEventListener('change', handleNotificacoesSettingChange);
        catComObservacaoInput?.addEventListener('change', handleNotificacoesSettingChange);
        catProrrogadasInput?.addEventListener('change', handleNotificacoesSettingChange);
        catComplementadasInput?.addEventListener('change', handleNotificacoesSettingChange);

        // Listen for config changes from other contexts via chrome.storage.onChanged
        if (typeof NeuronSync !== 'undefined') {
            NeuronSync.onConfigChange(async (key, newValue) => {
                if (key === CONFIG_KEY) {
                    // valor do bucket neuron_config para a chave 'neuronUserConfig' (ver ConfigBucket em types.ts)
                    userConfig = (newValue || {}) as NeuronUserConfig;
                    atualizarUIFromConfig();
                }
            });
        }
    }

    // ========== Canvas Animation ==========

    function redimensionarCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function criarFolhas() {
        leaves = [];
        for (let i = 0; i < numberOfLeaves; i++) {
            leaves.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 10 + 8,
                speedY: Math.random() * 1.2 + 0.6,
                speedX: (Math.random() - 0.5) * 0.5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.7 + 0.3
            });
        }
    }

    function desenharFolha(leaf: Leaf) {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation * Math.PI / 180);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        const size = leaf.size;
        ctx.quadraticCurveTo(size * 0.5, -size * 0.4, size, 0);
        ctx.quadraticCurveTo(size * 0.5, size * 0.4, 0, 0);

        ctx.fillStyle = `${LEAF_COLOR}${Math.floor(leaf.opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
        ctx.restore();
    }

    function animarCena() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        leaves.forEach(leaf => {
            leaf.y += leaf.speedY;
            leaf.x += leaf.speedX;
            leaf.rotation += leaf.rotationSpeed;
            desenharFolha(leaf);

            if (leaf.y > canvas.height + 20) {
                leaf.y = -20;
                leaf.x = Math.random() * canvas.width;
            }
            if (leaf.x > canvas.width + 20) {
                leaf.x = -20;
            } else if (leaf.x < -20) {
                leaf.x = canvas.width + 20;
            }
        });

        animationFrameId = requestAnimationFrame(animarCena);
    }

    function inicializarAnimacao() {
        redimensionarCanvas();
        criarFolhas();
        animationFrameId = requestAnimationFrame(animarCena);
    }

    function pararAnimacao() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    window.addEventListener('unload', pararAnimacao);

    // ========== Version Display ==========

    const versionLabel = document.getElementById('versionLabel');
    if (versionLabel) {
        const manifest = browser.runtime.getManifest();
        versionLabel.textContent = 'v' + (manifest.version_name || manifest.version);
    }

    // ========== Dashboard Button ==========

    const openDashboardBtn = document.getElementById('openDashboard');
    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', () => {
            browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
        });
    }

    // ========== Initialize ==========

    await inicializarControlos();
    inicializarAnimacao();
});
