/**
 * NeuronSync - Cross-context synchronization layer using BroadcastChannel
 * Notifies other extension contexts
 * when config or preference values change in IndexedDB.
 */

var NeuronSync = NeuronSync || (function () {
    'use strict';

    const CHANNEL_NAME = 'neuron-sync';
    let channel = null;

    /**
     * Get or create the BroadcastChannel instance
     */
    function getChannel() {
        if (!channel) {
            channel = new BroadcastChannel(CHANNEL_NAME);
        }
        return channel;
    }

    /**
     * Broadcast a change notification to all other contexts
     * @param {string} changeType - Type of change ('config' or 'preference')
     * @param {string} key - The key that changed
     * @param {*} newValue - The new value
     */
    function broadcast(changeType, key, newValue) {
        getChannel().postMessage({
            type: changeType,
            key: key,
            newValue: newValue,
            timestamp: Date.now()
        });
    }

    /**
     * Subscribe to config change notifications
     * @param {Function} callback - Called with (key, newValue) when a config changes
     * @returns {Function} Unsubscribe function
     */
    function onConfigChange(callback) {
        return _subscribe('config', callback);
    }

    /**
     * Subscribe to preference change notifications
     * @param {Function} callback - Called with (key, newValue) when a preference changes
     * @returns {Function} Unsubscribe function
     */
    function onPreferenceChange(callback) {
        return _subscribe('preference', callback);
    }

    /**
     * Internal: subscribe to a specific change type
     */
    function _subscribe(changeType, callback) {
        const ch = getChannel();
        function handler(event) {
            const data = event.data;
            if (data && data.type === changeType) {
                callback(data.key, data.newValue);
            }
        }
        ch.addEventListener('message', handler);
        return function unsubscribe() {
            ch.removeEventListener('message', handler);
        };
    }

    // Public API
    return {
        broadcast,
        onConfigChange,
        onPreferenceChange
    };
})();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuronSync;
}
