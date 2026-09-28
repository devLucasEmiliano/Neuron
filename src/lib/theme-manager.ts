/**
 * Neuron Theme Manager
 * Handles dark/light theme switching with system preference detection
 * and persistent storage in NeuronDB (chrome.storage.local).
 */

import { NeuronDB } from '@/lib/neuron-db';
import { NeuronSync } from '@/lib/neuron-sync';
import { isThemePreference } from '@/lib/types';
import type { ResolvedTheme, ThemePreference } from '@/lib/types';

const STORAGE_KEY = 'neuronThemePreference';
const ENABLED_KEY = 'neuronThemeEnabled';
const VALID_THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'];

let enabled = true;
let syncInstalled = false;

/**
 * Initialize the theme manager
 * - Loads saved enabled state and preference from storage
 * - Applies the theme to the document (or disables it)
 * - Sets up system preference watcher
 */
async function init(): Promise<ThemePreference> {
    enabled = await getEnabled();
    const preference = await getPreference();
    if (enabled) {
        applyTheme(preference);
    } else {
        _disableTheme();
    }
    watchSystemPreference();
    return preference;
}

/**
 * Get the theme enabled state from NeuronDB
 * @returns {Promise<boolean>} true if theme is enabled
 */
async function getEnabled(): Promise<boolean> {
    try {
        const val = await NeuronDB.getPreference('themeEnabled');
        return val !== false;
    } catch (e) {
        console.warn('ThemeManager: Could not load enabled state from storage', e);
    }
    return true;
}

/**
 * Set the theme enabled state
 * @param {boolean} value - true to enable, false to disable
 */
async function setEnabled(value: boolean): Promise<void> {
    value = !!value;
    enabled = value;

    try {
        await NeuronDB.setPreference('themeEnabled', value);
    } catch (e) {
        console.warn('ThemeManager: Could not save enabled state to storage', e);
    }

    if (value) {
        const preference = await getPreference();
        applyTheme(preference);
    } else {
        _disableTheme();
    }

    // Dispatch custom event for UI components
    const event = new CustomEvent('neuron-theme-enabled-change', {
        detail: { enabled: value }
    });
    document.dispatchEvent(event);
}

/**
 * Remove Neuron theme styling from the document
 * (o CSS agora é empacotado pelo Vite; não existe mais um <link> de theme.css para desabilitar)
 */
function _disableTheme(): void {
    document.documentElement.removeAttribute('data-bs-theme');
}

/**
 * Get the saved theme preference from NeuronDB
 * @returns {Promise<string>} 'light', 'dark', or 'system'
 */
async function getPreference(): Promise<ThemePreference> {
    try {
        const pref = await NeuronDB.getPreference('theme');
        return isThemePreference(pref) ? pref : 'system';
    } catch (e) {
        console.warn('ThemeManager: Could not load preference from storage', e);
    }
    return 'system';
}

/**
 * Save theme preference to NeuronDB
 * @param {string} preference - 'light', 'dark', or 'system'
 */
async function setPreference(preference: ThemePreference): Promise<void> {
    if (!VALID_THEMES.includes(preference)) {
        console.warn('ThemeManager: Invalid preference', preference);
        return;
    }

    try {
        await NeuronDB.setPreference('theme', preference);
    } catch (e) {
        console.warn('ThemeManager: Could not save preference to storage', e);
    }

    if (enabled) {
        applyTheme(preference);
    }
}

/**
 * Apply theme to the document
 * @param {string} preference - 'light', 'dark', or 'system'
 * @returns {string} The actual theme applied ('light' or 'dark')
 */
function applyTheme(preference: ThemePreference): ResolvedTheme {
    let theme: ResolvedTheme;

    if (preference === 'system') {
        theme = getSystemTheme();
    } else {
        theme = preference;
    }

    document.documentElement.setAttribute('data-bs-theme', theme);

    // Dispatch custom event for components that need to react
    const event = new CustomEvent('neuron-theme-change', {
        detail: { theme, preference }
    });
    document.dispatchEvent(event);

    return theme;
}

