/**
 * NeuronDB - chrome.storage.local Service Layer for Neuron Extension
 * Manages demand data storage using chrome.storage.local with in-memory cache
 */

var NeuronDB = NeuronDB || (function () {
    'use strict';

    // Global storage keys (not per-site)
    const KEY_CONFIG = 'neuron_config';             // object key-value
    const KEY_PREFERENCES = 'neuron_preferences';   // object key-value

    // Per-site storage key builders
    let siteAlias = 'producao';

    function keyDemandas() { return 'neuron_' + siteAlias + '_demandas'; }
    function keyConcluidas() { return 'neuron_' + siteAlias + '_concluidas'; }
    function keyMetadata() { return 'neuron_' + siteAlias + '_metadata'; }

    // In-memory cache
    let cache = {
        demandas: {},
        concluidas: [],
        metadata: {},
        config: {},
        preferences: {}
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
     * @param {string} [newSiteAlias] - Site alias to use for per-site keys. Defaults to 'producao'.
     */
    async function init(newSiteAlias) {
        // Only the first explicit call (with siteAlias) sets the site.
        // Internal await init() calls pass no argument and should not override.
        if (newSiteAlias && newSiteAlias !== siteAlias) {
            siteAlias = newSiteAlias;
            initialized = false;
        } else if (newSiteAlias && !initialized) {
            siteAlias = newSiteAlias;
        }

        if (initialized) return;

        if (!isContextValid()) {
            initialized = true;
            return;
        }

        try {
            const kDemandas = keyDemandas();
            const kConcluidas = keyConcluidas();
            const kMetadata = keyMetadata();

            const data = await chrome.storage.local.get([
                kDemandas, kConcluidas, kMetadata, KEY_CONFIG, KEY_PREFERENCES
            ]);

            cache.demandas = data[kDemandas] || {};
            cache.concluidas = data[kConcluidas] || [];
            cache.metadata = data[kMetadata] || {};
            cache.config = data[KEY_CONFIG] || {};
            cache.preferences = data[KEY_PREFERENCES] || {};
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
        cache.demandas[record.numero] = record;
        await safeStorageSet({ [keyDemandas()]: cache.demandas });
    }

    /**
     * Save multiple demandas in a transaction
     */
    async function saveDemandas(demandas) {
        if (!demandas || demandas.length === 0) return;

        await init();
        demandas.forEach(d => {
            const record = prepareDemanda(d);
            cache.demandas[record.numero] = record;
        });
        await safeStorageSet({ [keyDemandas()]: cache.demandas });
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
        return cache.demandas[numero] || undefined;
    }

    /**
     * Get all demandas
     */
    async function getAllDemandas() {
        await init();
        return Object.values(cache.demandas);
    }

    /**
     * Get all demandas as object (keyed by numero)
     */
    async function getAllDemandasAsObject() {
        await init();
        return { ...cache.demandas };
    }

    /**
     * Delete a demanda
     */
    async function deleteDemanda(numero) {
        await init();
        delete cache.demandas[numero];
        await safeStorageSet({ [keyDemandas()]: cache.demandas });
    }

    /**
     * Clear all demandas
     */
    async function clearDemandas() {
        await init();
        cache.demandas = {};
        await safeStorageSet({ [keyDemandas()]: cache.demandas });
    }

    /**
     * Mark a demanda as concluida (completed)
     */
    async function markConcluida(numero, isDone = true) {
        await init();
        if (isDone) {
            if (!cache.concluidas.includes(numero)) {
                cache.concluidas.push(numero);
            }
        } else {
            cache.concluidas = cache.concluidas.filter(n => n !== numero);
        }
        await safeStorageSet({ [keyConcluidas()]: cache.concluidas });
    }

    /**
     * Check if a demanda is concluida
     */
    async function isConcluida(numero) {
        await init();
        return cache.concluidas.includes(numero);
    }

    /**
     * Get all concluidas as a Set of numeros
     */
    async function getConcluidas() {
        await init();
        return new Set(cache.concluidas);
    }

    /**
     * Get concluidas as array
     */
    async function getConcluidasArray() {
        await init();
        return [...cache.concluidas];
    }

    /**
     * Clear all concluidas
     */
    async function clearConcluidas() {
        await init();
        cache.concluidas = [];
        await safeStorageSet({ [keyConcluidas()]: cache.concluidas });
    }

    /**
     * Clear both demandas and concluidas
     */
    async function clearAll() {
        await init();
        cache.demandas = {};
        cache.concluidas = [];
        await safeStorageSet({
            [keyDemandas()]: cache.demandas,
            [keyConcluidas()]: cache.concluidas
        });
    }

    /**
     * Get metadata value
     */
    async function getMetadata(key) {
        await init();
        return cache.metadata[key] !== undefined ? cache.metadata[key] : null;
    }

    /**
     * Set metadata value
     */
    async function setMetadata(key, value) {
        await init();
        cache.metadata[key] = value;
        await safeStorageSet({ [keyMetadata()]: cache.metadata });
    }

    /**
     * Get a config value by key
     */
    async function getConfig(key) {
        await init();
        return cache.config[key] !== undefined ? cache.config[key] : null;
    }

    /**
     * Set a config value
     */
    async function setConfig(key, value) {
        await init();
        cache.config[key] = value;
        await safeStorageSet({ [KEY_CONFIG]: cache.config });
    }

    /**
     * Get a preference value by key
     */
    async function getPreference(key) {
        await init();
        return cache.preferences[key] !== undefined ? cache.preferences[key] : null;
    }

    /**
     * Set a preference value
     */
    async function setPreference(key, value) {
        await init();
        cache.preferences[key] = value;
        await safeStorageSet({ [KEY_PREFERENCES]: cache.preferences });
    }

    /**
     * Get dashboard statistics
     */
    async function getStats() {
        await init();
        const demandas = Object.values(cache.demandas);
        const concluidas = new Set(cache.concluidas);

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
     * Update a specific cache entry from a storage key (used by NeuronSync for cross-context updates)
     */
    function _updateCache(storageKey, value) {
        // Map storage keys to cache property names
        if (storageKey === keyDemandas()) {
            cache.demandas = value;
        } else if (storageKey === keyConcluidas()) {
            cache.concluidas = value;
        } else if (storageKey === keyMetadata()) {
            cache.metadata = value;
        } else if (storageKey === KEY_CONFIG) {
            cache.config = value;
        } else if (storageKey === KEY_PREFERENCES) {
            cache.preferences = value;
        }
    }

    /**
     * Switch to a different site context and reload cache from storage
     * @param {string} newSiteAlias - The site alias to switch to ('producao', 'treinamento', 'homologacao')
     */
    async function switchSite(newSiteAlias) {
        if (!newSiteAlias) return;
        initialized = false;
        siteAlias = newSiteAlias;
        await init(newSiteAlias);
    }

    /**
     * Get the current site alias (public API)
     * @returns {string} The current site alias
     */
    function getCurrentSite() {
        return siteAlias;
    }

    /**
     * Get the current site alias (internal, used by NeuronSync)
     */
    function _getCurrentSiteAlias() {
        return siteAlias;
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

        // Site management
        switchSite,
        getCurrentSite,

        // Internal - used by NeuronSync for cache coherence
        _updateCache,
        _getCurrentSiteAlias
    };
})();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuronDB;
}
