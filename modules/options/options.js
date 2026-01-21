document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme first
    await ThemeManager.init();

    const CONFIG_STORAGE_KEY = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH = '/config/config.json';

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

    const ui = {
        masterEnable: document.getElementById('masterEnableOptions'),
        saveAllButton: document.getElementById('saveAllOptionsButton'),
        globalStatus: document.getElementById('globalStatus'),
        sidebar: document.getElementById('optionsSidebar'),
        sidebarLinks: document.querySelectorAll('.sidebar-nav-link'),
        sections: document.querySelectorAll('.options-section'),
        rawConfigEditor: document.getElementById('rawConfigJsonEditor'),
        saveRawConfig: document.getElementById('saveRawConfigJsonButton'),
        resetRawConfig: document.getElementById('resetRawConfigJsonButton'),
        rawConfigStatus: document.getElementById('rawConfigJsonStatus'),
        exportConfig: document.getElementById('exportConfigButton'),
        importFileInput: document.getElementById('importConfigFileInput'),
        importConfig: document.getElementById('importConfigButton'),
        importStatus: document.getElementById('importConfigStatus'),
    };

    let fullConfig = {};
    let defaultConfig = {};

    const displayStatus = (el, msg, isError = false, duration = 4000) => {
        if (!el) return;
        el.innerHTML = `
            <div class="alert alert-${isError ? 'danger' : 'success'} alert-dismissible fade show py-2 mb-0" role="alert">
                <i class="bi bi-${isError ? 'exclamation-triangle' : 'check-circle'} me-2"></i>${msg}
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

    const isObject = item => item && typeof item === 'object' && !Array.isArray(item);

    const deepMerge = (target, ...sources) => {
        if (!sources.length) return target;
        const source = sources.shift();
        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return deepMerge(target, ...sources);
    };

    async function loadConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            defaultConfig = await response.json();
            const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
            fullConfig = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), result[CONFIG_STORAGE_KEY] || {});
        } catch (error) {
            displayStatus(ui.globalStatus, `ERRO CRÍTICO: Falha ao carregar configuração. ${error.message}`, true, 15000);
        }
    }

    async function saveConfig() {
        try {
            await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: fullConfig });
            displayStatus(ui.globalStatus, "Configurações salvas com sucesso!", false);
        } catch (error) {
            displayStatus(ui.globalStatus, `Erro ao salvar: ${error.message}`, true);
        }
    }

    function populateAllTabs() {
        ui.masterEnable.checked = fullConfig.masterEnableNeuron !== false;

        const qtdElement = document.getElementById('qtdItensTratarTriar');
        if (qtdElement) qtdElement.value = fullConfig.generalSettings?.qtdItensTratarTriar || 50;

        const prazosSettings = fullConfig.prazosSettings || {};
        const prazoDiasEl = document.getElementById('tratarNovoPrazoInternoDias');
        if (prazoDiasEl) prazoDiasEl.value = prazosSettings.tratarNovoPrazoInternoDias || -5;

        const cobrancaDiasEl = document.getElementById('tratarNovoCobrancaInternaDias');
        if (cobrancaDiasEl) cobrancaDiasEl.value = prazosSettings.tratarNovoCobrancaInternaDias || -3;

        const modoCalculoEl = document.getElementById('tratarNovoModoCalculo');
        if (modoCalculoEl) modoCalculoEl.value = prazosSettings.tratarNovoModoCalculo || 'corridos';

        const ajusteFdsEl = document.getElementById('tratarNovoAjusteFds');
        if (ajusteFdsEl) ajusteFdsEl.value = prazosSettings.tratarNovoAjusteFds || 'modo1';

        const ajusteFeriadoEl = document.getElementById('tratarNovoAjusteFeriado');
        if (ajusteFeriadoEl) ajusteFeriadoEl.value = prazosSettings.tratarNovoAjusteFeriado || 'proximo_dia';

        updateGlobalUIEnableState();
    }

    function collectSettingsFromUI() {
        fullConfig.masterEnableNeuron = ui.masterEnable.checked;

        if (!fullConfig.generalSettings) fullConfig.generalSettings = {};
        const qtdElement = document.getElementById('qtdItensTratarTriar');
        fullConfig.generalSettings.qtdItensTratarTriar = qtdElement ? parseInt(qtdElement.value, 10) || 50 : 50;

        const prazosSettings = fullConfig.prazosSettings || {};

        const prazoDiasEl = document.getElementById('tratarNovoPrazoInternoDias');
        prazosSettings.tratarNovoPrazoInternoDias = prazoDiasEl ? parseInt(prazoDiasEl.value, 10) || -5 : -5;

        const cobrancaDiasEl = document.getElementById('tratarNovoCobrancaInternaDias');
        prazosSettings.tratarNovoCobrancaInternaDias = cobrancaDiasEl ? parseInt(cobrancaDiasEl.value, 10) || -3 : -3;

        const modoCalculoEl = document.getElementById('tratarNovoModoCalculo');
        prazosSettings.tratarNovoModoCalculo = modoCalculoEl ? modoCalculoEl.value || 'corridos' : 'corridos';

        const ajusteFdsEl = document.getElementById('tratarNovoAjusteFds');
        prazosSettings.tratarNovoAjusteFds = ajusteFdsEl ? ajusteFdsEl.value || 'modo1' : 'modo1';

        const ajusteFeriadoEl = document.getElementById('tratarNovoAjusteFeriado');
        prazosSettings.tratarNovoAjusteFeriado = ajusteFeriadoEl ? ajusteFeriadoEl.value || 'proximo_dia' : 'proximo_dia';

        fullConfig.prazosSettings = prazosSettings;
    }

    function updateGlobalUIEnableState() {
        const enabled = ui.masterEnable.checked;
        document.querySelectorAll('.options-section input, .options-section select, .options-section textarea, .options-section button').forEach(field => {
            if (field.id !== 'masterEnableOptions' && field.id !== 'refreshDashboard') {
                field.disabled = !enabled;
            }
        });
    }

    // File: modules/options/options.js (substituir funções existentes)

    function setupHolidaysTab() {
        const listEl = document.getElementById('holidaysList');
        const statusEl = document.getElementById('holidaysStatus');

        renderHolidays(); // Renderiza a lista inicial

        // Event listener único no pai da lista para lidar com a remoção
        listEl.addEventListener('click', (e) => {
            // Verifica se o clique foi num botão de remover
            if (e.target.matches('.remove-btn')) {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                fullConfig.holidays.splice(indexToRemove, 1);
                renderHolidays(); // Re-renderiza a lista após a remoção
                displayStatus(statusEl, 'Feriado removido. Não se esqueça de salvar.', false);
            }
        });

        document.getElementById('addHolidayButton').addEventListener('click', () => {
            const dateInput = document.getElementById('holidayInput');
            const descriptionInput = document.getElementById('holidayDescriptionInput');
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
                return dateA - dateB;
            });

            renderHolidays(); // Re-renderiza a lista
            dateInput.value = '';
            descriptionInput.value = '';
            displayStatus(statusEl, 'Feriado adicionado à lista. Não se esqueça de salvar.', false);
        });

        document.getElementById('saveHolidaysButton').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Feriados salvos com sucesso!', false);
        });

        document.getElementById('resetHolidaysButton').addEventListener('click', () => {
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
                <span><strong>${holiday.date}</strong> - ${holiday.description}</span>
                <button class="btn btn-sm btn-outline-danger remove-btn" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            listEl.appendChild(itemDiv);
        });
    }
    function setupResponsesTab() {
        const select = document.getElementById('selectTipoRespostaConfig');
        const container = document.getElementById('optionsContainer');
        const statusEl = document.getElementById('respostasStatus');

        select.innerHTML = '<option value="">Selecione um Tipo de Resposta...</option>';
        Object.keys(fullConfig.defaultResponses).sort().forEach(key => {
            select.innerHTML += `<option value="${key}">${key}</option>`;
        });

        select.addEventListener('change', () => {
            const tipoResposta = select.value;
            if (tipoResposta) {
                container.style.display = 'block';
                document.getElementById('currentTipoResposta').textContent = tipoResposta;
                renderResponseOptions(tipoResposta);
            } else {
                container.style.display = 'none';
            }
        });

        document.getElementById('addOptionBtn').addEventListener('click', () => {
            const tipoResposta = select.value;
            if (!tipoResposta) return;
            const newOption = {
                text: "Nova Opção",
                conteudoTextarea: "Escreva o conteúdo aqui...",
                responsavel: "Defina o responsável"
            };
            fullConfig.defaultResponses[tipoResposta].novoDropdownOptions.push(newOption);
            renderResponseOptions(tipoResposta);
        });

        document.getElementById('saveResponsesBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Respostas salvas com sucesso!', false);
        });

        document.getElementById('resetResponsesBtn').addEventListener('click', () => {
            const tipoResposta = select.value;
            if (!tipoResposta || !confirm(`Isso restaurará as respostas de "${tipoResposta}" para o padrão. Deseja continuar?`)) return;

            fullConfig.defaultResponses[tipoResposta] = JSON.parse(JSON.stringify(defaultConfig.defaultResponses[tipoResposta]));
            renderResponseOptions(tipoResposta);
            displayStatus(statusEl, 'Respostas restauradas para o padrão.', false);
        });
    }

    function renderResponseOptions(tipoResposta) {
        const listEl = document.getElementById('dropdownOptionsList');
        listEl.innerHTML = '';
        const options = fullConfig.defaultResponses[tipoResposta]?.novoDropdownOptions || [];

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
                const indexToRemove = parseInt(e.target.closest('.remove-btn').dataset.index, 10);
                fullConfig.defaultResponses[tipoResposta].novoDropdownOptions.splice(indexToRemove, 1);
                renderResponseOptions(tipoResposta);
            });
        });

        listEl.querySelectorAll('.response-text, .response-textarea, .response-responsavel').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                const property = e.target.classList.contains('response-text') ? 'text'
                    : e.target.classList.contains('response-textarea') ? 'conteudoTextarea'
                        : 'responsavel';
                fullConfig.defaultResponses[tipoResposta].novoDropdownOptions[index][property] = e.target.value;
            });
        });
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    // File: modules/options/options.js (substituir funções)

    function setupTextModelsTab() {
        const categorySelect = document.getElementById('selectTextModelCategory');
        const container = document.getElementById('textModelsContainer');
        const statusEl = document.getElementById('textModelsStatus');
        const listEl = document.getElementById('textModelsList');

        // Preenche o seletor de categorias
        categorySelect.innerHTML = '<option value="">Selecione um Assistente...</option>';
        Object.keys(fullConfig.textModels).sort().forEach(key => {
            categorySelect.innerHTML += `<option value="${key}">${key}</option>`;
        });

        // Mostra/Esconde o container de modelos
        categorySelect.addEventListener('change', () => {
            const category = categorySelect.value;
            if (category) {
                container.style.display = 'block';
                document.getElementById('currentTextModelCategory').textContent = category;
                renderTextModels(category);
            } else {
                container.style.display = 'none';
            }
        });

        // Adiciona novo modelo
        document.getElementById('addTextModelBtn').addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category) return;
            const newKey = `Novo Modelo ${Date.now()}`;
            fullConfig.textModels[category][newKey] = "Novo conteúdo...";
            renderTextModels(category);
        });

        // Salva modelos
        document.getElementById('saveTextModelsBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Modelos de texto salvos com sucesso!', false);
        });

        // Restaura modelos
        document.getElementById('resetTextModelsBtn').addEventListener('click', () => {
            const category = categorySelect.value;
            if (!category || !confirm(`Isso restaurará os modelos de "${category}" para o padrão. Deseja continuar?`)) return;
            fullConfig.textModels[category] = JSON.parse(JSON.stringify(defaultConfig.textModels[category]));
            renderTextModels(category);
            displayStatus(statusEl, 'Modelos restaurados para o padrão.', false);
        });

        // --- DELEGAÇÃO DE EVENTOS ---
        listEl.addEventListener('click', (e) => {
            // Lida com o clique no botão de remover
            if (e.target.matches('.remove-btn')) {
                const keyToRemove = e.target.dataset.key;
                const category = categorySelect.value;
                if (confirm(`Tem certeza que deseja remover o modelo "${keyToRemove}"?`)) {
                    delete fullConfig.textModels[category][keyToRemove];
                    renderTextModels(category);
                }
            }
        });

        listEl.addEventListener('input', (e) => {
            const category = categorySelect.value;
            const target = e.target;

            // Lida com a edição do conteúdo de um modelo simples (string)
            if (target.matches('.model-value')) {
                const key = target.closest('.option-item').querySelector('.model-key').value;
                fullConfig.textModels[category][key] = target.value;
            }

            // Lida com a edição do conteúdo de um sub-item de um modelo complexo (objeto)
            if (target.matches('.model-sub-value')) {
                const parentKey = target.dataset.parentKey;
                const subKey = target.dataset.subKey;
                fullConfig.textModels[category][parentKey][subKey] = target.value;
            }
        });

        listEl.addEventListener('change', (e) => {
            const category = categorySelect.value;
            const target = e.target;

            // Lida com a renomeação da chave de um modelo
            if (target.matches('.model-key')) {
                const originalKey = target.dataset.originalKey;
                const newKey = target.value.trim();

                if (originalKey !== newKey && newKey) {
                    if (fullConfig.textModels[category][newKey]) {
                        alert('Já existe um modelo com este nome. Por favor, escolha outro.');
                        target.value = originalKey;
                        return;
                    }
                    const value = fullConfig.textModels[category][originalKey];
                    delete fullConfig.textModels[category][originalKey];
                    fullConfig.textModels[category][newKey] = value;
                    // Re-renderiza para atualizar os 'data-attributes' de todos os elementos
                    renderTextModels(category);
                } else if (!newKey) {
                    target.value = originalKey; // Restaura se o campo for deixado vazio
                }
            }
        });
    }

    function renderTextModels(category) {
        const listEl = document.getElementById('textModelsList');
        listEl.innerHTML = '';
        const models = fullConfig.textModels[category];

        for (const key in models) {
            const value = models[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'text-model-item';

            const removeBtnHTML = `
                <button class="btn btn-outline-danger btn-sm remove-btn mt-2" data-key="${escapeHtml(key)}">
                    <i class="bi bi-trash me-1"></i>Remover Modelo
                </button>`;

            if (typeof value === 'string') {
                itemDiv.innerHTML = `
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Chave do Modelo</label>
                        <input type="text" class="form-control model-key" value="${escapeHtml(key)}" data-original-key="${escapeHtml(key)}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Conteudo</label>
                        <textarea class="form-control model-value" rows="5">${escapeHtml(value)}</textarea>
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
        const listEl = document.getElementById('focalPointsList');
        const statusEl = document.getElementById('focalPointsStatus');

        renderFocalPoints();

        // Adiciona novo grupo
        document.getElementById('addFocalPointBtn').addEventListener('click', () => {
            const newKey = `Novo Grupo ${Date.now()}`;
            if (!fullConfig.focalPoints) fullConfig.focalPoints = {};
            fullConfig.focalPoints[newKey] = ["Novo Ponto Focal"];
            renderFocalPoints();
        });

        // Salva alterações
        document.getElementById('saveFocalPointsBtn').addEventListener('click', () => {
            saveConfig();
            displayStatus(statusEl, 'Pontos Focais salvos com sucesso!', false);
        });

        // Restaura padrão
        document.getElementById('resetFocalPointsBtn').addEventListener('click', () => {
            if (confirm(`Isso restaurará TODOS os Pontos Focais para o padrão. Deseja continuar?`)) {
                fullConfig.focalPoints = JSON.parse(JSON.stringify(defaultConfig.focalPoints));
                renderFocalPoints();
                displayStatus(statusEl, 'Pontos Focais restaurados para o padrão.', false);
            }
        });

        // --- DELEGAÇÃO DE EVENTOS PARA TODA A LISTA ---
        listEl.addEventListener('click', e => {
            const target = e.target;
            const btn = target.closest('.remove-btn') || target.closest('.add-point-btn');
            if (!btn) return;

            const groupName = btn.dataset.group;

            // Botão de adicionar ponto dentro de um grupo
            if (btn.classList.contains('add-point-btn')) {
                fullConfig.focalPoints[groupName].push("Novo Ponto Focal");
                renderFocalPoints();
            }
            // Botão de remover um ponto específico (has index)
            else if (btn.classList.contains('remove-btn') && btn.dataset.index !== undefined) {
                const index = parseInt(btn.dataset.index, 10);
                fullConfig.focalPoints[groupName].splice(index, 1);
                renderFocalPoints();
            }
            // Botão de remover grupo (no index = group removal)
            else if (btn.classList.contains('remove-btn') && btn.dataset.index === undefined) {
                if (confirm(`Tem certeza que deseja remover o grupo "${groupName}"?`)) {
                    delete fullConfig.focalPoints[groupName];
                    renderFocalPoints();
                }
            }
        });

        listEl.addEventListener('change', e => {
            const target = e.target;
            // Renomear um grupo
            if (target.matches('.focal-point-group-name')) {
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName !== newName && newName) {
                    if (fullConfig.focalPoints[newName]) {
                        alert(`O nome de grupo "${newName}" já existe.`);
                        target.value = originalName;
                        return;
                    }
                    // Preserva a ordem das chaves ao recriar o objeto
                    const newFocalPoints = {};
                    for (const key in fullConfig.focalPoints) {
                        if (key === originalName) {
                            newFocalPoints[newName] = fullConfig.focalPoints[key];
                        } else {
                            newFocalPoints[key] = fullConfig.focalPoints[key];
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
            // Editar o valor de um ponto focal
            if (target.matches('.focal-point-value')) {
                const groupName = target.dataset.group;
                const index = parseInt(target.dataset.index, 10);
                const currentGroupName = target.closest('.focal-point-group').querySelector('.focal-point-group-name').value;
                if (fullConfig.focalPoints[currentGroupName]) {
                    fullConfig.focalPoints[currentGroupName][index] = target.value;
                }
            }
        });
    }

    function renderFocalPoints() {
        const listEl = document.getElementById('focalPointsList');
        listEl.innerHTML = '';
        let accordionIndex = 0;

        for (const groupName in fullConfig.focalPoints) {
            const points = fullConfig.focalPoints[groupName];
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
                            <input type="text" class="form-control form-control-sm focal-point-group-name me-3" value="${escapeHtml(groupName)}" data-original-name="${escapeHtml(groupName)}" style="max-width: 250px;" onclick="event.stopPropagation();">
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
        const sectionsInitialized = new Set();

        function showSection(sectionName) {
            // Update sidebar links
            ui.sidebarLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.section === sectionName);
                link.setAttribute('aria-selected', link.dataset.section === sectionName);
            });

            // Update sections
            ui.sections.forEach(section => {
                const isTarget = section.id === `section-${sectionName}`;
                section.classList.toggle('active', isTarget);
            });

            // Initialize section on first show
            if (!sectionsInitialized.has(sectionName)) {
                switch (sectionName) {
                    case 'dashboard':
                        if (typeof NeuronDashboard !== 'undefined') {
                            NeuronDashboard.init();
                        }
                        break;
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

        // Handle initial hash or default to dashboard
        const initialSection = window.location.hash.substring(1) || 'dashboard';
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
                displayStatus(ui.rawConfigStatus, `Erro no JSON: ${e.message}`, true);
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
            const file = ui.importFileInput.files[0];
            if (!file) {
                displayStatus(ui.importStatus, "Nenhum arquivo selecionado.", true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    if (!importedConfig.featureSettings) throw new Error("Arquivo nao parece ser uma configuracao valida do Neuron.");
                    fullConfig = importedConfig;
                    saveConfig();
                    populateAllTabs();
                    displayStatus(ui.importStatus, "Configuracao importada com sucesso!", false);
                } catch (e) {
                    displayStatus(ui.importStatus, `Erro ao importar: ${e.message}`, true);
                }
            };
            reader.onerror = () => {
                displayStatus(ui.importStatus, "Erro ao ler o arquivo. Tente novamente.", true);
            };
            reader.readAsText(file);
        });
    }

    initializePage();
});