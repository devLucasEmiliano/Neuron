/**
 * Neuron Theme Manager
 * Handles dark/light theme switching with system preference detection
 * and persistent storage in NeuronDB (IndexedDB).
 */
const ThemeManager = {
    STORAGE_KEY: 'neuronThemePreference',
    ENABLED_KEY: 'neuronThemeEnabled',
    VALID_THEMES: ['light', 'dark', 'system'],
    _enabled: true,

    /**
     * Initialize the theme manager
     * - Loads saved enabled state and preference from storage
     * - Applies the theme to the document (or disables it)
     * - Sets up system preference watcher
     */
    async init() {
        this._enabled = await this.getEnabled();
        const preference = await this.getPreference();
        if (this._enabled) {
            this.applyTheme(preference);
        } else {
            this._disableTheme();
        }
        this.watchSystemPreference();
        return preference;
    },

    /**
     * Get the theme enabled state from NeuronDB
     * @returns {Promise<boolean>} true if theme is enabled
     */
    async getEnabled() {
        try {
            if (typeof NeuronDB !== 'undefined') {
                const val = await NeuronDB.getPreference('themeEnabled');
                return val !== false;
            }
        } catch (e) {
            console.warn('ThemeManager: Could not load enabled state from storage', e);
        }
        return true;
    },

    /**
     * Set the theme enabled state
     * @param {boolean} enabled - true to enable, false to disable
     */
    async setEnabled(enabled) {
        enabled = !!enabled;
        this._enabled = enabled;

        try {
            if (typeof NeuronDB !== 'undefined') {
                await NeuronDB.setPreference('themeEnabled', enabled);
            }
        } catch (e) {
            console.warn('ThemeManager: Could not save enabled state to storage', e);
        }

        if (enabled) {
            const preference = await this.getPreference();
            this.applyTheme(preference);
        } else {
            this._disableTheme();
        }

        // Dispatch custom event for UI components
        const event = new CustomEvent('neuron-theme-enabled-change', {
            detail: { enabled }
        });
        document.dispatchEvent(event);
    },

    /**
     * Remove Neuron theme styling from the document
     */
    _disableTheme() {
        document.documentElement.removeAttribute('data-bs-theme');
    },

    /**
     * Get the saved theme preference from NeuronDB
     * @returns {Promise<string>} 'light', 'dark', or 'system'
     */
    async getPreference() {
        try {
            if (typeof NeuronDB !== 'undefined') {
                const pref = await NeuronDB.getPreference('theme');
                return this.VALID_THEMES.includes(pref) ? pref : 'system';
            }
        } catch (e) {
            console.warn('ThemeManager: Could not load preference from storage', e);
        }
        return 'system';
    },

    /**
     * Save theme preference to NeuronDB
     * @param {string} preference - 'light', 'dark', or 'system'
     */
    async setPreference(preference) {
        if (!this.VALID_THEMES.includes(preference)) {
            console.warn('ThemeManager: Invalid preference', preference);
            return;
        }

        try {
            if (typeof NeuronDB !== 'undefined') {
                await NeuronDB.setPreference('theme', preference);
            }
        } catch (e) {
            console.warn('ThemeManager: Could not save preference to storage', e);
        }

        if (this._enabled) {
            this.applyTheme(preference);
        }
    },

    /**
     * Apply theme to the document
     * @param {string} preference - 'light', 'dark', or 'system'
     * @returns {string} The actual theme applied ('light' or 'dark')
     */
    applyTheme(preference) {
        let theme;

        if (preference === 'system') {
            theme = this.getSystemTheme();
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
    },

    /**
     * Get the system's preferred color scheme
     * @returns {string} 'light' or 'dark'
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    },

    /**
     * Get the currently applied theme
     * @returns {string} 'light' or 'dark'
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-bs-theme') || 'light';
    },

    /**
     * Watch for system preference changes
     */
    watchSystemPreference() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handler = async () => {
            if (!this._enabled) return;
            const pref = await this.getPreference();
            if (pref === 'system') {
                this.applyTheme('system');
            }
        };

        // Use addEventListener if available (modern browsers)
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
        } else if (mediaQuery.addListener) {
            // Fallback for older browsers
            mediaQuery.addListener(handler);
        }
    },

    /**
     * Toggle between light and dark theme
     * @returns {string} The new theme ('light' or 'dark')
     */
    toggle() {
        const current = this.getCurrentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        this.setPreference(next);
        return next;
    },

    /**
     * Cycle through theme options: light -> dark -> system -> light
     * @returns {Promise<string>} The new preference
     */
    async cycle() {
        const currentPref = await this.getPreference();
        let nextPref;

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

        await this.setPreference(nextPref);
        return nextPref;
    },

    /**
     * Get icon class for current theme state
     * @param {string} preference - Current preference ('light', 'dark', 'system')
     * @returns {string} Bootstrap icon class
     */
    getIconClass(preference) {
        switch (preference) {
            case 'light':
                return 'bi-sun-fill';
            case 'dark':
                return 'bi-moon-fill';
            case 'system':
            default:
                return 'bi-circle-half';
        }
    },

    /**
     * Get label for current theme state (in Portuguese)
     * @param {string} preference - Current preference ('light', 'dark', 'system')
     * @returns {string} Label text
     */
    getLabel(preference) {
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
};

// Listen for theme preference changes from other extension contexts
if (typeof NeuronSync !== 'undefined') {
    NeuronSync.onPreferenceChange(function (key, newValue) {
        if (key === 'theme' && ThemeManager.VALID_THEMES.includes(newValue)) {
            if (ThemeManager._enabled) {
                ThemeManager.applyTheme(newValue);
            }
        }
        if (key === 'themeEnabled') {
            ThemeManager._enabled = !!newValue;
            if (newValue) {
                ThemeManager.getPreference().then(function (pref) {
                    ThemeManager.applyTheme(pref);
                });
            } else {
                ThemeManager._disableTheme();
            }
            document.dispatchEvent(new CustomEvent('neuron-theme-enabled-change', {
                detail: { enabled: !!newValue }
            }));
        }
    });
}

// Auto-initialize when script loads (prevents flash of wrong theme)
// Falls back to system preference detection since IndexedDB is async
(function () {
    var resolved = ThemeManager.getSystemTheme();
    document.documentElement.setAttribute('data-bs-theme', resolved);
})();
