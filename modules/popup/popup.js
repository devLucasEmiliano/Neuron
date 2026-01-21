document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    // Initialize theme first to prevent flash
    await ThemeManager.init();

    const CONFIG_KEY = 'neuronUserConfig';
    const masterSwitch = document.getElementById('masterEnableNeuron');
    const itemsInput = document.getElementById('qtdItensTratarTriar');
    const itemsCard = document.getElementById('items-per-page-card');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const canvas = document.getElementById('falling-leaves-canvas');
    const ctx = canvas.getContext('2d');

    // Notification settings elements
    const notificationSettingsSection = document.getElementById('notification-settings');
    const deadlineThresholdInput = document.getElementById('deadlineThreshold');
    const dangerCountThresholdInput = document.getElementById('dangerCountThreshold');
    const filterDefaultInput = document.getElementById('filterDefault');
    const catPrazosCurtosInput = document.getElementById('catPrazosCurtos');
    const catPossiveisRespondidasInput = document.getElementById('catPossiveisRespondidas');
    const catComObservacaoInput = document.getElementById('catComObservacao');
    const catProrrogadasInput = document.getElementById('catProrrogadas');
    const catComplementadasInput = document.getElementById('catComplementadas');

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

    let userConfig = {};
    let debounceTimer;
    let notificacoesDebounceTimer;
    let leaves = [];
    let animationFrameId = null;
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

    // ========== Configuration Management ==========

    async function carregarConfiguracoes() {
        if (!chrome?.storage?.local) return {};
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            return result?.[CONFIG_KEY] || {};
        } catch (error) {
            console.error("Neuron (Popup): Erro ao carregar configuracoes.", error);
            return {};
        }
    }

    async function salvarConfiguracoes() {
        if (!chrome?.storage?.local) return;
        try {
            await chrome.storage.local.set({ [CONFIG_KEY]: userConfig });
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
            const deadlineVal = parseInt(deadlineThresholdInput?.value, 10);
            userConfig.notificacoesSettings.deadlineThreshold = isNaN(deadlineVal) || deadlineVal < 1 ? 2 : deadlineVal;

            const dangerVal = parseInt(dangerCountThresholdInput?.value, 10);
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
        userConfig = await carregarConfiguracoes();
        masterSwitch.checked = userConfig.masterEnableNeuron !== false;
        itemsInput.value = userConfig.generalSettings?.qtdItensTratarTriar || 50;

        // Load notification settings
        const notifSettings = userConfig.notificacoesSettings || DEFAULT_NOTIFICACOES_SETTINGS;
        if (deadlineThresholdInput) {
            deadlineThresholdInput.value = notifSettings.deadlineThreshold ?? DEFAULT_NOTIFICACOES_SETTINGS.deadlineThreshold;
        }
        if (dangerCountThresholdInput) {
            dangerCountThresholdInput.value = notifSettings.dangerCountThreshold ?? DEFAULT_NOTIFICACOES_SETTINGS.dangerCountThreshold;
        }
        if (filterDefaultInput) {
            filterDefaultInput.checked = notifSettings.filterDefault ?? DEFAULT_NOTIFICACOES_SETTINGS.filterDefault;
        }

        // Load category visibility
        const catVis = notifSettings.categoryVisibility || DEFAULT_NOTIFICACOES_SETTINGS.categoryVisibility;
        if (catPrazosCurtosInput) catPrazosCurtosInput.checked = catVis.prazosCurtos ?? true;
        if (catPossiveisRespondidasInput) catPossiveisRespondidasInput.checked = catVis.possiveisRespondidas ?? true;
        if (catComObservacaoInput) catComObservacaoInput.checked = catVis.comObservacao ?? true;
        if (catProrrogadasInput) catProrrogadasInput.checked = catVis.prorrogadas ?? true;
        if (catComplementadasInput) catComplementadasInput.checked = catVis.complementadas ?? true;

        atualizarUI();

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

    function desenharFolha(leaf) {
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

    // ========== Initialize ==========

    await inicializarControlos();
    inicializarAnimacao();
});
