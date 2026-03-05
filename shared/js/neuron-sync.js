/**
 * NeuronSync - Cross-context synchronization layer using chrome.storage.onChanged
 * Automatically detects when config or preference values change in chrome.storage.local
 * and notifies subscribers. Also keeps NeuronDB's in-memory cache coherent across contexts.
 */

var NeuronSync = NeuronSync || (function () {
    'use strict';

    const KEY_CONFIG = 'neuron_config';
    const KEY_PREFERENCES = 'neuron_preferences';

    const configListeners = [];
    const preferenceListeners = [];
    let listenerInstalled = false;

    /**
     * Install the chrome.storage.onChanged listener (once)
     */
    function ensureListener() {
        if (listenerInstalled) return;
        listenerInstalled = true;

        chrome.storage.onChanged.addListener(function (changes, areaName) {
            if (areaName !== 'local') return;

            // Update NeuronDB cache for any changed keys
            Object.keys(changes).forEach(function (storageKey) {
                if (typeof NeuronDB !== 'undefined' && NeuronDB._updateCache) {
                    NeuronDB._updateCache(storageKey, changes[storageKey].newValue);
                }
            });

            // Fire config change callbacks
            if (changes[KEY_CONFIG]) {
                var oldObj = changes[KEY_CONFIG].oldValue || {};
                var newObj = changes[KEY_CONFIG].newValue || {};
                _fireChanges(oldObj, newObj, configListeners);
            }

            // Fire preference change callbacks
            if (changes[KEY_PREFERENCES]) {
                var oldObj = changes[KEY_PREFERENCES].oldValue || {};
                var newObj = changes[KEY_PREFERENCES].newValue || {};
                _fireChanges(oldObj, newObj, preferenceListeners);
            }
        });
    }

    /**
     * Diff two objects and fire callbacks for each changed key
     */
    function _fireChanges(oldObj, newObj, listeners) {
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
    function onConfigChange(callback) {
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
    function onPreferenceChange(callback) {
        ensureListener();
        preferenceListeners.push(callback);
        return function unsubscribe() {
            var idx = preferenceListeners.indexOf(callback);
            if (idx !== -1) preferenceListeners.splice(idx, 1);
        };
    }

    // Public API
    return {
        onConfigChange,
        onPreferenceChange
    };
})();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuronSync;
}
