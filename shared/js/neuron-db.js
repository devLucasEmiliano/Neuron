/**
 * NeuronDB - chrome.storage.local Service Layer for Neuron Extension
 * Manages demand data storage using chrome.storage.local with in-memory cache
 */

var NeuronDB = NeuronDB || (function () {
    'use strict';

    // Storage keys mapping (replaces IndexedDB object stores)
    const KEY_DEMANDAS = 'neuron_demandas';       // object keyed by numero
    const KEY_CONCLUIDAS = 'neuron_concluidas';     // array of numeros
    const KEY_METADATA = 'neuron_metadata';         // object key-value
    const KEY_CONFIG = 'neuron_config';             // object key-value
    const KEY_PREFERENCES = 'neuron_preferences';   // object key-value

    // In-memory cache
    let cache = {
        [KEY_DEMANDAS]: {},
        [KEY_CONCLUIDAS]: [],
        [KEY_METADATA]: {},
        [KEY_CONFIG]: {},
        [KEY_PREFERENCES]: {}
    };

    let initialized = false;

    /**
     * Check if the extension context is still valid
     */
    function isContextValid() {
        try {
            return !!chrome.runtime && !!chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    /**
     * Safe wrapper for chrome.storage.local.set that handles invalidated context
     */
    async function safeStorageSet(data) {
        if (!isContextValid()) {
            return;
        }
        try {
            await chrome.storage.local.set(data);
        } catch (e) {
            if (e && e.message && e.message.includes('Extension context invalidated')) {
                return;
            }
            throw e;
        }
    }

    /**
     * Parse DD/MM/YYYY date string to timestamp
     */
    function parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        const [d, m, y] = parts.map(Number);
        if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
        return new Date(y, m - 1, d).getTime();
    }

    /**
     * Calculate days remaining until deadline
     */
    function calcularDiasRestantes(prazo) {
        const prazoTimestamp = parseDate(prazo);
        if (!prazoTimestamp) return null;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return Math.ceil((prazoTimestamp - hoje.getTime()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Initialize the database - pre-loads all data from chrome.storage.local into cache
     */
    async function init() {
        if (initialized) return;

        if (!isContextValid()) {
            initialized = true;
            return;
        }

        try {
            const data = await chrome.storage.local.get([
                KEY_DEMANDAS, KEY_CONCLUIDAS, KEY_METADATA, KEY_CONFIG, KEY_PREFERENCES
            ]);

            cache[KEY_DEMANDAS] = data[KEY_DEMANDAS] || {};
            cache[KEY_CONCLUIDAS] = data[KEY_CONCLUIDAS] || [];
            cache[KEY_METADATA] = data[KEY_METADATA] || {};
            cache[KEY_CONFIG] = data[KEY_CONFIG] || {};
            cache[KEY_PREFERENCES] = data[KEY_PREFERENCES] || {};
        } catch (e) {
            if (!(e && e.message && e.message.includes('Extension context invalidated'))) {
                throw e;
            }
        }

        initialized = true;
    }

    /**
     * Prepare demanda record with computed timestamps
     */
    function prepareDemanda(demanda) {
        return {
            ...demanda,
            prazoTimestamp: parseDate(demanda.prazo),
            cadastroTimestamp: parseDate(demanda.dataCadastro)
        };
    }

    /**
     * Save a single demanda
     */
    async function saveDemanda(demanda) {
        await init();
        const record = prepareDemanda(demanda);
        cache[KEY_DEMANDAS][record.numero] = record;
        await safeStorageSet({ [KEY_DEMANDAS]: cache[KEY_DEMANDAS] });
    }

    /**
     * Save multiple demandas in a transaction
     */
    async function saveDemandas(demandas) {
        if (!demandas || demandas.length === 0) return;

        await init();
        demandas.forEach(d => {
            const record = prepareDemanda(d);
            cache[KEY_DEMANDAS][record.numero] = record;
        });
        await safeStorageSet({ [KEY_DEMANDAS]: cache[KEY_DEMANDAS] });
    }

    /**
     * Save demandas from object format (keyed by numero)
     */
    async function saveDemandasFromObject(demandasObj) {
        if (!demandasObj || typeof demandasObj !== 'object') return;
        const demandas = Object.values(demandasObj);
        await saveDemandas(demandas);
    }

    /**
     * Get a single demanda by numero
     */
    async function getDemanda(numero) {
        await init();
        return cache[KEY_DEMANDAS][numero] || undefined;
    }

    /**
     * Get all demandas
     */
    async function getAllDemandas() {
        await init();
        return Object.values(cache[KEY_DEMANDAS]);
    }

    /**
     * Get all demandas as object (keyed by numero)
     */
    async function getAllDemandasAsObject() {
        await init();
        return { ...cache[KEY_DEMANDAS] };
    }

    /**
     * Delete a demanda
     */
    async function deleteDemanda(numero) {
        await init();
        delete cache[KEY_DEMANDAS][numero];
        await safeStorageSet({ [KEY_DEMANDAS]: cache[KEY_DEMANDAS] });
    }

    /**
     * Clear all demandas
     */
    async function clearDemandas() {
        await init();
        cache[KEY_DEMANDAS] = {};
        await safeStorageSet({ [KEY_DEMANDAS]: cache[KEY_DEMANDAS] });
    }

    /**
     * Mark a demanda as concluida (completed)
     */
    async function markConcluida(numero, isDone = true) {
        await init();
        if (isDone) {
            if (!cache[KEY_CONCLUIDAS].includes(numero)) {
                cache[KEY_CONCLUIDAS].push(numero);
            }
        } else {
            cache[KEY_CONCLUIDAS] = cache[KEY_CONCLUIDAS].filter(n => n !== numero);
        }
        await safeStorageSet({ [KEY_CONCLUIDAS]: cache[KEY_CONCLUIDAS] });
    }

    /**
     * Check if a demanda is concluida
     */
    async function isConcluida(numero) {
        await init();
        return cache[KEY_CONCLUIDAS].includes(numero);
    }

    /**
     * Get all concluidas as a Set of numeros
     */
    async function getConcluidas() {
        await init();
        return new Set(cache[KEY_CONCLUIDAS]);
    }

    /**
     * Get concluidas as array
     */
    async function getConcluidasArray() {
        await init();
        return [...cache[KEY_CONCLUIDAS]];
    }

    /**
     * Clear all concluidas
     */
    async function clearConcluidas() {
        await init();
        cache[KEY_CONCLUIDAS] = [];
        await safeStorageSet({ [KEY_CONCLUIDAS]: cache[KEY_CONCLUIDAS] });
    }

    /**
     * Clear both demandas and concluidas
     */
    async function clearAll() {
        await init();
        cache[KEY_DEMANDAS] = {};
        cache[KEY_CONCLUIDAS] = [];
        await safeStorageSet({
            [KEY_DEMANDAS]: cache[KEY_DEMANDAS],
            [KEY_CONCLUIDAS]: cache[KEY_CONCLUIDAS]
        });
    }

    /**
     * Get metadata value
     */
    async function getMetadata(key) {
        await init();
        return cache[KEY_METADATA][key] !== undefined ? cache[KEY_METADATA][key] : null;
    }

    /**
     * Set metadata value
     */
    async function setMetadata(key, value) {
        await init();
        cache[KEY_METADATA][key] = value;
        await safeStorageSet({ [KEY_METADATA]: cache[KEY_METADATA] });
    }

    /**
     * Get a config value by key
     */
    async function getConfig(key) {
        await init();
        return cache[KEY_CONFIG][key] !== undefined ? cache[KEY_CONFIG][key] : null;
    }

    /**
     * Set a config value
     */
    async function setConfig(key, value) {
        await init();
        cache[KEY_CONFIG][key] = value;
        await safeStorageSet({ [KEY_CONFIG]: cache[KEY_CONFIG] });
    }

    /**
     * Get a preference value by key
     */
    async function getPreference(key) {
        await init();
        return cache[KEY_PREFERENCES][key] !== undefined ? cache[KEY_PREFERENCES][key] : null;
    }

    /**
     * Set a preference value
     */
    async function setPreference(key, value) {
        await init();
        cache[KEY_PREFERENCES][key] = value;
        await safeStorageSet({ [KEY_PREFERENCES]: cache[KEY_PREFERENCES] });
    }

    /**
     * Get dashboard statistics
     */
    async function getStats() {
        await init();
        const demandas = Object.values(cache[KEY_DEMANDAS]);
        const concluidas = new Set(cache[KEY_CONCLUIDAS]);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const hojeTs = hoje.getTime();

        let prazosCurtos = 0;
        let atrasadas = 0;
        let prorrogadas = 0;
        let complementadas = 0;
        let possivelRespondida = 0;
        let possivelobservacao = 0;
        const byResponsavel = {};
        const byPrazoRange = {
            atrasadas: 0,      // < 0 days
            urgentes: 0,       // 0-2 days
            proximas: 0,       // 3-7 days
            normais: 0         // > 7 days
        };

        demandas.forEach(d => {
            // Calculate remaining days
            const diasRestantes = d.prazoTimestamp
                ? Math.ceil((d.prazoTimestamp - hojeTs) / (1000 * 60 * 60 * 24))
                : null;

            // Count by deadline range
            if (diasRestantes !== null) {
                if (diasRestantes < 0) {
                    atrasadas++;
                    byPrazoRange.atrasadas++;
                } else if (diasRestantes <= 2) {
                    prazosCurtos++;
                    byPrazoRange.urgentes++;
                } else if (diasRestantes <= 7) {
                    byPrazoRange.proximas++;
                } else {
                    byPrazoRange.normais++;
                }
            }

            // Count by status
            const situacao = d.situacao || '';
            if (situacao.includes('Prorrogada')) prorrogadas++;
            if (situacao.includes('Complementada')) complementadas++;

            // Count flags
            if (d.possivelRespondida) possivelRespondida++;
            if (d.possivelobservacao) possivelobservacao++;

            // Count by responsavel
            (d.responsaveis || []).forEach(r => {
                if (r && r.trim()) {
                    const key = r.trim();
                    byResponsavel[key] = (byResponsavel[key] || 0) + 1;
                }
            });
        });

        const total = demandas.length;
        const concluidasCount = concluidas.size;
        const pendentes = total - concluidasCount;
        const taxaConclusao = total > 0 ? Math.round((concluidasCount / total) * 100) : 0;

        // Get top 10 responsaveis
        const topResponsaveis = Object.entries(byResponsavel)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        return {
            total,
            pendentes,
            concluidas: concluidasCount,
            taxaConclusao,
            prazosCurtos,
            atrasadas,
            prorrogadas,
            complementadas,
            possivelRespondida,
            possivelobservacao,
            byResponsavel,
            topResponsaveis,
            byPrazoRange,
            demandas,
            concluidasSet: concluidas
        };
    }

    /**
     * Check if demanda is relevant for notifications
     */
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

    /**
     * Get relevant notifications count for a user
     */
    async function getNotificationCount(usuarioLogado, filtroUsuarioAtivado = true) {
        const [demandas, concluidas] = await Promise.all([
            getAllDemandas(),
            getConcluidas()
        ]);

        const relevantes = demandas.filter(d => {
            // Check if belongs to user
            if (filtroUsuarioAtivado && usuarioLogado) {
                if (!Array.isArray(d.responsaveis) || d.responsaveis.length === 0) {
                    return false;
                }
                const isDoUsuario = d.responsaveis.some(
                    resp => resp && typeof resp === 'string' &&
                            resp.trim().toLowerCase() === usuarioLogado.trim().toLowerCase()
                );
                if (!isDoUsuario) return false;
            }

            // Check if relevant and not completed
            return isNotificacaoRelevante(d) && !concluidas.has(d.numero);
        });

        return relevantes.length;
    }

    /**
     * Update a specific cache key (used by NeuronSync for cross-context updates)
     */
    function _updateCache(key, value) {
        if (cache.hasOwnProperty(key)) {
            cache[key] = value;
        }
    }

    // Public API
    return {
        init,
        parseDate,
        calcularDiasRestantes,

        // Demandas
        saveDemanda,
        saveDemandas,
        saveDemandasFromObject,
        getDemanda,
        getAllDemandas,
        getAllDemandasAsObject,
        deleteDemanda,
        clearDemandas,

        // Concluidas
        markConcluida,
        isConcluida,
        getConcluidas,
        getConcluidasArray,
        clearConcluidas,

        // Clear all
        clearAll,

        // Metadata
        getMetadata,
        setMetadata,

        // Config
        getConfig,
        setConfig,

        // Preferences
        getPreference,
        setPreference,

        // Statistics
        getStats,
        isNotificacaoRelevante,
        getNotificationCount,

        // Internal - used by NeuronSync for cache coherence
        _updateCache
    };
})();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuronDB;
}
