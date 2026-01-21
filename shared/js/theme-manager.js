/**
 * Neuron Theme Manager
 * Handles dark/light theme switching with system preference detection
 * and persistent storage in Chrome extension storage.
 */
const ThemeManager = {
    STORAGE_KEY: 'neuronThemePreference',
    VALID_THEMES: ['light', 'dark', 'system'],

    /**
     * Initialize the theme manager
     * - Loads saved preference from storage
     * - Applies the theme to the document
     * - Sets up system preference watcher
     */
    async init() {
        const preference = await this.getPreference();
        this.applyTheme(preference);
        this.watchSystemPreference();
        return preference;
    },

    /**
     * Get the saved theme preference from Chrome storage
     * @returns {Promise<string>} 'light', 'dark', or 'system'
     */
    async getPreference() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const result = await chrome.storage.local.get(this.STORAGE_KEY);
                const pref = result[this.STORAGE_KEY];
                return this.VALID_THEMES.includes(pref) ? pref : 'system';
            }
        } catch (e) {
            console.warn('ThemeManager: Could not load preference from storage', e);
        }
        return 'system';
    },

    /**
     * Save theme preference to Chrome storage
     * @param {string} preference - 'light', 'dark', or 'system'
     */
    async setPreference(preference) {
        if (!this.VALID_THEMES.includes(preference)) {
            console.warn('ThemeManager: Invalid preference', preference);
            return;
        }

        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                await chrome.storage.local.set({ [this.STORAGE_KEY]: preference });
            }
        } catch (e) {
            console.warn('ThemeManager: Could not save preference to storage', e);
        }

        this.applyTheme(preference);
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

// Listen for storage changes from other extension pages
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[ThemeManager.STORAGE_KEY]) {
            const newValue = changes[ThemeManager.STORAGE_KEY].newValue;
            if (ThemeManager.VALID_THEMES.includes(newValue)) {
                ThemeManager.applyTheme(newValue);
            }
        }
    });
}

// Auto-initialize when script loads (prevents flash of wrong theme)
(async () => {
    // Quick sync initialization to prevent flash
    const quickTheme = localStorage.getItem('neuron-theme-cache');
    if (quickTheme && ThemeManager.VALID_THEMES.includes(quickTheme)) {
        document.documentElement.setAttribute('data-bs-theme',
            quickTheme === 'system' ? ThemeManager.getSystemTheme() : quickTheme
        );
    }
})();
