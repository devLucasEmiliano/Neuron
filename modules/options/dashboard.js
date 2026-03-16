/**
 * Neuron Dashboard Module (Options Page)
 * Self-contained IIFE module adapted from the standalone dashboard.
 * Handles data visualization, filtering, search, sort, pagination, and charts.
 */
const NeuronDashboard = (function () {
    'use strict';

    // --- Initialization Guard ---
    let isInitialized = false;

    // --- Chart Instances ---
    let chartStatus = null;
    let chartPrazos = null;
    let chartResponsaveis = null;
    let chartTemporal = null;

    // --- Filter State ---
    let currentFilter = 'all'; // 'all' or 'mine'
    let currentUser = null;

    // --- Search & Sort State ---
    let searchQuery = '';
    let sortColumn = null; // 'numero', 'dataCadastro', 'prazo', 'diasRestantes'
    let sortDirection = 'asc'; // 'asc' or 'desc'

    // --- Pagination State ---
    let currentPage = 1;
    let itemsPerPage = 25;

    // --- Stats cache for re-rendering on search/sort changes ---
    let lastStats = null;

    // --- Site selector buttons reference ---
    let siteBtns = [];

    // ========== Theme Colors (DS v3) ==========

    /**
     * Returns appropriate chart colors based on current theme (data-bs-theme attribute)
     */
    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        return {
            textColor: isDark ? '#E9EAF3' : '#0B0E2C',
            gridColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            // Status donut colors
            prorrogadas: isDark ? '#E8974F' : '#D5691B',
            complementadas: isDark ? '#5A96FF' : '#1476FF',
            possivelRespondida: isDark ? '#4FD99A' : '#13A570',
            comObservacao: isDark ? '#B070FF' : '#9240FB',
            normal: isDark ? '#6F7182' : '#989AAD',
            // Prazo bar colors
            atrasadas: isDark ? '#E85A5A' : '#DC2B2B',
            urgentes: isDark ? '#E8974F' : '#D5691B',
            proximas: isDark ? '#5A96FF' : '#1476FF',
            normais: isDark ? '#4FD99A' : '#13A570',
            // Responsaveis bar color
            responsaveis: isDark ? '#B070FF' : '#9240FB',
            // Temporal line colors
            temporalRegistradas: isDark ? '#5A96FF' : '#1476FF',
            temporalConcluidas: isDark ? '#4FD99A' : '#13A570',
        };
    }

    // ========== Site Selector ==========

    /**
     * Select a site and optionally reload dashboard data
     */
    async function selectSite(alias, reload) {
        if (reload === undefined) reload = true;

        siteBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.site === alias);
        });

        if (typeof NeuronDB !== 'undefined') {
            if (reload) {
                await NeuronDB.switchSite(alias);
            } else {
                await NeuronDB.init(alias);
            }
        }

        if (reload) {
            currentPage = 1;
            await refreshDashboard();
        }
    }

    // ========== Stats Computation ==========

    /**
     * Compute stats locally from a filtered demandas array and concluidasSet.
     * Mirrors NeuronDB.getStats() logic but works on any subset.
     */
    function computeLocalStats(demandas, concluidasSet) {
        var total = demandas.length;
        var prorrogadas = 0;
        var complementadas = 0;
        var possivelRespondida = 0;
        var possivelobservacao = 0;
        var concluidas = 0;

        var byResponsavel = {};
        var byPrazoRange = { atrasadas: 0, urgentes: 0, proximas: 0, normais: 0 };
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var todayMs = today.getTime();
        var msPerDay = 86400000;

        for (var i = 0; i < demandas.length; i++) {
            var d = demandas[i];

            // Concluidas
            if (concluidasSet.has(d.numero)) {
                concluidas++;
            }

            // Status flags
            if (d.situacao && d.situacao.includes('Prorrogada')) prorrogadas++;
            if (d.situacao && d.situacao.includes('Complementada')) complementadas++;
            if (d.possivelRespondida) possivelRespondida++;
            if (d.possivelobservacao) possivelobservacao++;

            // Prazo range
            if (d.prazoTimestamp) {
                var diasRestantes = Math.ceil((d.prazoTimestamp - todayMs) / msPerDay);
                if (diasRestantes < 0) byPrazoRange.atrasadas++;
                else if (diasRestantes <= 2) byPrazoRange.urgentes++;
                else if (diasRestantes <= 7) byPrazoRange.proximas++;
                else byPrazoRange.normais++;
            }

            // Responsaveis
            if (Array.isArray(d.responsaveis)) {
                for (var j = 0; j < d.responsaveis.length; j++) {
                    var r = d.responsaveis[j];
                    byResponsavel[r] = (byResponsavel[r] || 0) + 1;
                }
            }
        }

        var pendentes = total - concluidas;
        var taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
        var prazosCurtos = byPrazoRange.urgentes;
        var atrasadas = byPrazoRange.atrasadas;

        // Top responsaveis
        var topResponsaveis = Object.entries(byResponsavel)
            .map(function (entry) { return { name: entry[0], count: entry[1] }; })
            .sort(function (a, b) { return b.count - a.count; })
            .slice(0, 10);

        return {
            total: total, pendentes: pendentes, concluidas: concluidas, taxaConclusao: taxaConclusao,
            prazosCurtos: prazosCurtos, atrasadas: atrasadas,
            prorrogadas: prorrogadas, complementadas: complementadas,
            possivelRespondida: possivelRespondida, possivelobservacao: possivelobservacao,
            byResponsavel: byResponsavel, topResponsaveis: topResponsaveis, byPrazoRange: byPrazoRange,
            demandas: demandas, concluidasSet: concluidasSet
        };
    }

    /**
     * Filter demandas to only those where responsaveis includes the current user (case-insensitive)
     */
    function filterDemandas(demandas) {
        if (currentFilter !== 'mine' || !currentUser) return demandas;
        var userLower = currentUser.toLowerCase();
        return demandas.filter(function (d) {
            return Array.isArray(d.responsaveis) &&
                d.responsaveis.some(function (r) { return r.toLowerCase() === userLower; });
        });
    }

    // ========== Dashboard Refresh ==========

    /**
     * Refresh all dashboard data (stats cards, charts, table)
     */
    async function refreshDashboard() {
        if (typeof NeuronDB === 'undefined') return;

        var fullStats = await NeuronDB.getStats();
        var filteredDemandas = filterDemandas(fullStats.demandas || []);
        var stats = (currentFilter === 'mine' && currentUser)
            ? computeLocalStats(filteredDemandas, fullStats.concluidasSet || new Set())
            : fullStats;

        // Update stat cards
        var el = function (id) { return document.getElementById(id); };
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
        updateTemporalChart(stats);

        // Update table
        renderDemandasTable(stats);
    }

    // ========== Search & Sort Logic ==========

    /**
     * Filter demandas by search query (case-insensitive match against numero, situacao, responsaveis)
     */
    function searchDemandas(demandas) {
        if (!searchQuery) return demandas;
        var q = searchQuery.toLowerCase();
        return demandas.filter(function (d) {
            var numero = (d.numero || '').toLowerCase();
            var situacao = (d.situacao || '').toLowerCase();
            var responsaveis = Array.isArray(d.responsaveis) ? d.responsaveis.join(', ').toLowerCase() : '';
            return numero.includes(q) || situacao.includes(q) || responsaveis.includes(q);
        });
    }

    /**
     * Sort demandas by the current sort column and direction
     */
    function sortDemandas(demandas) {
        if (!sortColumn) return demandas;
        var sorted = demandas.slice();
        var dir = sortDirection === 'asc' ? 1 : -1;

        sorted.sort(function (a, b) {
            var va, vb;
            if (sortColumn === 'numero') {
                va = (a.numero || '').toLowerCase();
                vb = (b.numero || '').toLowerCase();
                return va < vb ? -dir : va > vb ? dir : 0;
            } else if (sortColumn === 'dataCadastro') {
                va = a.cadastroTimestamp || 0;
                vb = b.cadastroTimestamp || 0;
                return (va - vb) * dir;
            } else if (sortColumn === 'prazo') {
                va = a.prazoTimestamp || 0;
                vb = b.prazoTimestamp || 0;
                return (va - vb) * dir;
            } else if (sortColumn === 'diasRestantes') {
                va = NeuronDB.calcularDiasRestantes(a.prazo);
                vb = NeuronDB.calcularDiasRestantes(b.prazo);
                // Null values go to end
                if (va === null && vb === null) return 0;
                if (va === null) return 1;
                if (vb === null) return -1;
                return (va - vb) * dir;
            }
            return 0;
        });
        return sorted;
    }

    /**
     * Update sort indicator icons in the table header
     */
    function updateSortIndicators() {
        document.querySelectorAll('#demandas-table .sortable-header').forEach(function (th) {
            var icon = th.querySelector('.sort-icon');
            if (!icon) return;
            if (th.dataset.sort === sortColumn) {
                icon.className = 'bi sort-icon ' + (sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
            } else {
                icon.className = 'bi bi-arrow-down-up sort-icon text-body-secondary';
            }
        });
    }

    // ========== Demandas Table ==========

    /**
     * Render the demandas table with urgency-based row coloring, search, sort, and pagination
     */
    function renderDemandasTable(stats) {
        if (stats) lastStats = stats;
        if (!lastStats) return;

        var tbody = document.getElementById('demandas-tbody');
        var emptyMsg = document.getElementById('demandas-empty');
        if (!tbody) return;

        var demandas = lastStats.demandas || [];

        // Apply search then sort
        var filtered = sortDemandas(searchDemandas(demandas));
        var totalFiltered = filtered.length;

        if (totalFiltered === 0) {
            tbody.innerHTML = '';
            if (emptyMsg) {
                emptyMsg.textContent = searchQuery ? 'Nenhuma demanda encontrada para a busca.' : 'Nenhuma demanda encontrada.';
                emptyMsg.style.display = '';
            }
            renderPagination(0, 0);
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        // Pagination calculations
        var totalPages = Math.ceil(totalFiltered / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        var startIndex = (currentPage - 1) * itemsPerPage;
        var endIndex = Math.min(startIndex + itemsPerPage, totalFiltered);
        var paged = filtered.slice(startIndex, endIndex);

        var rows = [];
        for (var i = 0; i < paged.length; i++) {
            var d = paged[i];
            var diasRestantes = NeuronDB.calcularDiasRestantes(d.prazo);

            // Row urgency class
            var rowClass = '';
            if (diasRestantes !== null && diasRestantes < 0) {
                rowClass = 'table-danger';
            } else if (diasRestantes !== null && diasRestantes <= 2) {
                rowClass = 'table-warning';
            }

            // Dias restantes badge
            var badgeHtml = '';
            if (diasRestantes !== null) {
                var badgeClass = 'bg-success';
                if (diasRestantes < 0) {
                    badgeClass = 'bg-danger';
                } else if (diasRestantes <= 2) {
                    badgeClass = 'bg-warning text-dark';
                }
                badgeHtml = '<span class="badge ' + badgeClass + '">' + diasRestantes + ' dia' + (Math.abs(diasRestantes) !== 1 ? 's' : '') + '</span>';
            } else {
                badgeHtml = '<span class="text-body-secondary">-</span>';
            }

            // Responsaveis
            var responsaveis = Array.isArray(d.responsaveis) ? d.responsaveis.join(', ') : '';

            var esc = window.NeuronUtils ? window.NeuronUtils.escapeHtml : function (s) { return s; };

            // Action buttons
            var openBtnDisabled = d.href ? '' : ' disabled';
            var openHref = d.href ? esc(d.href) : '#';
            var actionsHtml =
                '<div class="d-flex gap-1 justify-content-center">' +
                '<a href="' + openHref + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary" title="Abrir no Fala.BR"' + openBtnDisabled + '>' +
                '<i class="bi bi-box-arrow-up-right"></i></a>' +
                '<button type="button" class="btn btn-sm btn-outline-secondary btn-copy-nup" data-numero="' + esc(d.numero || '') + '" title="Copiar NUP">' +
                '<i class="bi bi-clipboard"></i></button>' +
                '</div>';

            rows.push(
                '<tr class="' + rowClass + '">' +
                '<td>' + esc(d.numero || '') + '</td>' +
                '<td>' + esc(d.dataCadastro || '') + '</td>' +
                '<td>' + esc(d.prazo || '') + '</td>' +
                '<td>' + badgeHtml + '</td>' +
                '<td>' + esc(d.situacao || '') + '</td>' +
                '<td>' + esc(responsaveis) + '</td>' +
                '<td class="text-center">' + actionsHtml + '</td>' +
                '</tr>'
            );
        }

        tbody.innerHTML = rows.join('');
        updateSortIndicators();
        renderPagination(totalFiltered, totalPages);
    }

    // ========== Pagination ==========

    /**
     * Render pagination controls and info text
     */
    function renderPagination(totalFiltered, totalPages) {
        var paginationInfo = document.getElementById('pagination-info');
        var paginationControls = document.getElementById('pagination-controls');
        var paginationFooter = document.getElementById('pagination-footer');

        if (paginationFooter) {
            paginationFooter.style.display = totalFiltered === 0 ? 'none' : '';
        }

        if (paginationInfo) {
            if (totalFiltered === 0) {
                paginationInfo.textContent = '';
            } else {
                var start = (currentPage - 1) * itemsPerPage + 1;
                var end = Math.min(currentPage * itemsPerPage, totalFiltered);
                paginationInfo.textContent = 'Mostrando ' + start + ' a ' + end + ' de ' + totalFiltered + ' demandas';
            }
        }

        if (!paginationControls) return;

        if (totalPages <= 1) {
            paginationControls.innerHTML = '';
            return;
        }

        var items = [];

        // First button
        items.push(
            '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">' +
            '<a class="page-link" href="#" data-page="1" aria-label="Primeira">' +
            '<i class="bi bi-chevron-double-left"></i></a></li>'
        );

        // Previous button
        items.push(
            '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">' +
            '<a class="page-link" href="#" data-page="' + (currentPage - 1) + '" aria-label="Anterior">' +
            '<i class="bi bi-chevron-left"></i></a></li>'
        );

        // Page numbers -- show up to 5 around current page
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (var p = startPage; p <= endPage; p++) {
            items.push(
                '<li class="page-item ' + (p === currentPage ? 'active' : '') + '">' +
                '<a class="page-link" href="#" data-page="' + p + '">' + p + '</a></li>'
            );
        }

        // Next button
        items.push(
            '<li class="page-item ' + (currentPage === totalPages ? 'disabled' : '') + '">' +
            '<a class="page-link" href="#" data-page="' + (currentPage + 1) + '" aria-label="Proxima">' +
            '<i class="bi bi-chevron-right"></i></a></li>'
        );

        // Last button
        items.push(
            '<li class="page-item ' + (currentPage === totalPages ? 'disabled' : '') + '">' +
            '<a class="page-link" href="#" data-page="' + totalPages + '" aria-label="Ultima">' +
            '<i class="bi bi-chevron-double-right"></i></a></li>'
        );

        paginationControls.innerHTML = items.join('');
    }

    // ========== Charts ==========

    // --- Status Distribution Donut Chart ---

    function updateStatusChart(stats) {
        var ctx = document.getElementById('chart-status');
        if (!ctx) return;

        var colors = getThemeColors();
        var labels = ['Prorrogadas', 'Complementadas', 'Possivel Respondida', 'Com Observacao', 'Normal'];
        var normalCount = Math.max(0, stats.total - stats.prorrogadas - stats.complementadas - stats.possivelRespondida - stats.possivelobservacao);
        var data = [
            stats.prorrogadas,
            stats.complementadas,
            stats.possivelRespondida,
            stats.possivelobservacao,
            normalCount
        ];
        var bgColors = [
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
                labels: labels,
                datasets: [{
                    data: data,
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
                            label: function (context) {
                                var total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                var pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
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
        var ctx = document.getElementById('chart-prazos');
        if (!ctx) return;

        var colors = getThemeColors();
        var labels = ['Atrasadas (< 0 dias)', 'Urgentes (0-2 dias)', 'Proximas (3-7 dias)', 'Normais (> 7 dias)'];
        var data = [
            stats.byPrazoRange.atrasadas,
            stats.byPrazoRange.urgentes,
            stats.byPrazoRange.proximas,
            stats.byPrazoRange.normais
        ];
        var bgColors = [
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
                labels: labels,
                datasets: [{
                    data: data,
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
                            label: function (context) {
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
        var ctx = document.getElementById('chart-responsaveis');
        if (!ctx) return;

        var colors = getThemeColors();
        var topResp = (stats.topResponsaveis || []).slice(0, 10);
        var labels = topResp.map(function (r) { return r.name; });
        var data = topResp.map(function (r) { return r.count; });

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
                labels: labels,
                datasets: [{
                    data: data,
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
                            title: function (items) {
                                return items[0].label;
                            },
                            label: function (context) {
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

    // --- Temporal Line Chart (Demands per Month) ---

    function updateTemporalChart(stats) {
        var ctx = document.getElementById('chart-temporal');
        if (!ctx) return;

        var colors = getThemeColors();
        var demandas = stats.demandas || [];
        var concluidasSet = stats.concluidasSet || new Set();

        // Build last 12 months (including current)
        var now = new Date();
        var months = [];
        for (var i = 11; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth(), label: formatMonth(d) });
        }

        // Count demandas registered per month and concluded per month
        var registeredCounts = new Array(12).fill(0);
        var concludedCounts = new Array(12).fill(0);

        for (var k = 0; k < demandas.length; k++) {
            var demanda = demandas[k];
            if (!demanda.cadastroTimestamp) continue;
            var date = new Date(demanda.cadastroTimestamp);
            var year = date.getFullYear();
            var month = date.getMonth();

            for (var j = 0; j < months.length; j++) {
                if (months[j].year === year && months[j].month === month) {
                    registeredCounts[j]++;
                    if (concluidasSet.has(demanda.numero)) {
                        concludedCounts[j]++;
                    }
                    break;
                }
            }
        }

        var labels = months.map(function (m) { return m.label; });

        if (chartTemporal) {
            chartTemporal.data.labels = labels;
            chartTemporal.data.datasets[0].data = registeredCounts;
            chartTemporal.data.datasets[1].data = concludedCounts;
            chartTemporal.data.datasets[0].borderColor = colors.temporalRegistradas;
            chartTemporal.data.datasets[0].backgroundColor = colors.temporalRegistradas + '33';
            chartTemporal.data.datasets[1].borderColor = colors.temporalConcluidas;
            chartTemporal.data.datasets[1].backgroundColor = colors.temporalConcluidas + '33';
            chartTemporal.options.scales.x.ticks.color = colors.textColor;
            chartTemporal.options.scales.x.grid.color = colors.gridColor;
            chartTemporal.options.scales.y.ticks.color = colors.textColor;
            chartTemporal.options.scales.y.grid.color = colors.gridColor;
            chartTemporal.options.plugins.legend.labels.color = colors.textColor;
            chartTemporal.update();
            return;
        }

        chartTemporal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Registradas',
                        data: registeredCounts,
                        borderColor: colors.temporalRegistradas,
                        backgroundColor: colors.temporalRegistradas + '33',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Concluidas',
                        data: concludedCounts,
                        borderColor: colors.temporalConcluidas,
                        backgroundColor: colors.temporalConcluidas + '33',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + context.parsed.y + ' demandas';
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

    /**
     * Format a Date object as MMM/YYYY (e.g., Mar/2026)
     */
    function formatMonth(date) {
        var monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return monthNames[date.getMonth()] + '/' + date.getFullYear();
    }

    // ========== Initialization ==========

    /**
     * Initialize the dashboard module.
     * Sets up all event handlers, detects site, loads preferences, and performs initial render.
     */
    async function init() {
        if (isInitialized) return;

        // Wait for NeuronDB to be available
        if (typeof NeuronDB === 'undefined') {
            console.warn('NeuronDashboard: NeuronDB not available');
            return;
        }

        // --- Site detection ---
        var siteAlias = 'producao';
        try {
            var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            var tab = tabs && tabs[0];
            if (tab && tab.url) {
                var detected = typeof NeuronSite !== 'undefined' ? NeuronSite.getFromUrl(tab.url) : null;
                if (detected) siteAlias = detected;
            }
        } catch (e) {
            // Default to producao
        }

        // Initialize NeuronDB with detected site
        await NeuronDB.init(siteAlias);

        // --- Site selector button handlers ---
        siteBtns = document.querySelectorAll('.site-btn[data-site]');
        siteBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.site === siteAlias);
            btn.addEventListener('click', function () {
                selectSite(btn.dataset.site);
            });
        });

        // --- Load saved filter preference and current user ---
        var savedFilter = await NeuronDB.getPreference('dashboardFilter');
        if (savedFilter === 'mine' || savedFilter === 'all') {
            currentFilter = savedFilter;
        }
        currentUser = await NeuronDB.getMetadata('currentUser');

        var savedPerPage = await NeuronDB.getPreference('dashboardItemsPerPage');
        if (savedPerPage && [10, 25, 50, 100].includes(Number(savedPerPage))) {
            itemsPerPage = Number(savedPerPage);
        }

        // --- Filter group button handlers ---
        var filterGroup = document.getElementById('filterGroup');
        if (filterGroup) {
            // Apply saved filter state to buttons
            filterGroup.querySelectorAll('[data-filter]').forEach(function (btn) {
                btn.classList.toggle('active', btn.dataset.filter === currentFilter);
            });

            filterGroup.addEventListener('click', async function (e) {
                var btn = e.target.closest('[data-filter]');
                if (!btn || btn.dataset.filter === currentFilter) return;

                currentFilter = btn.dataset.filter;
                filterGroup.querySelectorAll('[data-filter]').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');

                if (typeof NeuronDB !== 'undefined') {
                    await NeuronDB.setPreference('dashboardFilter', currentFilter);
                }
                currentPage = 1;
                refreshDashboard();
            });
        }

        // --- Search input handler ---
        var searchInput = document.getElementById('demandas-search');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                searchQuery = searchInput.value.trim();
                currentPage = 1;
                renderDemandasTable(null);
            });
        }

        // --- Sortable headers handler ---
        document.querySelectorAll('#demandas-table .sortable-header').forEach(function (th) {
            th.addEventListener('click', function () {
                var col = th.dataset.sort;
                if (sortColumn === col) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortDirection = 'asc';
                }
                renderDemandasTable(null);
            });
        });

        // --- Items-per-page select handler ---
        var itemsPerPageSelect = document.getElementById('items-per-page');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.value = String(itemsPerPage);
            itemsPerPageSelect.addEventListener('change', async function () {
                itemsPerPage = Number(itemsPerPageSelect.value);
                currentPage = 1;
                if (typeof NeuronDB !== 'undefined') {
                    await NeuronDB.setPreference('dashboardItemsPerPage', itemsPerPage);
                }
                renderDemandasTable(null);
            });
        }

        // --- Pagination click handler ---
        var paginationControls = document.getElementById('pagination-controls');
        if (paginationControls) {
            paginationControls.addEventListener('click', function (e) {
                e.preventDefault();
                var link = e.target.closest('[data-page]');
                if (!link) return;
                var li = link.closest('.page-item');
                if (li && li.classList.contains('disabled')) return;
                var page = Number(link.dataset.page);
                if (page >= 1 && page !== currentPage) {
                    currentPage = page;
                    renderDemandasTable(null);
                }
            });
        }

        // --- Copy NUP click handler on table ---
        var demandasTable = document.getElementById('demandas-table');
        if (demandasTable) {
            demandasTable.addEventListener('click', async function (e) {
                var btn = e.target.closest('.btn-copy-nup');
                if (!btn) return;
                var numero = btn.dataset.numero;
                if (!numero) return;

                try {
                    await navigator.clipboard.writeText(numero);
                    var icon = btn.querySelector('i');
                    if (icon) {
                        icon.className = 'bi bi-clipboard-check';
                    }
                    btn.title = 'Copiado!';
                    setTimeout(function () {
                        if (icon) {
                            icon.className = 'bi bi-clipboard';
                        }
                        btn.title = 'Copiar NUP';
                    }, 2000);
                } catch (err) {
                    console.warn('Clipboard API failed:', err);
                }
            });
        }

        // --- Theme change handler: destroy and recreate charts ---
        document.addEventListener('neuron-theme-change', function () {
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
            if (chartTemporal) {
                chartTemporal.destroy();
                chartTemporal = null;
            }
            refreshDashboard();
        });

        isInitialized = true;

        // --- Initial dashboard render ---
        await refreshDashboard();
    }

    /**
     * Public refresh method (alias for refreshDashboard)
     */
    async function refresh() {
        await refreshDashboard();
    }

    // ========== Public API ==========
    return {
        init: init,
        refresh: refresh
    };
})();
