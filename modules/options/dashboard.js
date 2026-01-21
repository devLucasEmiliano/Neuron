/**
 * Neuron Dashboard Module
 * Handles data visualization for demand statistics
 */

const NeuronDashboard = (function () {
    'use strict';

    let chartStatus = null;
    let chartResponsaveis = null;
    let chartPrazos = null;
    let isInitialized = false;

    // Chart color schemes
    const colors = {
        primary: '#0278bc',
        accent: '#ffd401',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        secondary: '#6c757d',
        // Chart specific
        prorrogadas: '#6f42c1',
        complementadas: '#fd7e14',
        normal: '#20c997'
    };

    // Get theme-aware colors
    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        return {
            text: isDark ? '#e9ecef' : '#212529',
            gridLines: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            background: isDark ? '#1a1d21' : '#ffffff'
        };
    }

    // Chart.js default options
    function getChartDefaults() {
        const theme = getThemeColors();
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: theme.text,
                        font: {
                            family: "'Inter', 'Segoe UI', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: theme.background,
                    titleColor: theme.text,
                    bodyColor: theme.text,
                    borderColor: theme.gridLines,
                    borderWidth: 1
                }
            }
        };
    }

    /**
     * Update stat cards with data
     */
    function updateStatCards(stats) {
        document.getElementById('stat-total').textContent = stats.total.toLocaleString('pt-BR');
        document.getElementById('stat-pendentes').textContent = stats.pendentes.toLocaleString('pt-BR');
        document.getElementById('stat-urgentes').textContent = stats.prazosCurtos.toLocaleString('pt-BR');
        document.getElementById('stat-taxa').textContent = stats.taxaConclusao + '%';

        // Remove loading state
        document.querySelectorAll('.stat-value').forEach(el => el.classList.remove('loading'));
    }

    /**
     * Create or update Status Donut Chart
     */
    function updateStatusChart(stats) {
        const ctx = document.getElementById('chart-status');
        const emptyEl = document.getElementById('chart-status-empty');

        const total = stats.prorrogadas + stats.complementadas + (stats.total - stats.prorrogadas - stats.complementadas);

        if (stats.total === 0) {
            if (chartStatus) {
                chartStatus.destroy();
                chartStatus = null;
            }
            ctx.style.display = 'none';
            emptyEl.style.display = 'flex';
            return;
        }

        ctx.style.display = 'block';
        emptyEl.style.display = 'none';

        const data = {
            labels: ['Prorrogadas', 'Complementadas', 'Normal'],
            datasets: [{
                data: [
                    stats.prorrogadas,
                    stats.complementadas,
                    stats.total - stats.prorrogadas - stats.complementadas
                ],
                backgroundColor: [colors.prorrogadas, colors.complementadas, colors.normal],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };

        const options = {
            ...getChartDefaults(),
            cutout: '65%',
            plugins: {
                ...getChartDefaults().plugins,
                legend: {
                    position: 'bottom',
                    labels: {
                        ...getChartDefaults().plugins.legend.labels,
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        };

        if (chartStatus) {
            chartStatus.data = data;
            chartStatus.options = options;
            chartStatus.update();
        } else {
            chartStatus = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: options
            });
        }
    }

    /**
     * Create or update Responsaveis Bar Chart
     */
    function updateResponsaveisChart(stats) {
        const ctx = document.getElementById('chart-responsaveis');
        const emptyEl = document.getElementById('chart-responsaveis-empty');

        if (!stats.topResponsaveis || stats.topResponsaveis.length === 0) {
            if (chartResponsaveis) {
                chartResponsaveis.destroy();
                chartResponsaveis = null;
            }
            ctx.style.display = 'none';
            emptyEl.style.display = 'flex';
            return;
        }

        ctx.style.display = 'block';
        emptyEl.style.display = 'none';

        const theme = getThemeColors();
        const data = {
            labels: stats.topResponsaveis.map(r => {
                // Truncate long names
                const name = r.name;
                return name.length > 20 ? name.substring(0, 20) + '...' : name;
            }),
            datasets: [{
                label: 'Demandas',
                data: stats.topResponsaveis.map(r => r.count),
                backgroundColor: colors.primary,
                borderRadius: 4,
                barThickness: 20
            }]
        };

        const options = {
            ...getChartDefaults(),
            indexAxis: 'y',
            plugins: {
                ...getChartDefaults().plugins,
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: theme.text,
                        stepSize: 1
                    },
                    grid: {
                        color: theme.gridLines
                    }
                },
                y: {
                    ticks: {
                        color: theme.text
                    },
                    grid: {
                        display: false
                    }
                }
            }
        };

        if (chartResponsaveis) {
            chartResponsaveis.data = data;
            chartResponsaveis.options = options;
            chartResponsaveis.update();
        } else {
            chartResponsaveis = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
        }
    }

    /**
     * Create or update Prazos Distribution Chart
     */
    function updatePrazosChart(stats) {
        const ctx = document.getElementById('chart-prazos');
        const emptyEl = document.getElementById('chart-prazos-empty');

        if (stats.total === 0) {
            if (chartPrazos) {
                chartPrazos.destroy();
                chartPrazos = null;
            }
            ctx.style.display = 'none';
            emptyEl.style.display = 'flex';
            return;
        }

        ctx.style.display = 'block';
        emptyEl.style.display = 'none';

        const theme = getThemeColors();
        const data = {
            labels: ['Atrasadas', 'Urgentes (0-2 dias)', 'Proximas (3-7 dias)', 'Normais (>7 dias)'],
            datasets: [{
                label: 'Demandas',
                data: [
                    stats.byPrazoRange.atrasadas,
                    stats.byPrazoRange.urgentes,
                    stats.byPrazoRange.proximas,
                    stats.byPrazoRange.normais
                ],
                backgroundColor: [
                    colors.danger,
                    colors.warning,
                    colors.info,
                    colors.success
                ],
                borderRadius: 4,
                barThickness: 30
            }]
        };

        const options = {
            ...getChartDefaults(),
            indexAxis: 'y',
            plugins: {
                ...getChartDefaults().plugins,
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: theme.text,
                        stepSize: 1
                    },
                    grid: {
                        color: theme.gridLines
                    }
                },
                y: {
                    ticks: {
                        color: theme.text
                    },
                    grid: {
                        display: false
                    }
                }
            }
        };

        if (chartPrazos) {
            chartPrazos.data = data;
            chartPrazos.options = options;
            chartPrazos.update();
        } else {
            chartPrazos = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
        }
    }

    /**
     * Load data and update all charts
     */
    async function refresh() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.classList.add('refreshing');
        }

        try {
            // Check if migration is needed first
            if (await NeuronDB.needsMigration()) {
                await NeuronDB.migrateFromChromeStorage();
            }

            // Get statistics from NeuronDB
            const stats = await NeuronDB.getStats();

            // Update UI
            updateStatCards(stats);
            updateStatusChart(stats);
            updateResponsaveisChart(stats);
            updatePrazosChart(stats);

        } catch (error) {
            console.error('NeuronDashboard: Error loading stats', error);
            // Show empty state
            updateStatCards({ total: 0, pendentes: 0, prazosCurtos: 0, taxaConclusao: 0 });
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
            }
        }
    }

    /**
     * Initialize the dashboard
     */
    async function init() {
        if (isInitialized) return;

        // Wait for NeuronDB to be available
        if (typeof NeuronDB === 'undefined') {
            console.warn('NeuronDashboard: NeuronDB not available');
            return;
        }

        // Setup refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refresh);
        }

        // Listen for theme changes
        document.addEventListener('neuron-theme-change', () => {
            // Update charts with new theme colors
            if (chartStatus) updateStatusChart({ total: 0 }); // Will be refreshed
            if (chartResponsaveis) updateResponsaveisChart({ topResponsaveis: [] });
            if (chartPrazos) updatePrazosChart({ total: 0 });
            refresh();
        });

        isInitialized = true;

        // Initial load
        await refresh();
    }

    /**
     * Destroy all charts (cleanup)
     */
    function destroy() {
        if (chartStatus) {
            chartStatus.destroy();
            chartStatus = null;
        }
        if (chartResponsaveis) {
            chartResponsaveis.destroy();
            chartResponsaveis = null;
        }
        if (chartPrazos) {
            chartPrazos.destroy();
            chartPrazos = null;
        }
        isInitialized = false;
    }

    // Public API
    return {
        init,
        refresh,
        destroy
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Will be initialized by options.js when dashboard section is shown
});
