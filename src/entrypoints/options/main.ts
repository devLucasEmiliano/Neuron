import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@/styles/theme.css';
import './options.css';
import 'bootstrap';
import { NeuronDB } from '@/lib/neuron-db';
import { NeuronSync } from '@/lib/neuron-sync';
import { ThemeManager, applySystemThemeEarly, installThemeSyncListener } from '@/lib/theme-manager';
import { escapeHtml, errorMessage } from '@/lib/neuron-utils';
import { NEURON_TEXT_PLACEHOLDERS } from '@/lib/text-placeholders';
import { isNeuronUserConfigLike, isTextModelCategory } from '@/lib/types';
import defaultConfigJson from '@/config/config.json';
import type {
    FocalPoints,
    ModuleToggles,
    NeuronUserConfig,
    PrazoAjusteFds,
    PrazoAjusteFeriado,
    PrazoModoCalculo,
    PrazosSettings,
} from '@/lib/types';

/** Valor de um modelo de texto: string simples ou objeto com sub-textos (ex.: Encaminhar). */
type TextModelValue = string | Record<string, string>;
/** `config.textModels` indexado pela categoria vinda do <select> (string): visão alargada de Partial<TextModels>. */
type TextModelsByCategory = Record<string, Record<string, TextModelValue>>;

