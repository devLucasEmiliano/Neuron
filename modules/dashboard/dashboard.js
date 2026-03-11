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

    // --- Stats Cards ---

    /**
     * Refresh all dashboard data (stats cards, charts, table)
     */
    async function refreshDashboard() {
        if (typeof NeuronDB === 'undefined') return;

        const stats = await NeuronDB.getStats();

        // Update stat cards
        const el = (id) => document.getElementById(id);
        el('stat-total').textContent = stats.total;
        el('stat-pendentes').textContent = stats.pendentes;
        el('stat-prazos-curtos').textContent = stats.prazosCurtos;
        el('stat-atrasadas').textContent = stats.atrasadas;
        el('stat-concluidas').textContent = stats.concluidas;
        el('stat-taxa').textContent = stats.taxaConclusao + '%';
    }

    // Initial load
    await refreshDashboard();

    // Listen for data changes to refresh dashboard
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'local') return;
            if (changes.neuron_demandas || changes.neuron_concluidas) {
                refreshDashboard();
            }
        });
    }
});
