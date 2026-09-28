/**
 * NeuronDB - chrome.storage.local Service Layer for Neuron Extension
 * Manages demand data storage using chrome.storage.local with in-memory cache
 */

import { browser } from 'wxt/browser';
import type {
    ConcluidasStorageKey,
    ConfigBucket,
    DashboardStats,
    Demanda,
    DemandaStored,
    DemandasStorageKey,
    MetadataStorageKey,
    Preferences,
    SiteAlias,
    SiteMetadata,
    StorageSchema
} from './types';

// Global storage keys (not per-site)
const KEY_CONFIG = 'neuron_config';             // object key-value
const KEY_PREFERENCES = 'neuron_preferences';   // object key-value

// Per-site storage key builders
let siteAlias: SiteAlias = 'producao';

function keyDemandas(): DemandasStorageKey { return `neuron_${siteAlias}_demandas`; }
function keyConcluidas(): ConcluidasStorageKey { return `neuron_${siteAlias}_concluidas`; }
function keyMetadata(): MetadataStorageKey { return `neuron_${siteAlias}_metadata`; }

interface NeuronCache {
    demandas: Record<string, DemandaStored>;
    concluidas: string[];
    metadata: SiteMetadata;
    config: ConfigBucket;
    preferences: Preferences;
}

// In-memory cache
let cache: NeuronCache = {
    demandas: {},
    concluidas: [],
    metadata: {},
    config: {},
    preferences: {}
};

let initialized = false;

// In-flight init(): coalesces concurrent callers (each bundled entrypoint has
// its own NeuronDB instance and modules call getConfig() right after init()).
let initPromise: Promise<void> | null = null;

/**
 * Check if the error is the "Extension context invalidated" thrown by Chrome
 * after the extension is reloaded/updated while a content script is alive.
 */
function isContextInvalidatedError(e: unknown): boolean {
    return e instanceof Error && e.message.includes('Extension context invalidated');
}

/**
 * Check if the extension context is still valid
 */
function isContextValid(): boolean {
    try {
        return !!browser.runtime && !!browser.runtime.id;
    } catch (e) {
        return false;
    }
}

/**
 * Safe wrapper for chrome.storage.local.set that handles invalidated context
 */
async function safeStorageSet(data: Partial<StorageSchema>): Promise<void> {
    if (!isContextValid()) {
        return;
    }
    try {
        await browser.storage.local.set(data);
    } catch (e) {
        if (isContextInvalidatedError(e)) {
            return;
        }
        throw e;
    }
}

/**
 * Parse DD/MM/YYYY date string to timestamp
 */