applySystemThemeEarly();
installThemeSyncListener();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme first
    await ThemeManager.init();

    const CONFIG_STORAGE_KEY = 'neuronUserConfig';

    // Theme toggle setup
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
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

    document.addEventListener('neuron-theme-change', updateThemeIcon);

    await updateThemeIcon();

    // Elementos estáticos de index.html. O código legado os acessa sem verificação de null
    // (TypeError se ausentes): as asserções `as HTML…Element` / `!` reproduzem esse contrato.
    const ui = {
        masterEnable: document.getElementById('masterEnableOptions') as HTMLInputElement,          // <input type="checkbox">
        enableNotificacoes: document.getElementById('enableNotificacoes') as HTMLInputElement,     // <input type="checkbox">
        enablePrazos: document.getElementById('enablePrazos') as HTMLInputElement,                 // <input type="checkbox">
        enableRespostas: document.getElementById('enableRespostas') as HTMLInputElement,           // <input type="checkbox">
        enableModelos: document.getElementById('enableModelos') as HTMLInputElement,               // <input type="checkbox">
        enablePontosFocais: document.getElementById('enablePontosFocais') as HTMLInputElement,     // <input type="checkbox">
        saveAllButton: document.getElementById('saveAllOptionsButton') as HTMLButtonElement,       // <button>
        globalStatus: document.getElementById('globalStatus'),
        sidebar: document.getElementById('optionsSidebar'),
        sidebarLinks: document.querySelectorAll<HTMLAnchorElement>('.sidebar-nav-link'),
        sections: document.querySelectorAll<HTMLElement>('.options-section'),
        rawConfigEditor: document.getElementById('rawConfigJsonEditor') as HTMLTextAreaElement,    // <textarea>
        saveRawConfig: document.getElementById('saveRawConfigJsonButton') as HTMLButtonElement,    // <button>
        resetRawConfig: document.getElementById('resetRawConfigJsonButton') as HTMLButtonElement,  // <button>
        rawConfigStatus: document.getElementById('rawConfigJsonStatus'),
        exportConfig: document.getElementById('exportConfigButton') as HTMLButtonElement,          // <button>
        importFileInput: document.getElementById('importConfigFileInput') as HTMLInputElement,     // <input type="file">
        importConfig: document.getElementById('importConfigButton') as HTMLButtonElement,          // <button>
        importStatus: document.getElementById('importConfigStatus'),
    };

    let fullConfig: NeuronUserConfig = {};
    let defaultConfig: NeuronUserConfig = {};

    // `fullConfig.<seção>!` abaixo: o legado acessa estas seções sem verificação (TypeError se ausentes).

    /**
     * `config.textModels` de uma configuração, indexado por categoria (string vinda do <select>).
     * Função (e não const): fullConfig é substituído por import / JSON bruto / sync.
     */
    const textModelsOf = (cfg: NeuronUserConfig): TextModelsByCategory =>
        (cfg.textModels ?? {}) as TextModelsByCategory;

    const displayStatus = (el: HTMLElement | null, msg: string, isError = false, duration = 4000) => {
        if (!el) return;
        el.innerHTML = `
            <div class="alert alert-${isError ? 'danger' : 'success'} alert-dismissible fade show py-2 mb-0" role="alert">
                <i class="bi bi-${isError ? 'exclamation-triangle' : 'check-circle'} me-2"></i>${escapeHtml(msg)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>
        `;
        setTimeout(() => {
            const alert = el.querySelector('.alert');
            if (alert) {
                alert.classList.remove('show');
                setTimeout(() => el.innerHTML = '', 150);
            }
        }, duration);
    };

    const isObject = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item);

    // `sources: unknown[]`: como no legado, fontes que não são objetos são ignoradas por isObject().
    const deepMerge = (target: Record<string, unknown>, ...sources: unknown[]): Record<string, unknown> => {
        if (!sources.length) return target;
        const source = sources.shift();
        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                const sourceValue = source[key];
                if (Array.isArray(sourceValue)) {
                    target[key] = sourceValue;
                } else if (isObject(sourceValue)) {
                    if (!isObject(target[key])) Object.assign(target, { [key]: {} });
                    // garantido objeto pela linha anterior
                    deepMerge(target[key] as Record<string, unknown>, sourceValue);
                } else {
                    Object.assign(target, { [key]: sourceValue });
                }
            }
        }
        return deepMerge(target, ...sources);
    };

    function ensureResponseArrays() {
        if (!fullConfig.defaultResponses) return;
        for (const key in fullConfig.defaultResponses) {
            if (!Array.isArray(fullConfig.defaultResponses[key].novoDropdownOptions)) {
                const defaultArr = defaultConfig.defaultResponses?.[key]?.novoDropdownOptions;
                fullConfig.defaultResponses[key].novoDropdownOptions = defaultArr
                    ? JSON.parse(JSON.stringify(defaultArr))
                    : [];
            }
        }
    }

    async function loadConfig() {
        try {
            // config.json é importado em build time (antes: fetch(chrome.runtime.getURL('/config/config.json')));
            // structuredClone garante um objeto novo a cada carga, como o fetch garantia.
            defaultConfig = structuredClone(defaultConfigJson) as NeuronUserConfig;
            const savedConfig = await NeuronDB.getConfig(CONFIG_STORAGE_KEY);
            fullConfig = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), savedConfig || {}) as NeuronUserConfig;
            ensureResponseArrays();
        } catch (error) {
            displayStatus(ui.globalStatus, `ERRO CRÍTICO: Falha ao carregar configuração. ${errorMessage(error)}`, true, 15000);
        }
    }

    async function saveConfig() {
        try {
            await NeuronDB.setConfig(CONFIG_STORAGE_KEY, fullConfig);
            displayStatus(ui.globalStatus, "Configurações salvas com sucesso!", false);
        } catch (error) {
            displayStatus(ui.globalStatus, `Erro ao salvar: ${errorMessage(error)}`, true);
        }
    }

    function populateAllTabs() {
        ui.masterEnable.checked = fullConfig.masterEnableNeuron !== false;

        // Module toggles
        const modules: ModuleToggles = fullConfig.modules || {};
        ui.enableNotificacoes.checked = modules.notificacoes !== false;
        ui.enablePrazos.checked = modules.prazos !== false;
        ui.enableRespostas.checked = modules.respostas !== false;
        ui.enableModelos.checked = modules.modelos !== false;
        ui.enablePontosFocais.checked = modules.pontosFocais !== false;

        const qtdElement = document.getElementById('qtdItensTratarTriar') as HTMLInputElement | null; // <input type="number" id="qtdItensTratarTriar">
        if (qtdElement) qtdElement.value = String(fullConfig.generalSettings?.qtdItensTratarTriar || 50);

        const limiteArquivarEl = document.getElementById('limiteCaracteresArquivar') as HTMLInputElement | null; // <input type="number" id="limiteCaracteresArquivar">
        if (limiteArquivarEl) limiteArquivarEl.value = String(fullConfig.generalSettings?.limiteCaracteresArquivar || 300);

        const prazosSettings: Partial<PrazosSettings> = fullConfig.prazosSettings || {};
        const prazoDiasEl = document.getElementById('tratarNovoPrazoInternoDias') as HTMLInputElement | null; // <input type="number" id="tratarNovoPrazoInternoDias">
        if (prazoDiasEl) prazoDiasEl.value = String(prazosSettings.tratarNovoPrazoInternoDias || -5);

        const cobrancaDiasEl = document.getElementById('tratarNovoCobrancaInternaDias') as HTMLInputElement | null; // <input type="number" id="tratarNovoCobrancaInternaDias">
        if (cobrancaDiasEl) cobrancaDiasEl.value = String(prazosSettings.tratarNovoCobrancaInternaDias || -3);

        const modoCalculoEl = document.getElementById('tratarNovoModoCalculo') as HTMLSelectElement | null; // <select id="tratarNovoModoCalculo">
        if (modoCalculoEl) modoCalculoEl.value = prazosSettings.tratarNovoModoCalculo || 'diasCorridos';

        const ajusteFdsEl = document.getElementById('tratarNovoAjusteFds') as HTMLSelectElement | null; // <select id="tratarNovoAjusteFds">
        if (ajusteFdsEl) ajusteFdsEl.value = prazosSettings.tratarNovoAjusteFds || 'modo1';

        const ajusteFeriadoEl = document.getElementById('tratarNovoAjusteFeriado') as HTMLSelectElement | null; // <select id="tratarNovoAjusteFeriado">
        if (ajusteFeriadoEl) ajusteFeriadoEl.value = prazosSettings.tratarNovoAjusteFeriado || 'proximo_dia';

        updateGlobalUIEnableState();
    }

    function collectSettingsFromUI() {
        fullConfig.masterEnableNeuron = ui.masterEnable.checked;

        // Module toggles
        fullConfig.modules = {
            notificacoes: ui.enableNotificacoes.checked,
            prazos: ui.enablePrazos.checked,
            respostas: ui.enableRespostas.checked,
            modelos: ui.enableModelos.checked,
            pontosFocais: ui.enablePontosFocais.checked
        };

        if (!fullConfig.generalSettings) fullConfig.generalSettings = {};
        const qtdElement = document.getElementById('qtdItensTratarTriar') as HTMLInputElement | null; // <input type="number" id="qtdItensTratarTriar">
        fullConfig.generalSettings.qtdItensTratarTriar = qtdElement ? parseInt(qtdElement.value, 10) || 50 : 50;

        const limiteArquivarEl = document.getElementById('limiteCaracteresArquivar') as HTMLInputElement | null; // <input type="number" id="limiteCaracteresArquivar">
        fullConfig.generalSettings.limiteCaracteresArquivar = limiteArquivarEl ? parseInt(limiteArquivarEl.value, 10) || 300 : 300;

        const prazosSettings: Partial<PrazosSettings> = fullConfig.prazosSettings || {};

        const prazoDiasEl = document.getElementById('tratarNovoPrazoInternoDias') as HTMLInputElement | null; // <input type="number" id="tratarNovoPrazoInternoDias">
        prazosSettings.tratarNovoPrazoInternoDias = prazoDiasEl ? parseInt(prazoDiasEl.value, 10) || -5 : -5;

        const cobrancaDiasEl = document.getElementById('tratarNovoCobrancaInternaDias') as HTMLInputElement | null; // <input type="number" id="tratarNovoCobrancaInternaDias">
        prazosSettings.tratarNovoCobrancaInternaDias = cobrancaDiasEl ? parseInt(cobrancaDiasEl.value, 10) || -3 : -3;

        // Os <select> abaixo só contêm os valores dos tipos PrazoModoCalculo / PrazoAjusteFds / PrazoAjusteFeriado (types.ts)
        const modoCalculoEl = document.getElementById('tratarNovoModoCalculo') as HTMLSelectElement | null; // <select id="tratarNovoModoCalculo">
        prazosSettings.tratarNovoModoCalculo = modoCalculoEl ? (modoCalculoEl.value as PrazoModoCalculo) || 'diasCorridos' : 'diasCorridos';

        const ajusteFdsEl = document.getElementById('tratarNovoAjusteFds') as HTMLSelectElement | null; // <select id="tratarNovoAjusteFds">
        prazosSettings.tratarNovoAjusteFds = ajusteFdsEl ? (ajusteFdsEl.value as PrazoAjusteFds) || 'modo1' : 'modo1';

        const ajusteFeriadoEl = document.getElementById('tratarNovoAjusteFeriado') as HTMLSelectElement | null; // <select id="tratarNovoAjusteFeriado">
        prazosSettings.tratarNovoAjusteFeriado = ajusteFeriadoEl ? (ajusteFeriadoEl.value as PrazoAjusteFeriado) || 'proximo_dia' : 'proximo_dia';

        fullConfig.prazosSettings = prazosSettings;
    }

    function updateGlobalUIEnableState() {
        const enabled = ui.masterEnable.checked;
        document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('.options-section input, .options-section select, .options-section textarea, .options-section button').forEach(field => {
            if (field.id !== 'masterEnableOptions') {
                field.disabled = !enabled;
            }
        });
    }

    // File: modules/options/options.js (substituir funções existentes)

    function setupHolidaysTab() {
        const listEl = document.getElementById('holidaysList')!;
        const statusEl = document.getElementById('holidaysStatus');

        renderHolidays(); // Renderiza a lista inicial

        // Event listener único no pai da lista para lidar com a remoção
        listEl.addEventListener('click', (e) => {
            // Verifica se o clique foi num botão de remover
            if (e.target instanceof HTMLElement && e.target.matches('.remove-btn')) {
                const indexToRemove = parseInt(e.target.dataset.index ?? '', 10);
                fullConfig.holidays!.splice(indexToRemove, 1);
                renderHolidays(); // Re-renderiza a lista após a remoção
                displayStatus(statusEl, 'Feriado removido. Não se esqueça de salvar.', false);
            }
        });

        document.getElementById('addHolidayButton')!.addEventListener('click', () => {
            const dateInput = document.getElementById('holidayInput') as HTMLInputElement; // <input type="text" id="holidayInput">
            const descriptionInput = document.getElementById('holidayDescriptionInput') as HTMLInputElement; // <input type="text" id="holidayDescriptionInput">
            const date = dateInput.value.trim();
            const description = descriptionInput.value.trim();

            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
                displayStatus(statusEl, 'Formato de data inválido. Use DD/MM/AAAA.', true);
                return;
            }
            const [dia, mes, ano] = date.split('/').map(Number);
            const dateObj = new Date(ano, mes - 1, dia);
            if (isNaN(dateObj.getTime()) || dateObj.getDate() !== dia || dateObj.getMonth() !== mes - 1 || dateObj.getFullYear() !== ano) {
                displayStatus(statusEl, 'Data inválida. Verifique o dia, mês e ano.', true);
                return;
            }
            if (!description) {
                displayStatus(statusEl, 'A descrição do feriado não pode estar vazia.', true);
                return;
            }
            if (!fullConfig.holidays) {
                fullConfig.holidays = [];
            }
            if (fullConfig.holidays.some(h => h.date === date)) {
                displayStatus(statusEl, `O feriado na data ${date} já existe.`, true);
                return;
            }

            fullConfig.holidays.push({ date, description });
            fullConfig.holidays.sort((a, b) => {
                const dateA = new Date(a.date.split('/').reverse().join('-'));
                const dateB = new Date(b.date.split('/').reverse().join('-'));
                return dateA.getTime() - dateB.getTime();
            });

            renderHolidays(); // Re-renderiza a lista
            dateInput.value = '';
            descriptionInput.value = '';
            displayStatus(statusEl, 'Feriado adicionado à lista. Não se esqueça de salvar.', false);
        });

        document.getElementById('saveHolidaysButton')!.addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Feriados salvos com sucesso!', false);
        });

        document.getElementById('resetHolidaysButton')!.addEventListener('click', () => {
            if (confirm('Isso restaurará a lista de feriados para o padrão. Deseja continuar?')) {
                fullConfig.holidays = JSON.parse(JSON.stringify(defaultConfig.holidays));
                renderHolidays();
                displayStatus(statusEl, 'Feriados restaurados para o padrão.', false);
            }
        });
    }

    function renderHolidays() {
        const listEl = document.getElementById('holidaysList');
        if (!listEl) return;

        listEl.innerHTML = '';
        const holidays = fullConfig.holidays || [];

        if (holidays.length === 0) {
            return; // CSS :empty will show placeholder
        }

        holidays.forEach((holiday, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-group-item d-flex justify-content-between align-items-center';
            itemDiv.innerHTML = `
                <span><strong>${escapeHtml(holiday.date)}</strong> - ${escapeHtml(holiday.description)}</span>
                <button class="btn btn-sm btn-outline-danger remove-btn" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            listEl.appendChild(itemDiv);
        });
    }
    function setupResponsesTab() {
        const select = document.getElementById('selectTipoRespostaConfig') as HTMLSelectElement; // <select id="selectTipoRespostaConfig">
        const container = document.getElementById('optionsContainer')!;
        const statusEl = document.getElementById('respostasStatus');

        // Validate each response type has a novoDropdownOptions array
        if (fullConfig.defaultResponses) {
            for (const key in fullConfig.defaultResponses) {
                if (!Array.isArray(fullConfig.defaultResponses[key]?.novoDropdownOptions)) {
                    const defaultArr = defaultConfig.defaultResponses?.[key]?.novoDropdownOptions;
                    fullConfig.defaultResponses[key].novoDropdownOptions = defaultArr
                        ? JSON.parse(JSON.stringify(defaultArr))
                        : [];
                }
            }
        }

        select.innerHTML = '<option value="">Selecione um Tipo de Resposta...</option>';
        Object.keys(fullConfig.defaultResponses!).sort().forEach(key => {
            select.innerHTML += `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`;
        });

        select.addEventListener('change', () => {
            const tipoResposta = select.value;
            if (tipoResposta) {
                container.style.display = 'block';
                document.getElementById('currentTipoResposta')!.textContent = tipoResposta;
                renderResponseOptions(tipoResposta);
            } else {
                container.style.display = 'none';
            }
        });

        document.getElementById('addOptionBtn')!.addEventListener('click', () => {
            const tipoResposta = select.value;
            if (!tipoResposta) return;
            const newOption = {
                text: "Nova Opção",
                conteudoTextarea: "Escreva o conteúdo aqui...",
                responsavel: "Defina o responsável"
            };
            if (!Array.isArray(fullConfig.defaultResponses![tipoResposta].novoDropdownOptions)) {
                fullConfig.defaultResponses![tipoResposta].novoDropdownOptions = [];
            }
            fullConfig.defaultResponses![tipoResposta].novoDropdownOptions.push(newOption);
            renderResponseOptions(tipoResposta);
        });

        document.getElementById('saveResponsesBtn')!.addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Respostas salvas com sucesso!', false);
        });

        document.getElementById('resetResponsesBtn')!.addEventListener('click', () => {
            const tipoResposta = select.value;
            if (!tipoResposta || !confirm(`Isso restaurará as respostas de "${tipoResposta}" para o padrão. Deseja continuar?`)) return;

            const defaultEntry = defaultConfig.defaultResponses?.[tipoResposta];
            fullConfig.defaultResponses![tipoResposta] = defaultEntry
                ? JSON.parse(JSON.stringify(defaultEntry))
                : { novoDropdownOptions: [] };
            renderResponseOptions(tipoResposta);
            displayStatus(statusEl, 'Respostas restauradas para o padrão.', false);
        });
    }

    function renderResponseOptions(tipoResposta: string) {
        const listEl = document.getElementById('dropdownOptionsList')!;
        listEl.innerHTML = '';
        const options = fullConfig.defaultResponses![tipoResposta]?.novoDropdownOptions || [];

        options.forEach((option, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'option-item';
            itemDiv.innerHTML = `
                <div class="mb-3">
                    <label class="form-label fw-semibold">Texto da Opcao</label>
                    <input type="text" class="form-control response-text" data-index="${index}" value="${escapeHtml(option.text)}">
                </div>
                <div class="mb-3">
                    <label class="form-label fw-semibold">Conteudo da Resposta</label>
                    <textarea class="form-control response-textarea" data-index="${index}" rows="4">${escapeHtml(option.conteudoTextarea)}</textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-semibold">Responsavel</label>
                    <input type="text" class="form-control response-responsavel" data-index="${index}" value="${escapeHtml(option.responsavel)}">
                </div>
                <button class="btn btn-outline-danger btn-sm remove-btn" data-index="${index}">
                    <i class="bi bi-trash me-1"></i>Remover Opcao
                </button>
            `;
            listEl.appendChild(itemDiv);
        });

        listEl.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!(e.target instanceof HTMLElement)) return;
                const indexToRemove = parseInt(e.target.closest<HTMLElement>('.remove-btn')!.dataset.index ?? '', 10);
                const opts = fullConfig.defaultResponses![tipoResposta]?.novoDropdownOptions;
                if (Array.isArray(opts)) {
                    opts.splice(indexToRemove, 1);
                }
                renderResponseOptions(tipoResposta);
            });
        });

        listEl.querySelectorAll('.response-text, .response-textarea, .response-responsavel').forEach(input => {
            input.addEventListener('input', (e) => {
                if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return;
                const index = parseInt(e.target.dataset.index ?? '', 10);
                const property = e.target.classList.contains('response-text') ? 'text'
                    : e.target.classList.contains('response-textarea') ? 'conteudoTextarea'
                        : 'responsavel';
                fullConfig.defaultResponses![tipoResposta].novoDropdownOptions[index][property] = e.target.value;
            });
        });
    }

    function setupTextModelsTab() {
        const categorySelect = document.getElementById('selectTextModelCategory') as HTMLSelectElement; // <select id="selectTextModelCategory">
        const container = document.getElementById('textModelsContainer')!;
        const statusEl = document.getElementById('textModelsStatus');
        const listEl = document.getElementById('textModelsList')!;

        // Preenche o seletor de categorias
        categorySelect.innerHTML = '<option value="">Selecione um Assistente...</option>';
        Object.keys(textModelsOf(fullConfig)).sort().forEach(key => {
            categorySelect.innerHTML += `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`;
        });

        // Mostra/Esconde o container de modelos
        categorySelect.addEventListener('change', () => {
            const category = categorySelect.value;
            if (category) {
                container.style.display = 'block';
                document.getElementById('currentTextModelCategory')!.textContent = category;
                renderTextModels(category);
            } else {
                container.style.display = 'none';
            }
        });

        // Adiciona novo modelo
        document.getElementById('addTextModelBtn')!.addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category) return;
            const newKey = `Novo Modelo ${Date.now()}`;
            textModelsOf(fullConfig)[category][newKey] = "Novo conteúdo...";
            renderTextModels(category);
        });

        // Salva modelos
        document.getElementById('saveTextModelsBtn')!.addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Modelos de texto salvos com sucesso!', false);
        });

        // Restaura modelos
        document.getElementById('resetTextModelsBtn')!.addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category || !confirm(`Isso restaurará os modelos de "${category}" para o padrão. Deseja continuar?`)) return;
            textModelsOf(fullConfig)[category] = JSON.parse(JSON.stringify(textModelsOf(defaultConfig)[category]));
            renderTextModels(category);
            displayStatus(statusEl, 'Modelos restaurados para o padrão.', false);
        });

        // --- DELEGAÇÃO DE EVENTOS ---
        listEl.addEventListener('click', (e) => {
            if (!(e.target instanceof HTMLElement)) return;
            // Lida com o clique no botão de remover
            if (e.target.matches('.remove-btn')) {
                const keyToRemove = e.target.dataset.key ?? '';
                const category = categorySelect.value;
                if (confirm(`Tem certeza que deseja remover o modelo "${keyToRemove}"?`)) {
                    delete textModelsOf(fullConfig)[category][keyToRemove];
                    renderTextModels(category);
                }
                return;
            }

            // Lida com o clique em um chip de chave (copia para o clipboard)
            const chip = e.target.closest<HTMLElement>('.neuron-placeholder-chip');
            if (chip) {
                const token = chip.dataset.token;
                if (!token) return;
                navigator.clipboard.writeText(token).then(() => {
                    displayStatus(statusEl, `Chave ${token} copiada para a área de transferência.`, false, 2500);
                }).catch(() => {
                    displayStatus(statusEl, `Não foi possível copiar a chave ${token}.`, true, 3000);
                });
            }
        });

        listEl.addEventListener('input', (e) => {
            const category = categorySelect.value;
            const target = e.target;
            // .model-value e .model-sub-value são <textarea>
            if (!(target instanceof HTMLTextAreaElement)) return;

            // Lida com a edição do conteúdo de um modelo simples (string)
            if (target.matches('.model-value')) {
                const key = target.closest('.text-model-item')!.querySelector<HTMLInputElement>('.model-key')!.value;
                textModelsOf(fullConfig)[category][key] = target.value;
            }

            // Lida com a edição do conteúdo de um sub-item de um modelo complexo (objeto)
            if (target.matches('.model-sub-value')) {
                const parentKey = target.dataset.parentKey ?? '';
                const subKey = target.dataset.subKey ?? '';
                const parent = textModelsOf(fullConfig)[category][parentKey];
                if (typeof parent === 'object') parent[subKey] = target.value;
            }
        });

        listEl.addEventListener('change', (e) => {
            const category = categorySelect.value;
            const target = e.target;
            // .model-key é <input type="text">
            if (!(target instanceof HTMLInputElement)) return;

            // Lida com a renomeação da chave de um modelo
            if (target.matches('.model-key')) {
                const originalKey = target.dataset.originalKey ?? '';
                const newKey = target.value.trim();

                if (originalKey !== newKey && newKey) {
                    if (textModelsOf(fullConfig)[category][newKey]) {
                        alert('Já existe um modelo com este nome. Por favor, escolha outro.');
                        target.value = originalKey;
                        return;
                    }
                    const value = textModelsOf(fullConfig)[category][originalKey];
                    delete textModelsOf(fullConfig)[category][originalKey];
                    textModelsOf(fullConfig)[category][newKey] = value;
                    // Re-renderiza para atualizar os 'data-attributes' de todos os elementos
                    renderTextModels(category);
                } else if (!newKey) {
                    target.value = originalKey; // Restaura se o campo for deixado vazio
                }
            }
        });
    }

    function renderTextModels(category: string) {
        const listEl = document.getElementById('textModelsList')!;
        listEl.innerHTML = '';
        const models = textModelsOf(fullConfig)[category];

        // Painel informativo com as chaves de substituição disponíveis para a categoria
        const placeholders = isTextModelCategory(category) ? NEURON_TEXT_PLACEHOLDERS[category] : undefined;
        if (placeholders && placeholders.length > 0) {
            const painelChaves = document.createElement('div');
            painelChaves.className = 'neuron-placeholder-panel alert alert-info mb-3';
            const chipsHTML = placeholders.map(p => `
                <button type="button" class="neuron-placeholder-chip btn btn-sm btn-outline-primary"
                        data-token="${escapeHtml(p.token)}"
                        title="Clique para copiar. ${escapeHtml(p.descricao)} (ex: ${escapeHtml(p.exemplo)})">
                    <code>${escapeHtml(p.token)}</code>
                    <span class="neuron-placeholder-desc">${escapeHtml(p.descricao)}</span>
                </button>
            `).join('');
            painelChaves.innerHTML = `
                <div class="fw-semibold mb-2">
                    <i class="bi bi-braces me-1"></i>Chaves disponíveis para esta categoria
                </div>
                <div class="small text-body-secondary mb-2">
                    Use as chaves abaixo dentro dos seus modelos. Elas serão substituídas automaticamente quando o modelo for inserido no Fala.BR. Clique em uma chave para copiá-la.
                </div>
                <div class="neuron-placeholder-chips">${chipsHTML}</div>
            `;
            listEl.appendChild(painelChaves);
        } else if (category) {
            // Categoria existe mas não possui chaves documentadas
            const aviso = document.createElement('div');
            aviso.className = 'neuron-placeholder-panel alert alert-secondary py-2 mb-3 small';
            aviso.innerHTML = `<i class="bi bi-info-circle me-1"></i>Esta categoria não possui chaves de substituição — o texto é inserido sem modificações.`;
            listEl.appendChild(aviso);
        }

        for (const key in models) {
            const value = models[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'text-model-item';

            const removeBtnHTML = `
                <button class="btn btn-outline-danger btn-sm remove-btn mt-2" data-key="${escapeHtml(key)}">
                    <i class="bi bi-trash me-1"></i>Remover Modelo
                </button>`;

            const limiteArquivarHTML = category === 'Arquivar'
                ? `<small class="text-muted">Limite máximo de ${fullConfig.generalSettings?.limiteCaracteresArquivar || 300} caracteres</small>`
                : '';

            if (typeof value === 'string') {
                itemDiv.innerHTML = `
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Chave do Modelo</label>
                        <input type="text" class="form-control model-key" value="${escapeHtml(key)}" data-original-key="${escapeHtml(key)}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Conteudo</label>
                        <textarea class="form-control model-value" rows="5">${escapeHtml(value)}</textarea>
                        ${limiteArquivarHTML}
                    </div>
                    ${removeBtnHTML}
                `;
            } else if (isObject(value)) {
                let nestedHTML = '';
                for (const subKey in value) {
                    nestedHTML += `
                        <div class="nested-item mb-3">
                            <label class="form-label text-body-secondary">
                                <i class="bi bi-arrow-return-right me-1"></i><strong>${escapeHtml(subKey)}</strong>
                            </label>
                            <textarea class="form-control model-sub-value" data-parent-key="${escapeHtml(key)}" data-sub-key="${escapeHtml(subKey)}" rows="4">${escapeHtml(value[subKey])}</textarea>
                        </div>
                    `;
                }
                itemDiv.innerHTML = `
                    <div class="card border-primary">
                        <div class="card-header bg-primary bg-opacity-10">
                            <h6 class="mb-0 text-neuron-primary">${escapeHtml(key)}</h6>
                        </div>
                        <div class="card-body nested-items">
                            ${nestedHTML}
                        </div>
                    </div>
                    ${removeBtnHTML}
                `;
            }
            listEl.appendChild(itemDiv);
        }
    }

    // File: modules/options/options.js

    function setupFocalPointsTab() {
        const listEl = document.getElementById('focalPointsList')!;
        const statusEl = document.getElementById('focalPointsStatus');

        renderFocalPoints();

        // Adiciona novo grupo
        document.getElementById('addFocalPointBtn')!.addEventListener('click', () => {
            const newKey = `Novo Grupo ${Date.now()}`;
            if (!fullConfig.focalPoints) fullConfig.focalPoints = {};
            fullConfig.focalPoints[newKey] = ["Novo Ponto Focal"];
            renderFocalPoints();
        });

        // Salva alterações
        document.getElementById('saveFocalPointsBtn')!.addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Pontos Focais salvos com sucesso!', false);
        });

        // Restaura padrão
        document.getElementById('resetFocalPointsBtn')!.addEventListener('click', () => {
            if (confirm(`Isso restaurará TODOS os Pontos Focais para o padrão. Deseja continuar?`)) {
                fullConfig.focalPoints = JSON.parse(JSON.stringify(defaultConfig.focalPoints));
                renderFocalPoints();
                displayStatus(statusEl, 'Pontos Focais restaurados para o padrão.', false);
            }
        });

        // --- DELEGAÇÃO DE EVENTOS PARA TODA A LISTA ---
        // Prevent accordion toggle when clicking group name input
        listEl.addEventListener('click', e => {
            if (e.target instanceof HTMLElement && e.target.matches('.focal-point-group-name')) {
                e.stopPropagation();
            }
        });

        listEl.addEventListener('click', e => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            const btn = target.closest<HTMLElement>('.remove-btn') || target.closest<HTMLElement>('.add-point-btn');
            if (!btn) return;

            const groupName = btn.dataset.group ?? '';

            // Botão de adicionar ponto dentro de um grupo
            if (btn.classList.contains('add-point-btn')) {
                fullConfig.focalPoints![groupName].push("Novo Ponto Focal");
                renderFocalPoints();
            }
            // Botão de remover um ponto específico (has index)
            else if (btn.classList.contains('remove-btn') && btn.dataset.index !== undefined) {
                const index = parseInt(btn.dataset.index, 10);
                fullConfig.focalPoints![groupName].splice(index, 1);
                renderFocalPoints();
            }
            // Botão de remover grupo (no index = group removal)
            else if (btn.classList.contains('remove-btn') && btn.dataset.index === undefined) {
                if (confirm(`Tem certeza que deseja remover o grupo "${groupName}"?`)) {
                    delete fullConfig.focalPoints![groupName];
                    renderFocalPoints();
                }
            }
        });

        listEl.addEventListener('change', e => {
            const target = e.target;
            // .focal-point-group-name é <input type="text">
            if (!(target instanceof HTMLInputElement)) return;
            // Renomear um grupo
            if (target.matches('.focal-point-group-name')) {
                const originalName = target.dataset.originalName ?? '';
                const newName = target.value.trim();
                if (originalName !== newName && newName) {
                    if (fullConfig.focalPoints![newName]) {
                        alert(`O nome de grupo "${newName}" já existe.`);
                        target.value = originalName;
                        return;
                    }
                    // Preserva a ordem das chaves ao recriar o objeto
                    const newFocalPoints: FocalPoints = {};
                    for (const key in fullConfig.focalPoints) {
                        if (key === originalName) {
                            newFocalPoints[newName] = fullConfig.focalPoints![key];
                        } else {
                            newFocalPoints[key] = fullConfig.focalPoints![key];
                        }
                    }
                    fullConfig.focalPoints = newFocalPoints;
                    renderFocalPoints();
                } else if (!newName) {
                    target.value = originalName;
                }
            }
        });

        listEl.addEventListener('input', e => {
            const target = e.target;
            // .focal-point-value é <input type="text">
            if (!(target instanceof HTMLInputElement)) return;
            // Editar o valor de um ponto focal
            if (target.matches('.focal-point-value')) {
                const groupName = target.dataset.group;
                const index = parseInt(target.dataset.index ?? '', 10);
                const currentGroupName = target.closest('.focal-point-group')!.querySelector<HTMLInputElement>('.focal-point-group-name')!.value;
                if (fullConfig.focalPoints![currentGroupName]) {
                    fullConfig.focalPoints![currentGroupName][index] = target.value;
                }
            }
        });
    }

    function renderFocalPoints() {
        const listEl = document.getElementById('focalPointsList')!;
        listEl.innerHTML = '';
        let accordionIndex = 0;

        for (const groupName in fullConfig.focalPoints) {
            const points = fullConfig.focalPoints![groupName];
            const groupDiv = document.createElement('div');
            groupDiv.className = 'accordion-item focal-point-group';
            const collapseId = `focalCollapse${accordionIndex}`;
            const headerId = `focalHeader${accordionIndex}`;

            let pointsHTML = '';
            points.forEach((point, index) => {
                pointsHTML += `
                    <div class="focal-point-row d-flex align-items-center">
                        <input type="text" class="form-control focal-point-value" value="${escapeHtml(point)}" data-group="${escapeHtml(groupName)}" data-index="${index}">
                        <button class="btn btn-outline-danger btn-sm remove-btn ms-2" data-group="${escapeHtml(groupName)}" data-index="${index}" title="Remover ponto">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                `;
            });

            groupDiv.innerHTML = `
                <h2 class="accordion-header" id="${headerId}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        <div class="d-flex align-items-center justify-content-between w-100 me-3">
                            <input type="text" class="form-control form-control-sm focal-point-group-name me-3" value="${escapeHtml(groupName)}" data-original-name="${escapeHtml(groupName)}" style="max-width: 250px;">
                            <span class="badge bg-secondary">${points.length} pontos</span>
                        </div>
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#focalPointsAccordion">
                    <div class="accordion-body">
                        <div class="focal-points-container mb-3">
                            ${pointsHTML}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm add-point-btn-dashed add-point-btn" data-group="${escapeHtml(groupName)}">
                                <i class="bi bi-plus-lg me-1"></i>Adicionar Ponto
                            </button>
                            <button class="btn btn-outline-danger btn-sm remove-btn" data-group="${escapeHtml(groupName)}">
                                <i class="bi bi-trash me-1"></i>Remover Grupo
                            </button>
                        </div>
                    </div>
                </div>
            `;
            listEl.appendChild(groupDiv);
            accordionIndex++;
        }
    }

    // Sidebar Navigation
    function setupSidebarNavigation() {
        const sectionsInitialized = new Set<string>();

        function showSection(sectionName: string) {
            // Update sidebar links
            ui.sidebarLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.section === sectionName);
                link.setAttribute('aria-selected', String(link.dataset.section === sectionName));
            });

            // Update sections
            ui.sections.forEach(section => {
                const isTarget = section.id === `section-${sectionName}`;
                section.classList.toggle('active', isTarget);
            });

            // Initialize section on first show
            if (!sectionsInitialized.has(sectionName)) {
                switch (sectionName) {
                    case 'prazos':
                        setupHolidaysTab();
                        break;
                    case 'respostas':
                        setupResponsesTab();
                        break;
                    case 'textos':
                        setupTextModelsTab();
                        break;
                    case 'pontosfocais':
                        setupFocalPointsTab();
                        break;
                }
                sectionsInitialized.add(sectionName);
            }

            // Always update raw config editor when JSON section is shown
            if (sectionName === 'json') {
                ui.rawConfigEditor.value = JSON.stringify(fullConfig, null, 2);
            }
        }

        // Click handler for sidebar links
        ui.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = link.dataset.section;
                if (sectionName) {
                    showSection(sectionName);
                    // Update URL hash
                    history.replaceState(null, '', `#${sectionName}`);
                }
            });
        });

        // Handle initial hash or default to general
        const initialSection = window.location.hash.substring(1) || 'general';
        showSection(initialSection);
    }

    async function initializePage() {
        await loadConfig();
        populateAllTabs();

        // Setup sidebar navigation
        setupSidebarNavigation();

        ui.masterEnable.addEventListener('change', updateGlobalUIEnableState);
        ui.saveAllButton.addEventListener('click', () => {
            collectSettingsFromUI();
            saveConfig();
        });
        ui.saveRawConfig.addEventListener('click', () => {
            try {
                const newConfig = JSON.parse(ui.rawConfigEditor.value);
                fullConfig = newConfig;
                saveConfig();
                populateAllTabs();
                displayStatus(ui.rawConfigStatus, 'Configuracao RAW salva com sucesso!', false);
            } catch (e) {
                displayStatus(ui.rawConfigStatus, `Erro no JSON: ${errorMessage(e)}`, true);
            }
        });
        ui.resetRawConfig.addEventListener('click', () => {
            if (confirm("Isso ira restaurar TODAS as configuracoes para o padrao. Deseja continuar?")) {
                fullConfig = JSON.parse(JSON.stringify(defaultConfig));
                saveConfig();
                populateAllTabs();
            }
        });
        ui.exportConfig.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(fullConfig, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neuron_config_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        ui.importConfig.addEventListener('click', () => {
            const file = ui.importFileInput.files?.[0];
            if (!file) {
                displayStatus(ui.importStatus, "Nenhum arquivo selecionado.", true);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    // readAsText → result é string
                    const importedConfig = JSON.parse(reader.result as string) as unknown;
                    if (!isNeuronUserConfigLike(importedConfig)) throw new Error("Arquivo nao parece ser uma configuracao valida do Fala.BR CGU - Neuron.");
                    fullConfig = importedConfig;
                    saveConfig();
                    populateAllTabs();
                    displayStatus(ui.importStatus, "Configuracao importada com sucesso!", false);
                } catch (e) {
                    displayStatus(ui.importStatus, `Erro ao importar: ${errorMessage(e)}`, true);
                }
            };
            reader.onerror = () => {
                displayStatus(ui.importStatus, "Erro ao ler o arquivo. Tente novamente.", true);
            };
            reader.readAsText(file);
        });
    }

    // Listen for config changes from other contexts via chrome.storage.onChanged
    NeuronSync.onConfigChange(async (key, newValue) => {
        if (key === CONFIG_STORAGE_KEY && newValue) {
            fullConfig = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), newValue) as NeuronUserConfig;
            ensureResponseArrays();
            populateAllTabs();
        }
    });

    initializePage();
});
