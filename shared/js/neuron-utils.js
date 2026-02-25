/**
 * Neuron Shared Utilities
 * Common functions used across content scripts
 */

(function() {
    'use strict';

    const CONFIG_KEY = 'neuronUserConfig';

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    /**
     * Checks if a specific script/module is active based on config
     * @param {string} scriptId - The script identifier
     * @returns {Promise<boolean>} Whether the script is active
     */
    async function isScriptAtivo(scriptId) {
        if (!chrome.runtime?.id) return false;
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            const config = result[CONFIG_KEY] || {};
            return config.masterEnableNeuron !== false &&
                   config.modules?.[scriptId] !== false;
        } catch (error) {
            console.warn(`%cNeuron (${scriptId}): Não foi possível ler as configurações.`, "color: goldenrod;", error.message);
            return false;
        }
    }

    /**
     * Creates a storage change listener for a specific script
     * @param {string} scriptId - The script identifier
     * @param {Function} callback - Function to call when config changes
     * @returns {Function} The listener function (for cleanup)
     */
    function createStorageListener(scriptId, callback) {
        const listener = (changes, namespace) => {
            if (!chrome.runtime?.id) return;
            if (namespace === 'local' && changes[CONFIG_KEY]) {
                callback();
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return listener;
    }

    /**
     * Shows a temporary notification to the user
     * @param {string} text - Notification text
     * @param {string} type - Notification type ('success', 'error', 'warning')
     */
    function showNotification(text, type = 'success') {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };

        const notification = document.createElement('div');
        notification.innerText = text;
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: colors[type] || colors.success,
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            zIndex: '9999',
            transition: 'opacity 0.5s ease',
            opacity: '1',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }

    // Export to window for global access
    window.NeuronUtils = {
        CONFIG_KEY,
        escapeHtml,
        isScriptAtivo,
        createStorageListener,
        showNotification
    };
})();
