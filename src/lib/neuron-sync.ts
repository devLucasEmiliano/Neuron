/**
 * NeuronSync - Cross-context synchronization layer using chrome.storage.onChanged
 * Automatically detects when config or preference values change in chrome.storage.local
 * and notifies subscribers. Also keeps NeuronDB's in-memory cache coherent across contexts.
 */

import { browser } from 'wxt/browser';
import { NeuronDB } from './neuron-db';
import type { ConfigChangeListener, PreferenceChangeListener } from './types';

const KEY_CONFIG = 'neuron_config';
const KEY_PREFERENCES = 'neuron_preferences';

const configListeners: ConfigChangeListener[] = [];
const preferenceListeners: PreferenceChangeListener[] = [];
let listenerInstalled = false;

/**
 * Install the chrome.storage.onChanged listener (once)
 */
function ensureListener(): void {
    if (listenerInstalled) return;
    listenerInstalled = true;

    browser.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName !== 'local') return;

        // Update NeuronDB cache for changed keys that belong to the active site
        Object.keys(changes).forEach(function (storageKey) {
            // Check if this is a per-site key (e.g., neuron_producao_demandas)
            var perSiteMatch = storageKey.match(/^neuron_(producao|treinamento|homologacao)_(demandas|concluidas|metadata)$/);
            if (perSiteMatch) {
                // Only update cache if the key belongs to the currently active site
                var keyAlias = perSiteMatch[1];
                if (keyAlias === NeuronDB._getCurrentSiteAlias()) {
                    NeuronDB._updateCache(storageKey, changes[storageKey].newValue);
                }
            } else {
                // Global keys (config, preferences) — always update
                NeuronDB._updateCache(storageKey, changes[storageKey].newValue);
            }
        });

        // Fire config change callbacks
        // (oldValue/newValue chegam como unknown do storage; os buckets são objetos chave-valor)
        if (changes[KEY_CONFIG]) {
            let oldObj = (changes[KEY_CONFIG].oldValue || {}) as Record<string, unknown>;
            let newObj = (changes[KEY_CONFIG].newValue || {}) as Record<string, unknown>;
            _fireChanges(oldObj, newObj, configListeners);
        }

        // Fire preference change callbacks
        if (changes[KEY_PREFERENCES]) {
            let oldObj = (changes[KEY_PREFERENCES].oldValue || {}) as Record<string, unknown>;
            let newObj = (changes[KEY_PREFERENCES].newValue || {}) as Record<string, unknown>;
            _fireChanges(oldObj, newObj, preferenceListeners);
        }
    });
}

/**
 * Diff two objects and fire callbacks for each changed key
 */
function _fireChanges(oldObj: Record<string, unknown>, newObj: Record<string, unknown>, listeners: ConfigChangeListener[]): void {
    if (listeners.length === 0) return;

    // Find all keys that exist in either object
    var allKeys = new Set(Object.keys(oldObj).concat(Object.keys(newObj)));

    allKeys.forEach(function (key) {
        var oldVal = oldObj[key];
        var newVal = newObj[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            listeners.forEach(function (cb) {
                cb(key, newVal);
            });
        }
    });
}

/**
 * Subscribe to config change notifications
 * @param {Function} callback - Called with (key, newValue) when a config changes
 * @returns {Function} Unsubscribe function
 */
function onConfigChange(callback: ConfigChangeListener): () => void {
    ensureListener();
    configListeners.push(callback);
    return function unsubscribe() {
        var idx = configListeners.indexOf(callback);
        if (idx !== -1) configListeners.splice(idx, 1);
    };
}

/**
 * Subscribe to preference change notifications
 * @param {Function} callback - Called with (key, newValue) when a preference changes
 * @returns {Function} Unsubscribe function
 */
function onPreferenceChange(callback: PreferenceChangeListener): () => void {
    ensureListener();
    preferenceListeners.push(callback);
    return function unsubscribe() {
        var idx = preferenceListeners.indexOf(callback);
        if (idx !== -1) preferenceListeners.splice(idx, 1);
    };
}

// Public API
export const NeuronSync = {
    onConfigChange,
    onPreferenceChange
};
