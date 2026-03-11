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

        // Redraw charts with updated colors on theme change
        document.addEventListener('neuron-theme-change', () => {
            if (chartStatus) {
                chartStatus.destroy();
                chartStatus = null;
            }
            if (chartPrazos) {
                chartPrazos.destroy();
                chartPrazos = null;
            }
            if (chartResponsaveis) {
                chartResponsaveis.destroy();
                chartResponsaveis = null;
            }
            refreshDashboard();
        });
    }

    // --- Theme Colors ---

    /**
     * Returns appropriate chart colors based on current theme (data-bs-theme attribute)
     */
    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        return {
            textColor: isDark ? '#dee2e6' : '#495057',
            gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            // Status donut colors
            prorrogadas: isDark ? '#ffc107' : '#ffc107',
            complementadas: isDark ? '#0dcaf0' : '#0d6efd',
            possivelRespondida: isDark ? '#20c997' : '#198754',
            comObservacao: isDark ? '#fd7e14' : '#fd7e14',
            normal: isDark ? '#6c757d' : '#adb5bd',
            // Prazo bar colors
            atrasadas: isDark ? '#f06292' : '#dc3545',
            urgentes: isDark ? '#ffb74d' : '#ffc107',
            proximas: isDark ? '#4fc3f7' : '#0d6efd',
            normais: isDark ? '#81c784' : '#198754',
            // Responsaveis bar color
            responsaveis: isDark ? '#7c4dff' : '#6f42c1',
        };
    }

    // --- Chart instances ---
    let chartStatus = null;
    let chartPrazos = null;
    let chartResponsaveis = null;

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

        // Update charts
        updateStatusChart(stats);
        updatePrazosChart(stats);
        updateResponsaveisChart(stats);
    }

    // --- Status Distribution Donut Chart ---

    function updateStatusChart(stats) {
        const ctx = document.getElementById('chart-status');
        if (!ctx) return;

        const colors = getThemeColors();
        const labels = ['Prorrogadas', 'Complementadas', 'Possível Respondida', 'Com Observação', 'Normal'];
        const normalCount = Math.max(0, stats.total - stats.prorrogadas - stats.complementadas - stats.possivelRespondida - stats.possivelobservacao);
        const data = [
            stats.prorrogadas,
            stats.complementadas,
            stats.possivelRespondida,
            stats.possivelobservacao,
            normalCount
        ];
        const bgColors = [
            colors.prorrogadas,
            colors.complementadas,
            colors.possivelRespondida,
            colors.comObservacao,
            colors.normal
        ];

        if (chartStatus) {
            chartStatus.data.labels = labels;
            chartStatus.data.datasets[0].data = data;
            chartStatus.data.datasets[0].backgroundColor = bgColors;
            chartStatus.options.plugins.legend.labels.color = colors.textColor;
            chartStatus.update();
            return;
        }

        chartStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: bgColors,
                    borderWidth: 2,
                    borderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#212529' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: colors.textColor,
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                                return context.label + ': ' + context.parsed + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Deadline Distribution Horizontal Bar Chart ---

    function updatePrazosChart(stats) {
        const ctx = document.getElementById('chart-prazos');
        if (!ctx) return;

        const colors = getThemeColors();
        const labels = ['Atrasadas (< 0 dias)', 'Urgentes (0-2 dias)', 'Próximas (3-7 dias)', 'Normais (> 7 dias)'];
        const data = [
            stats.byPrazoRange.atrasadas,
            stats.byPrazoRange.urgentes,
            stats.byPrazoRange.proximas,
            stats.byPrazoRange.normais
        ];
        const bgColors = [
            colors.atrasadas,
            colors.urgentes,
            colors.proximas,
            colors.normais
        ];

        if (chartPrazos) {
            chartPrazos.data.labels = labels;
            chartPrazos.data.datasets[0].data = data;
            chartPrazos.data.datasets[0].backgroundColor = bgColors;
            chartPrazos.options.scales.x.ticks.color = colors.textColor;
            chartPrazos.options.scales.x.grid.color = colors.gridColor;
            chartPrazos.options.scales.y.ticks.color = colors.textColor;
            chartPrazos.options.scales.y.grid.color = colors.gridColor;
            chartPrazos.update();
            return;
        }

        chartPrazos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: bgColors,
                    borderRadius: 4,
                    barThickness: 28
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.x + ' demandas';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.textColor,
                            precision: 0
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    }
                }
            }
        });
    }

    // --- Top 10 Responsaveis Vertical Bar Chart ---

    function updateResponsaveisChart(stats) {
        const ctx = document.getElementById('chart-responsaveis');
        if (!ctx) return;

        const colors = getThemeColors();
        const topResp = (stats.topResponsaveis || []).slice(0, 10);
        const labels = topResp.map(r => r.name);
        const data = topResp.map(r => r.count);

        if (chartResponsaveis) {
            chartResponsaveis.data.labels = labels;
            chartResponsaveis.data.datasets[0].data = data;
            chartResponsaveis.data.datasets[0].backgroundColor = colors.responsaveis;
            chartResponsaveis.options.scales.x.ticks.color = colors.textColor;
            chartResponsaveis.options.scales.x.grid.color = colors.gridColor;
            chartResponsaveis.options.scales.y.ticks.color = colors.textColor;
            chartResponsaveis.options.scales.y.grid.color = colors.gridColor;
            chartResponsaveis.update();
            return;
        }

        chartResponsaveis = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.responsaveis,
                    borderRadius: 4,
                    barThickness: 28
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(items) {
                                return items[0].label;
                            },
                            label: function(context) {
                                return context.parsed.y + ' demandas';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: colors.textColor,
                            maxRotation: 45,
                            minRotation: 25
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.textColor,
                            precision: 0
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    }
                }
            }
        });
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
