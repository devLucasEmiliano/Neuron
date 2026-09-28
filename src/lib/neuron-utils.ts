/**
 * Neuron Shared Utilities
 * Common functions used across content scripts
 */

import { NeuronDB } from './neuron-db';
import { NeuronSync } from './neuron-sync';
import type { NeuronUserConfig } from '@/lib/types';

export const CONFIG_KEY = 'neuronUserConfig' as const;

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str: unknown): string {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } as Record<string, string>)[char]);
}

/**
 * Checks if a specific script/module is active based on config
 * @param {string} scriptId - The script identifier
 * @returns {Promise<boolean>} Whether the script is active
 */
export async function isScriptAtivo(scriptId: string): Promise<boolean> {
    try {
        const config: NeuronUserConfig = await NeuronDB.getConfig(CONFIG_KEY) || {};
        return config.masterEnableNeuron !== false &&
               config.modules?.[scriptId] !== false;
    } catch (error) {
        console.warn(`%cNeuron (${scriptId}): Não foi possível ler as configurações.`, "color: goldenrod;", errorMessage(error));
        return false;
    }
}

/**
 * Creates a storage change listener for a specific script
 * @param {string} scriptId - The script identifier
 * @param {Function} callback - Function to call when config changes
 * @returns {Function} The listener function (for cleanup)
 */
export function createStorageListener(scriptId: string, callback: () => void): () => void {
    return NeuronSync.onConfigChange(function(key) {
        if (key === CONFIG_KEY) {
            callback();
        }
    });
}

/**
 * Shows a temporary notification to the user
 * @param {string} text - Notification text
 * @param {string} type - Notification type ('success', 'error', 'warning')
 */
export function showNotification(text: string, type: 'success' | 'error' | 'warning' = 'success'): void {
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

// ============================================================================
// Helpers de erro (em TypeScript a variável do catch é `unknown`)
// ============================================================================

/**
 * Extracts a readable message from a caught value
 * @param {unknown} e - Caught value (Error, string or anything else)
 * @returns {string} The error message
 */
export function errorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return String(e);
}

/**
 * Checks whether a caught value is the "Extension context invalidated" error
 * (thrown by chrome.* APIs after the extension is reloaded/updated)
 * @param {unknown} e - Caught value
 * @returns {boolean} Whether the extension context was invalidated
 */
export function isContextInvalidatedError(e: unknown): boolean {
    return errorMessage(e).includes('Extension context invalidated');
}
