(async function () {
    'use strict';
    const SCRIPT_ID = 'notificacoes';
    const CONFIG_KEY = 'neuronUserConfig';
    const STORAGE_KEY_FILTRO_USUARIO = 'neuronFiltroUsuarioAtivado';
    const STORAGE_KEY_THEME = 'neuronThemePreference';

    let config = {};
    let demandasConcluidas = new Set();
    let memoriaDeDemandas = {};
    let isFeatureActive = false;
    let currentTheme = 'system';
    let dbInitialized = false;

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    let filtroUsuarioAtivado = true;

    // Theme detection and application
    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function getEffectiveTheme(preference) {
        if (preference === 'system') {
            return getSystemTheme();
        }
        return preference;
    }

    function applyTheme(preference) {
        currentTheme = preference;
        const effectiveTheme = getEffectiveTheme(preference);
        const painel = document.getElementById('neuron-notificacao-painel');
        const trigger = document.getElementById('neuron-notificacao-trigger');

        if (painel) {
            if (effectiveTheme === 'dark') {
                painel.classList.add('neuron-dark');
            } else {
                painel.classList.remove('neuron-dark');
            }
        }

        if (trigger) {
            if (effectiveTheme === 'dark') {
                trigger.classList.add('neuron-dark');
            } else {
                trigger.classList.remove('neuron-dark');
            }
        }
    }

    async function loadThemePreference() {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY_THEME);
            const preference = result[STORAGE_KEY_THEME] || 'system';
            applyTheme(preference);
        } catch (error) {
            console.error(`Neuron (${SCRIPT_ID}): Error loading theme preference:`, error);
            applyTheme('system');
        }
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentTheme === 'system') {
            applyTheme('system');
        }
    });

    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get([CONFIG_KEY, STORAGE_KEY_FILTRO_USUARIO]);
        config = result[CONFIG_KEY] || {};
        // Carrega a preferência do usuário. Se não existir, mantém o padrão (true).
        if (result[STORAGE_KEY_FILTRO_USUARIO] !== undefined) {
            filtroUsuarioAtivado = result[STORAGE_KEY_FILTRO_USUARIO];
        }
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }
    
    function getUsuarioLogado() {
        const elementoUsuario = document.getElementById('ConteudoForm_labelUsuario');
        return elementoUsuario ? elementoUsuario.textContent.trim() : null;
    }

    function criarUI() {
        if (document.getElementById('neuron-notificacao-trigger')) return;
        const trigger = document.createElement('div');
        trigger.id = 'neuron-notificacao-trigger';
        trigger.title = 'Abrir Notificações';
        trigger.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/></svg>`;

        const contador = document.createElement('span');
        contador.id = 'neuron-notificacao-contador';
        contador.className = 'neuron-contador';
        contador.style.display = 'none';
        trigger.appendChild(contador);
        document.body.appendChild(trigger);

        const painel = document.createElement('div');
        painel.id = 'neuron-notificacao-painel';
        painel.innerHTML = `
            <div class="neuron-painel-header">
                <div class="neuron-header-content">
                    <h4>Notificações</h4>
                    <div class="neuron-filtro-wrapper" title="Alternar entre 'Minhas Demandas' e 'Todas as Demandas'">
                        <label class="neuron-switch">
                            <input type="checkbox" id="neuron-filtro-usuario-toggle">
                            <span class="neuron-slider round"></span>
                        </label>
                        <span id="neuron-filtro-label">Minhas Demandas</span>
                    </div>
                </div>
                <button id="neuron-painel-close" class="neuron-painel-close" title="Fechar">&times;</button>
            </div>
            <div id="neuron-painel-body" class="neuron-painel-body">
                <p>A carregar dados...</p>
            </div>
            <div class="neuron-painel-footer">
                <button id="neuron-btn-atualizar" class="neuron-footer-btn neuron-btn-atualizar">Atualizar</button>
                <button id="neuron-btn-limpar" class="neuron-footer-btn neuron-btn-limpar">Limpar Lista</button>
            </div>
            <div id="neuron-confirm-limpar" class="neuron-confirm-modal" style="display: none;">
                <p class="neuron-confirm-mensagem">Atenção! Esta ação é irreversível.<br>Deseja mesmo limpar toda a lista?</p>
                <div class="neuron-confirm-botoes">
                    <button id="neuron-confirm-limpar-sim" class="neuron-btn neuron-btn-perigo">Sim, Limpar</button>
                    <button id="neuron-confirm-limpar-nao" class="neuron-btn">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(painel);
    }
    
    function removerUI() {
        document.getElementById('neuron-notificacao-trigger')?.remove();
        document.getElementById('neuron-notificacao-painel')?.remove();
    }

    function exibirToastAviso(mensagem) {
        document.querySelector('.neuron-toast-aviso')?.remove();
        const toast = document.createElement('div');
        toast.className = 'neuron-toast-aviso';
        toast.textContent = mensagem;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    async function limparLista() {
        memoriaDeDemandas = {};
        demandasConcluidas = new Set();
        try {
            await NeuronDB.clearAll();
        } catch (error) {
            console.error(`Neuron (${SCRIPT_ID}): Error clearing data:`, error);
        }
        renderizarPainel();
        fecharConfirmacaoLimpar();
    }

    function fecharConfirmacaoLimpar() {
        const modal = document.getElementById('neuron-confirm-limpar');
        if (modal) modal.style.display = 'none';
    }

    async function inicializarDadosNotificacoes() {
        await carregarConfiguracoes();
        try {
            // Initialize NeuronDB and run migration if needed
            await NeuronDB.init();

            // Check if migration is needed (first time using IndexedDB)
            if (await NeuronDB.needsMigration()) {
                await NeuronDB.migrateFromChromeStorage();
            }

            // Load data from IndexedDB
            const [demandas, concluidas] = await Promise.all([
                NeuronDB.getAllDemandasAsObject(),
                NeuronDB.getConcluidas()
            ]);

            memoriaDeDemandas = demandas;
            demandasConcluidas = concluidas;
            dbInitialized = true;

            renderizarPainel();
        } catch (error) {
            console.error(`Neuron (${SCRIPT_ID}): Error loading data from IndexedDB:`, error);
            // Fallback: initialize with empty data
            memoriaDeDemandas = {};
            demandasConcluidas = new Set();
            renderizarPainel();
        }
    }

    const handleDadosExtraidos = async (event) => {
        if (!event.detail || !Array.isArray(event.detail)) return;

        const newDemandas = [];
        event.detail.forEach(demanda => {
            if (demanda && demanda.numero) {
                memoriaDeDemandas[demanda.numero] = demanda;
                newDemandas.push(demanda);
            }
        });

        // Save to IndexedDB
        if (newDemandas.length > 0) {
            try {
                await NeuronDB.saveDemandas(newDemandas);
            } catch (error) {
                console.error(`Neuron (${SCRIPT_ID}): Error saving demandas:`, error);
            }
        }

        renderizarPainel();
    };

    const handleUiInteraction = (event) => {
        const target = event.target;
        const targetId = target.id;

        // Handle filter toggle
        if (targetId === 'neuron-filtro-usuario-toggle') {
            filtroUsuarioAtivado = target.checked;
            chrome.storage.local.set({ [STORAGE_KEY_FILTRO_USUARIO]: filtroUsuarioAtivado });
            renderizarPainel();
            return;
        }

        if (targetId === 'neuron-notificacao-trigger' || target.closest('#neuron-notificacao-trigger')) {
            const painel = document.getElementById('neuron-notificacao-painel');
            if(painel) painel.style.display = painel.style.display === 'flex' ? 'none' : 'flex';
        } else if (targetId === 'neuron-painel-close') {
            const painel = document.getElementById('neuron-notificacao-painel');
            if(painel) painel.style.display = 'none';
        } else if (targetId === 'neuron-btn-atualizar') {
             document.dispatchEvent(new CustomEvent('NEURON_SOLICITAR_ATUALIZACAO'));
             target.innerText = 'A atualizar...';
             setTimeout(() => { if(target) target.innerText = 'Atualizar'; }, 1500);
        } else if (targetId === 'neuron-btn-limpar') {
            const modal = document.getElementById('neuron-confirm-limpar');
            if (modal) modal.style.display = 'flex';
        } else if (targetId === 'neuron-confirm-limpar-sim') {
            limparLista();
        } else if (targetId === 'neuron-confirm-limpar-nao') {
            fecharConfirmacaoLimpar();
        }

        const grupoHeader = target.closest('.neuron-grupo-header');
        if (grupoHeader) {
            grupoHeader.classList.toggle('open');
            grupoHeader.nextElementSibling?.classList.toggle('collapsed');
        }
    };

    function renderizarPainel() {
        const corpoDoPainel = document.getElementById('neuron-painel-body');
        if (!corpoDoPainel) return;

        // Update toggle visual state
        const toggle = document.getElementById('neuron-filtro-usuario-toggle');
        const label = document.getElementById('neuron-filtro-label');
        if (toggle) toggle.checked = filtroUsuarioAtivado;
        if (label) label.textContent = filtroUsuarioAtivado ? 'Minhas Demandas' : 'Todas as Demandas';

        const usuarioLogado = getUsuarioLogado();

        const notificacoesRelevantes = Object.values(memoriaDeDemandas).filter(demanda => {
            let isDoUsuario = true;
            if (filtroUsuarioAtivado) {
                if (!usuarioLogado || !Array.isArray(demanda.responsaveis) || demanda.responsaveis.length === 0) {
                    isDoUsuario = false;
                } else {
                    isDoUsuario = demanda.responsaveis.some(
                        resp => resp && typeof resp === 'string' && resp.trim().toLowerCase() === usuarioLogado.trim().toLowerCase()
                    );
                }
            }
            return isDoUsuario && isNotificacaoRelevante(demanda);
        });

        const criarGrupoHTML = (titulo, lista, detalheExtra = null) => {
            if (lista.length === 0) return '';
            let grupoHtml = `<div class="neuron-grupo-header"><h5>${titulo} (${lista.length})</h5></div>`;
            grupoHtml += `<div class="neuron-grupo-lista collapsed">`;
            lista.forEach(d => {
                const isDone = demandasConcluidas.has(d.numero);
                let detalheTexto = (detalheExtra === 'prazo' && d.diasRestantes != null) ? `<span class="neuron-link-detalhe">Prazo em ${escapeHtml(d.diasRestantes)} dias</span>` : '';
                grupoHtml += `
                    <div class="neuron-item-notificacao ${isDone ? 'done' : ''}" data-numero="${escapeHtml(d.numero)}">
                        <div class="neuron-link-wrapper" data-href="${escapeHtml(d.href || '#')}"><span class="neuron-link-numero">${escapeHtml(d.numero)}</span>${detalheTexto}</div>
                        <input type="checkbox" class="neuron-done-check" title="Marcar como concluído" ${isDone ? 'checked' : ''}>
                    </div>`;
            });
            return grupoHtml + '</div>';
        };

        const prazosCurtos = notificacoesRelevantes.map(d => ({ ...d, diasRestantes: calcularDiasRestantes(d.prazo) })).filter(d => d.diasRestantes !== null && d.diasRestantes <= 2).sort((a, b) => a.diasRestantes - b.diasRestantes);
        
        let corpoHTML = 
            criarGrupoHTML('Prazos Curtos (<= 2 dias)', prazosCurtos, 'prazo') +
            criarGrupoHTML('Possíveis Respondidas', notificacoesRelevantes.filter(d => d.possivelRespondida)) +
            criarGrupoHTML('Com Observação', notificacoesRelevantes.filter(d => d.possivelobservacao)) +
            criarGrupoHTML('Demandas Prorrogadas', notificacoesRelevantes.filter(d => d.situacao.includes('Prorrogada'))) +
            criarGrupoHTML('Demandas Complementadas', notificacoesRelevantes.filter(d => d.situacao.includes('Complementada')));

        if (!corpoHTML) {
             corpoHTML = `<p>Nenhuma notificação relevante encontrada.</p>`;
        }

        corpoDoPainel.innerHTML = corpoHTML;

        adicionarEventListenersAosItens();
        atualizarContadorEIcone();
    }

    function adicionarEventListenersAosItens() {
        document.querySelectorAll('.neuron-item-notificacao').forEach(item => {
            const numero = item.dataset.numero;
            const linkWrapper = item.querySelector('.neuron-link-wrapper');
            linkWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const href = linkWrapper.dataset.href;
                if (!href || href === '#') return;

                const urlRelativo = href.split('.gov.br')[1];
                const elementoNaPagina = urlRelativo ? document.querySelector(`a[navigateurl="${urlRelativo}"]`) : null;
                
                if (elementoNaPagina) {
                    const linha = elementoNaPagina.closest('.row');
                    if (linha) {
                        elementoNaPagina.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const originalColor = linha.style.backgroundColor;
                        linha.style.transition = 'background-color 0.3s ease-in-out';
                        linha.style.backgroundColor = '#fff3cd'; 
                        setTimeout(() => { linha.style.backgroundColor = originalColor || ''; }, 2500);
                    }
                } else {
                    exibirToastAviso(`Demanda ${numero} não encontrada. A abrir em nova aba.`);
                    setTimeout(() => window.open(href, 'noopener,noreferrer'), 1000);
                }
            });

            const checkbox = item.querySelector('.neuron-done-check');
            checkbox.addEventListener('change', async (e) => {
                const isDone = e.target.checked;
                if (isDone) {
                    demandasConcluidas.add(numero);
                    item.classList.add('done');
                } else {
                    demandasConcluidas.delete(numero);
                    item.classList.remove('done');
                }

                // Save to IndexedDB
                try {
                    await NeuronDB.markConcluida(numero, isDone);
                } catch (error) {
                    console.error(`Neuron (${SCRIPT_ID}): Error marking concluida:`, error);
                }

                atualizarContadorEIcone();
            });
        });
    }

    function atualizarContadorEIcone() {
        const contador = document.getElementById('neuron-notificacao-contador');
        const trigger = document.getElementById('neuron-notificacao-trigger');
        if (!contador || !trigger) return;
        
        const usuarioLogado = getUsuarioLogado();
        const naoConcluidas = Object.values(memoriaDeDemandas).filter(d => {
            let isDoUsuario = true;
            if (filtroUsuarioAtivado) {
                if (!usuarioLogado || !Array.isArray(d.responsaveis) || d.responsaveis.length === 0) return false;
                isDoUsuario = d.responsaveis.some(
                    resp => resp && typeof resp === 'string' && resp.trim().toLowerCase() === usuarioLogado.trim().toLowerCase()
                );
            }
            return isDoUsuario && isNotificacaoRelevante(d) && !demandasConcluidas.has(d.numero);
        });

        const total = naoConcluidas.length;
        trigger.className = '';
        if (total > 0) {
            contador.innerText = total > 99 ? '99+' : total;
            contador.style.display = 'block';
            trigger.classList.add('pulsating');
            if (total > 5) {
                trigger.classList.add('status-danger');
            } else {
                trigger.classList.add('status-warning');
            }
        } else {
            contador.style.display = 'none';
            trigger.classList.add('status-ok');
        }
    }

    function isNotificacaoRelevante(demanda) {
        if (!demanda || typeof demanda !== 'object') return false;

        const situacao = demanda.situacao || '';
        const diasRestantes = calcularDiasRestantes(demanda.prazo);

        return (diasRestantes !== null && diasRestantes <= 2) || 
               situacao.includes('Prorrogada') || 
               situacao.includes('Complementada') ||
               demanda.possivelRespondida ||
               demanda.possivelobservacao;
    }

    function calcularDiasRestantes(dataString) {
        if (!dataString) return null;
        const partes = dataString.split('/');
        if (partes.length !== 3) return null;
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const ano = parseInt(partes[2], 10);
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
        const dataAlvo = new Date(ano, mes, dia);
        if (isNaN(dataAlvo.getTime())) return null;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        return Math.ceil((dataAlvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    }

    async function ativarFuncionalidade() {
        if (isFeatureActive) return;
        await carregarConfiguracoes();
        criarUI();
        await loadThemePreference(); // Apply theme after UI is created
        document.addEventListener('click', handleUiInteraction);
        document.addEventListener('change', handleUiInteraction);
        document.addEventListener('dadosExtraidosNeuron', handleDadosExtraidos);
        inicializarDadosNotificacoes();
        isFeatureActive = true;
    }

    function desativarFuncionalidade() {
        if (!isFeatureActive) return;
        removerUI();
        document.removeEventListener('click', handleUiInteraction);
        document.removeEventListener('change', handleUiInteraction);
        document.removeEventListener('dadosExtraidosNeuron', handleDadosExtraidos);
        isFeatureActive = false;
    }

    async function verificarEstadoAtualEAgir() {
        try {
            await carregarConfiguracoes();
            if (isScriptAtivo()) {
                ativarFuncionalidade();
            } else {
                desativarFuncionalidade();
            }
        } catch (error) {
            console.error(`Neuron (${SCRIPT_ID}): Erro fatal durante a inicialização!`, error);
            desativarFuncionalidade();
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes[CONFIG_KEY] || changes[STORAGE_KEY_FILTRO_USUARIO]) {
                verificarEstadoAtualEAgir();
            }
            // React to theme changes from popup/options
            if (changes[STORAGE_KEY_THEME] && isFeatureActive) {
                applyTheme(changes[STORAGE_KEY_THEME].newValue || 'system');
            }
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        await verificarEstadoAtualEAgir();
    }
    init();
})(); 