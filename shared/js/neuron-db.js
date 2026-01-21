/**
 * NeuronDB - IndexedDB Service Layer for Neuron Extension
 * Manages demand data storage with migration from chrome.storage.local
 */

const NeuronDB = (function () {
    'use strict';

    const DB_NAME = 'NeuronDB';
    const DB_VERSION = 1;
    const STORE_DEMANDAS = 'demandas';
    const STORE_CONCLUIDAS = 'concluidas';
    const STORE_METADATA = 'metadata';

    let dbInstance = null;
    let idbLib = null;

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
     * Initialize the idb library
     */
    async function loadIdb() {
        if (idbLib) return idbLib;

        // Try to get from global (UMD build - loaded via manifest or importScripts)
        if (typeof idb !== 'undefined') {
            idbLib = idb;
            return idbLib;
        }

        // Wait a bit for async script loading
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof idb !== 'undefined') {
            idbLib = idb;
            return idbLib;
        }

        throw new Error('NeuronDB: idb library not loaded. Ensure idb.min.js is loaded before neuron-db.js');
    }

    /**
     * Initialize the database
     */
    async function init() {
        if (dbInstance) return dbInstance;

        await loadIdb();

        dbInstance = await idbLib.openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Create demandas store
                if (!db.objectStoreNames.contains(STORE_DEMANDAS)) {
                    const demandasStore = db.createObjectStore(STORE_DEMANDAS, { keyPath: 'numero' });
                    demandasStore.createIndex('by_prazo', 'prazoTimestamp');
                    demandasStore.createIndex('by_situacao', 'situacao');
                    demandasStore.createIndex('by_dataCadastro', 'cadastroTimestamp');
                    demandasStore.createIndex('by_responsaveis', 'responsaveis', { multiEntry: true });
                    demandasStore.createIndex('by_possivelRespondida', 'possivelRespondida');
                    demandasStore.createIndex('by_possivelobservacao', 'possivelobservacao');
                }

                // Create concluidas store
                if (!db.objectStoreNames.contains(STORE_CONCLUIDAS)) {
                    db.createObjectStore(STORE_CONCLUIDAS, { keyPath: 'numero' });
                }

                // Create metadata store
                if (!db.objectStoreNames.contains(STORE_METADATA)) {
                    db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
                }
            }
        });

        return dbInstance;
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
        const db = await init();
        const record = prepareDemanda(demanda);
        await db.put(STORE_DEMANDAS, record);
    }

    /**
     * Save multiple demandas in a transaction
     */
    async function saveDemandas(demandas) {
        if (!demandas || demandas.length === 0) return;

        const db = await init();
        const tx = db.transaction(STORE_DEMANDAS, 'readwrite');

        const promises = demandas.map(d => tx.store.put(prepareDemanda(d)));
        promises.push(tx.done);

        await Promise.all(promises);
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
        const db = await init();
        return db.get(STORE_DEMANDAS, numero);
    }

    /**
     * Get all demandas
     */
    async function getAllDemandas() {
        const db = await init();
        return db.getAll(STORE_DEMANDAS);
    }

    /**
     * Get all demandas as object (keyed by numero)
     */
    async function getAllDemandasAsObject() {
        const demandas = await getAllDemandas();
        const obj = {};
        demandas.forEach(d => {
            obj[d.numero] = d;
        });
        return obj;
    }

    /**
     * Delete a demanda
     */
    async function deleteDemanda(numero) {
        const db = await init();
        await db.delete(STORE_DEMANDAS, numero);
    }

    /**
     * Clear all demandas
     */
    async function clearDemandas() {
        const db = await init();
        await db.clear(STORE_DEMANDAS);
    }

    /**
     * Mark a demanda as concluida (completed)
     */
    async function markConcluida(numero, isDone = true) {
        const db = await init();
        if (isDone) {
            await db.put(STORE_CONCLUIDAS, { numero, timestamp: Date.now() });
        } else {
            await db.delete(STORE_CONCLUIDAS, numero);
        }
    }

    /**
     * Check if a demanda is concluida
     */
    async function isConcluida(numero) {
        const db = await init();
        const record = await db.get(STORE_CONCLUIDAS, numero);
        return !!record;
    }

    /**
     * Get all concluidas as a Set of numeros
     */
    async function getConcluidas() {
        const db = await init();
        const records = await db.getAll(STORE_CONCLUIDAS);
        return new Set(records.map(r => r.numero));
    }

    /**
     * Get concluidas as array
     */
    async function getConcluidasArray() {
        const db = await init();
        const records = await db.getAll(STORE_CONCLUIDAS);
        return records.map(r => r.numero);
    }

    /**
     * Clear all concluidas
     */
    async function clearConcluidas() {
        const db = await init();
        await db.clear(STORE_CONCLUIDAS);
    }

    /**
     * Clear both demandas and concluidas
     */
    async function clearAll() {
        const db = await init();
        await Promise.all([
            db.clear(STORE_DEMANDAS),
            db.clear(STORE_CONCLUIDAS)
        ]);
    }

    /**
     * Get metadata value
     */
    async function getMetadata(key) {
        const db = await init();
        const record = await db.get(STORE_METADATA, key);
        return record ? record.value : null;
    }

    /**
     * Set metadata value
     */
    async function setMetadata(key, value) {
        const db = await init();
        await db.put(STORE_METADATA, { key, value, timestamp: Date.now() });
    }

    /**
     * Check if migration from chrome.storage is needed
     */
    async function needsMigration() {
        const migrationRecord = await getMetadata('lastMigration');
        return !migrationRecord;
    }

    /**
     * Migrate data from chrome.storage.local to IndexedDB
     */
    async function migrateFromChromeStorage() {
        try {
            // Check if already migrated
            const migrated = await getMetadata('lastMigration');
            if (migrated) {
                console.log('NeuronDB: Migration already completed');
                return false;
            }

            console.log('NeuronDB: Starting migration from chrome.storage.local');

            // Get old data from chrome.storage
            const result = await chrome.storage.local.get([
                'neuronDemandasMestra',
                'neuronDemandasConcluidas'
            ]);

            // Migrate demandas
            const oldDemandas = result.neuronDemandasMestra || {};
            const demandasCount = Object.keys(oldDemandas).length;

            if (demandasCount > 0) {
                await saveDemandasFromObject(oldDemandas);
                console.log(`NeuronDB: Migrated ${demandasCount} demandas`);
            }

            // Migrate concluidas
            const oldConcluidas = result.neuronDemandasConcluidas || [];
            if (oldConcluidas.length > 0) {
                const db = await init();
                const tx = db.transaction(STORE_CONCLUIDAS, 'readwrite');
                const promises = oldConcluidas.map(num =>
                    tx.store.put({ numero: num, timestamp: Date.now() })
                );
                promises.push(tx.done);
                await Promise.all(promises);
                console.log(`NeuronDB: Migrated ${oldConcluidas.length} concluidas`);
            }

            // Mark migration complete
            await setMetadata('lastMigration', {
                timestamp: Date.now(),
                version: '1.0',
                demandasMigrated: demandasCount,
                concluidasMigrated: oldConcluidas.length
            });

            console.log('NeuronDB: Migration completed successfully');
            return true;

        } catch (error) {
            console.error('NeuronDB: Migration failed', error);
            throw error;
        }
    }

    /**
     * Get dashboard statistics
     */
    async function getStats() {
        const db = await init();
        const [demandas, concluidas] = await Promise.all([
            getAllDemandas(),
            getConcluidas()
        ]);

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

        // Migration
        needsMigration,
        migrateFromChromeStorage,

        // Statistics
        getStats,
        isNotificacaoRelevante,
        getNotificationCount
    };
})();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuronDB;
}