/**
 * Get the system's preferred color scheme
 * @returns {string} 'light' or 'dark'
 */
function getSystemTheme(): ResolvedTheme {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Get the currently applied theme
 * @returns {string} 'light' or 'dark'
 */
function getCurrentTheme(): string {
    return document.documentElement.getAttribute('data-bs-theme') || 'light';
}

/**
 * Watch for system preference changes
 */
function watchSystemPreference(): void {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = async () => {
        if (!enabled) return;
        const pref = await getPreference();
        if (pref === 'system') {
            applyTheme('system');
        }
    };

    // Chromium-only: addEventListener is always available on MediaQueryList
    mediaQuery.addEventListener('change', handler);
}

/**
 * Toggle between light and dark theme
 * @returns {string} The new theme ('light' or 'dark')
 */
function toggle(): ResolvedTheme {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setPreference(next);
    return next;
}

/**
 * Cycle through theme options: light -> dark -> system -> light
 * @returns {Promise<string>} The new preference
 */
async function cycle(): Promise<ThemePreference> {
    const currentPref = await getPreference();
    let nextPref: ThemePreference;

    switch (currentPref) {
        case 'light':
            nextPref = 'dark';
            break;
        case 'dark':
            nextPref = 'system';
            break;
        case 'system':
        default:
            nextPref = 'light';
            break;
    }

    await setPreference(nextPref);
    return nextPref;
}

/**
 * Get icon class for current theme state
 * @param {string} preference - Current preference ('light', 'dark', 'system')
 * @returns {string} Bootstrap icon class
 */
function getIconClass(preference: ThemePreference): string {
    switch (preference) {
        case 'light':
            return 'bi-sun-fill';
        case 'dark':
            return 'bi-moon-fill';
        case 'system':
        default:
            return 'bi-circle-half';
    }
}

/**
 * Get label for current theme state (in Portuguese)
 * @param {string} preference - Current preference ('light', 'dark', 'system')
 * @returns {string} Label text
 */
function getLabel(preference: ThemePreference): string {
    switch (preference) {
        case 'light':
            return 'Tema Claro';
        case 'dark':
            return 'Tema Escuro';
        case 'system':
        default:
            return 'Tema do Sistema';
    }
}

// Public API
export const ThemeManager = {
    STORAGE_KEY,
    ENABLED_KEY,
    VALID_THEMES,
    init,
    getEnabled,
    setEnabled,
    getPreference,
    setPreference,
    applyTheme,
    getSystemTheme,
    getCurrentTheme,
    watchSystemPreference,
    toggle,
    cycle,
    getIconClass,
    getLabel
};

/**
 * Listen for theme preference changes from other extension contexts
 * (era a subscrição de nível superior do script legado; instalada uma única vez por página)
 */
export function installThemeSyncListener(): void {
    if (syncInstalled) return;
    syncInstalled = true;

    NeuronSync.onPreferenceChange(function (key, newValue) {
        if (key === 'theme' && isThemePreference(newValue)) {
            if (enabled) {
                applyTheme(newValue);
            }
        }
        if (key === 'themeEnabled') {
            enabled = !!newValue;
            if (newValue) {
                getPreference().then(function (pref) {
                    applyTheme(pref);
                });
            } else {
                _disableTheme();
            }
            document.dispatchEvent(new CustomEvent('neuron-theme-enabled-change', {
                detail: { enabled: !!newValue }
            }));
        }
    });
}

/**
 * Auto-initialize when script loads (prevents flash of wrong theme)
 * Falls back to system preference detection since chrome.storage.local is async
 * (era a IIFE de carga do script legado; as páginas chamam como PRIMEIRA instrução do main.ts)
 */
export function applySystemThemeEarly(): void {
    var resolved = getSystemTheme();
    document.documentElement.setAttribute('data-bs-theme', resolved);
}
