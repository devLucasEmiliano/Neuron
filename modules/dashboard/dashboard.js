/**
 * Neuron Dashboard - Dedicated Dashboard Page
 * Initializes NeuronDB and ThemeManager for the standalone dashboard
 */

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    // Initialize NeuronDB
    if (typeof NeuronDB !== 'undefined') {
        await NeuronDB.init();
    }

    // Initialize ThemeManager
    if (typeof ThemeManager !== 'undefined') {
        ThemeManager.init();

        // Setup theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                ThemeManager.cycle();
            });
        }

        // Update theme icon on theme change
        function updateThemeIcon() {
            if (!themeIcon) return;
            const theme = document.documentElement.getAttribute('data-bs-theme');
            if (theme === 'dark') {
                themeIcon.className = 'bi bi-sun-fill';
            } else {
                themeIcon.className = 'bi bi-moon-fill';
            }
        }

        document.addEventListener('neuron-theme-change', updateThemeIcon);
        updateThemeIcon();
    }
});