function parseDate(dateStr: string | null | undefined): number | null {
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
function calcularDiasRestantes(prazo: string | null | undefined): number | null {
    const prazoTimestamp = parseDate(prazo);
    if (!prazoTimestamp) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((prazoTimestamp - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Load all data from chrome.storage.local into the cache (body of the legacy init).
 */
async function loadCache(): Promise<void> {
    if (!isContextValid()) {
        initialized = true;
        return;
    }

    try {
        const kDemandas = keyDemandas();
        const kConcluidas = keyConcluidas();
        const kMetadata = keyMetadata();

        // Único ponto em que o payload bruto do storage é tipado como StorageSchema.
        const data = (await browser.storage.local.get([
            kDemandas, kConcluidas, kMetadata, KEY_CONFIG, KEY_PREFERENCES
        ])) as Partial<StorageSchema>;

        cache.demandas = data[kDemandas] || {};
        cache.concluidas = data[kConcluidas] || [];
        cache.metadata = data[kMetadata] || {};
        cache.config = data[KEY_CONFIG] || {};
        cache.preferences = data[KEY_PREFERENCES] || {};
    } catch (e) {
        if (!isContextInvalidatedError(e)) {
            throw e;
        }
    }

    initialized = true;
}

/**
 * Initialize the database - pre-loads all data from chrome.storage.local into cache
 * @param {string} [newSiteAlias] - Site alias to use for per-site keys. Defaults to 'producao'.
 */
async function init(newSiteAlias?: SiteAlias | null): Promise<void> {
    // Only the first explicit call (with siteAlias) sets the site.
    // Internal await init() calls pass no argument and should not override.
    if (newSiteAlias && newSiteAlias !== siteAlias) {
        siteAlias = newSiteAlias;
        initialized = false;
        initPromise = null;
    } else if (newSiteAlias && !initialized) {
        siteAlias = newSiteAlias;
    }

    if (initialized) return;

    if (!initPromise) {
        const pending = loadCache();
        initPromise = pending;
        pending.finally(() => {
            if (initPromise === pending) initPromise = null;
        }).catch(() => { /* rejeição observada pelos callers de init() */ });
    }

    return initPromise;
}

/**
 * Prepare demanda record with computed timestamps
 */
function prepareDemanda(demanda: Demanda): DemandaStored {
    return {
        ...demanda,
        prazoTimestamp: parseDate(demanda.prazo),
        cadastroTimestamp: parseDate(demanda.dataCadastro)
    };
}

/**
 * Save a single demanda
 */
async function saveDemanda(demanda: Demanda): Promise<void> {
    await init();
    const record = prepareDemanda(demanda);
    cache.demandas[record.numero] = record;
    await safeStorageSet({ [keyDemandas()]: cache.demandas });
}

/**
 * Save multiple demandas in a transaction
 */
async function saveDemandas(demandas: Demanda[] | null | undefined): Promise<void> {
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
async function saveDemandasFromObject(demandasObj: Record<string, Demanda> | null | undefined): Promise<void> {
    if (!demandasObj || typeof demandasObj !== 'object') return;
    const demandas = Object.values(demandasObj);
    await saveDemandas(demandas);
}

/**
 * Get a single demanda by numero
 */
async function getDemanda(numero: string): Promise<DemandaStored | undefined> {
    await init();
    return cache.demandas[numero] || undefined;
}

/**
 * Get all demandas
 */
async function getAllDemandas(): Promise<DemandaStored[]> {
    await init();
    return Object.values(cache.demandas);
}

/**
 * Get all demandas as object (keyed by numero)
 */
async function getAllDemandasAsObject(): Promise<Record<string, DemandaStored>> {
    await init();
    return { ...cache.demandas };
}

/**
 * Delete a demanda
 */
async function deleteDemanda(numero: string): Promise<void> {
    await init();
    delete cache.demandas[numero];
    await safeStorageSet({ [keyDemandas()]: cache.demandas });
}

/**
 * Clear all demandas
 */
async function clearDemandas(): Promise<void> {
    await init();
    cache.demandas = {};
    await safeStorageSet({ [keyDemandas()]: cache.demandas });
}

/**
 * Mark a demanda as concluida (completed)
 */
async function markConcluida(numero: string, isDone = true): Promise<void> {
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
async function isConcluida(numero: string): Promise<boolean> {
    await init();
    return cache.concluidas.includes(numero);
}

/**
 * Get all concluidas as a Set of numeros
 */
async function getConcluidas(): Promise<Set<string>> {
    await init();
    return new Set(cache.concluidas);
}

/**
 * Get concluidas as array
 */
async function getConcluidasArray(): Promise<string[]> {
    await init();
    return [...cache.concluidas];
}

/**
 * Clear all concluidas
 */
async function clearConcluidas(): Promise<void> {
    await init();
    cache.concluidas = [];
    await safeStorageSet({ [keyConcluidas()]: cache.concluidas });
}

/**
 * Clear both demandas and concluidas
 */
async function clearAll(): Promise<void> {
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
async function getMetadata<K extends keyof SiteMetadata>(key: K): Promise<Exclude<SiteMetadata[K], undefined> | null> {
    await init();
    // Cast: TS não relaciona `SiteMetadata[K] & {}` (estreitado) a `Exclude<SiteMetadata[K], undefined>`.
    return cache.metadata[key] !== undefined ? (cache.metadata[key] as Exclude<SiteMetadata[K], undefined>) : null;
}

/**
 * Set metadata value
 */
async function setMetadata<K extends keyof SiteMetadata>(key: K, value: NonNullable<SiteMetadata[K]>): Promise<void> {
    await init();
    cache.metadata[key] = value;
    await safeStorageSet({ [keyMetadata()]: cache.metadata });
}

/**
 * Get a config value by key
 */
async function getConfig<K extends keyof ConfigBucket>(key: K): Promise<Exclude<ConfigBucket[K], undefined> | null> {
    await init();
    // Cast: TS não relaciona `ConfigBucket[K] & {}` (estreitado) a `Exclude<ConfigBucket[K], undefined>`.
    return cache.config[key] !== undefined ? (cache.config[key] as Exclude<ConfigBucket[K], undefined>) : null;
}

/**
 * Set a config value
 */
async function setConfig<K extends keyof ConfigBucket>(key: K, value: NonNullable<ConfigBucket[K]>): Promise<void> {
    await init();
    cache.config[key] = value;
    await safeStorageSet({ [KEY_CONFIG]: cache.config });
}

/**
 * Get a preference value by key
 */
async function getPreference<K extends keyof Preferences>(key: K): Promise<Exclude<Preferences[K], undefined> | null> {
    await init();
    // Cast: TS não relaciona `Preferences[K] & {}` (estreitado) a `Exclude<Preferences[K], undefined>`.
    return cache.preferences[key] !== undefined ? (cache.preferences[key] as Exclude<Preferences[K], undefined>) : null;
}

/**
 * Set a preference value
 */
async function setPreference<K extends keyof Preferences>(key: K, value: NonNullable<Preferences[K]>): Promise<void> {
    await init();
    cache.preferences[key] = value;
    await safeStorageSet({ [KEY_PREFERENCES]: cache.preferences });
}

/**
 * Get dashboard statistics
 */
async function getStats(): Promise<DashboardStats> {
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
    const byResponsavel: Record<string, number> = {};
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
function isNotificacaoRelevante(demanda: Demanda | null | undefined): boolean {
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
async function getNotificationCount(usuarioLogado: string | null | undefined, filtroUsuarioAtivado = true): Promise<number> {
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
function _updateCache(storageKey: string, value: unknown): void {
    // Map storage keys to cache property names
    // Fronteira do storage: `value` é o newValue de storage.onChanged (unknown);
    // cada ramo confia no tipo que StorageSchema define para a chave.
    if (storageKey === keyDemandas()) {
        cache.demandas = value as NeuronCache['demandas'];
    } else if (storageKey === keyConcluidas()) {
        cache.concluidas = value as NeuronCache['concluidas'];
    } else if (storageKey === keyMetadata()) {
        cache.metadata = value as NeuronCache['metadata'];
    } else if (storageKey === KEY_CONFIG) {
        cache.config = value as NeuronCache['config'];
    } else if (storageKey === KEY_PREFERENCES) {
        cache.preferences = value as NeuronCache['preferences'];
    }
}

/**
 * Switch to a different site context and reload cache from storage
 * @param {string} newSiteAlias - The site alias to switch to ('producao', 'treinamento', 'homologacao')
 */
async function switchSite(newSiteAlias: SiteAlias | null | undefined): Promise<void> {
    if (!newSiteAlias) return;
    initialized = false;
    initPromise = null;
    siteAlias = newSiteAlias;
    await init(newSiteAlias);
}

/**
 * Get the current site alias (public API)
 * @returns {string} The current site alias
 */
function getCurrentSite(): SiteAlias {
    return siteAlias;
}

/**
 * Get the current site alias (internal, used by NeuronSync)
 */
function _getCurrentSiteAlias(): SiteAlias {
    return siteAlias;
}

// Public API
export const NeuronDB = {
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
