/**
 * Melhoria - Suggestion Board for Neuron Extension
 * Handles the "Melhorias" section in options page.
 */

// eslint-disable-next-line no-unused-vars
async function setupMelhoriaTab() {
    'use strict';

    // ========== Constants ==========
    const CATEGORIES = {
        bug:              { label: 'Bug',              icon: 'bi-bug',          badgeClass: 'melhoria-badge-bug' },
        nova_ferramenta:  { label: 'Nova Ferramenta',  icon: 'bi-tools',        badgeClass: 'melhoria-badge-nova_ferramenta' },
        melhoria_ux:      { label: 'Melhoria UX',      icon: 'bi-palette',      badgeClass: 'melhoria-badge-melhoria_ux' },
        documentacao:     { label: 'Documentacao',     icon: 'bi-book',         badgeClass: 'melhoria-badge-documentacao' },
        performance:      { label: 'Performance',      icon: 'bi-speedometer2', badgeClass: 'melhoria-badge-performance' },
        outro:            { label: 'Outro',             icon: 'bi-three-dots',   badgeClass: 'melhoria-badge-outro' }
    };

    // ========== DOM References ==========
    const grid = document.getElementById('melhoriaGrid');
    const statusEl = document.getElementById('melhoriaStatus');
    const createBtn = document.getElementById('createSuggestionBtn');
    const submitBtn = document.getElementById('submitSuggestionBtn');
    const refreshBtn = document.getElementById('refreshMelhoriaBtn');

    // Modal elements
    const createModalEl = document.getElementById('createSuggestionModal');
    const detailModalEl = document.getElementById('detailSuggestionModal');
    const createModal = new bootstrap.Modal(createModalEl);
    const detailModal = new bootstrap.Modal(detailModalEl);

    // Form fields
    const fieldCategory = document.getElementById('suggestionCategory');
    const fieldTitle = document.getElementById('suggestionTitle');
    const fieldDescription = document.getElementById('suggestionDescription');

    // Detail fields
    const detailTitle = document.getElementById('detailTitle');
    const detailCategoryBadge = document.getElementById('detailCategoryBadge');
    const detailMeta = document.getElementById('detailMeta');
    const detailDescription = document.getElementById('detailDescription');
    const detailVoteArea = document.getElementById('detailVoteArea');

    // Filter
    const filtersContainer = document.getElementById('melhoriaFilters');

    // ========== State ==========
    let suggestions = [];
    let myVotedIds = new Set();
    let activeFilter = 'all';

    // ========== Helpers ==========
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function getTier(voteCount) {
        if (voteCount >= 10) return 'high';
        if (voteCount >= 3) return 'medium';
        return 'low';
    }

    function showStatus(msg, isError = false) {
        statusEl.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') +
            ' alert-dismissible fade show py-2 mb-3" role="alert">' +
            '<i class="bi bi-' + (isError ? 'exclamation-triangle' : 'check-circle') + ' me-2"></i>' +
            escapeHtml(msg) +
            '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    }

    function clearStatus() {
        statusEl.innerHTML = '';
    }

    // ========== Badge Rendering ==========
    function renderBadge(category) {
        const cat = CATEGORIES[category] || CATEGORIES.outro;
        return '<span class="melhoria-badge ' + cat.badgeClass + '">' +
            '<i class="bi ' + cat.icon + '"></i> ' + escapeHtml(cat.label) + '</span>';
    }

    // ========== Vote Button ==========
    function renderVoteBtn(suggestion, isVoted) {
        const cls = isVoted ? 'vote-btn voted' : 'vote-btn';
        const icon = isVoted ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up';
        return '<button class="' + cls + '" data-id="' + suggestion.id + '" data-voted="' + isVoted + '">' +
            '<i class="bi ' + icon + '"></i> ' + suggestion.vote_count + '</button>';
    }

    // ========== Hex Grid Helpers ==========
    function getHexesPerRow() {
        var containerWidth = grid.clientWidth;
        // hex-size defaults: 100px (desktop), 92px, 85px, 80px (mobile)
        var hexSize = 100;
        if (containerWidth < 576) hexSize = 80;
        else if (containerWidth < 768) hexSize = 85;
        else if (containerWidth < 992) hexSize = 92;
        var hexWidth = hexSize * 2;
        // Colmeia: passo horizontal = 1.5W (hex W + gap 0.5W)
        // Largura total de N hexes = N * W + (N-1) * 0.5W = W * (1.5N - 0.5)
        // N = floor((containerWidth / hexWidth + 0.5) / 1.5)
        return Math.max(1, Math.floor((containerWidth / hexWidth + 0.5) / 1.5));
    }

    function renderCard(s) {
        var tier = getTier(s.vote_count);
        var isVoted = myVotedIds.has(s.id);
        // Outer .hex-cell = colored border hex, inner .melhoria-card = white content hex
        return '<div class="hex-cell" data-tier="' + tier + '" data-id="' + s.id +
            '" data-category="' + s.category + '" title="' + escapeHtml(s.title) + '">' +
            '<div class="melhoria-card">' +
            renderBadge(s.category) +
            '<h3 class="melhoria-card-title">' + escapeHtml(s.title) + '</h3>' +
            '<div class="melhoria-card-footer">' +
            '<span class="melhoria-date">' + formatDate(s.created_at) + '</span>' +
            renderVoteBtn(s, isVoted) +
            '</div></div></div>';
    }

    // ========== Grid Rendering ==========
    function renderGrid() {
        var filtered = activeFilter === 'all'
            ? suggestions
            : suggestions.filter(function (s) { return s.category === activeFilter; });

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="melhoria-empty">' +
                '<i class="bi bi-lightbulb"></i>' +
                '<p>Nenhuma sugestao encontrada.</p>' +
                '<p class="small">Clique em "Nova Sugestao" para criar a primeira!</p></div>';
            return;
        }

        var perRow = getHexesPerRow();
        var rows = [];
        var i = 0;
        var rowIndex = 0;

        while (i < filtered.length) {
            // Offset rows (odd index) have one fewer hex for stagger effect
            var count = (rowIndex % 2 === 1) ? Math.max(1, perRow - 1) : perRow;
            rows.push({
                items: filtered.slice(i, i + count),
                isOffset: rowIndex % 2 === 1
            });
            i += count;
            rowIndex++;
        }

        grid.innerHTML = rows.map(function (row) {
            var cls = 'hex-row' + (row.isOffset ? ' hex-row-offset' : '');
            return '<div class="' + cls + '">' +
                row.items.map(renderCard).join('') +
                '</div>';
        }).join('');
    }

    // Re-render hex grid on resize (debounced)
    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderGrid, 200);
    });

    // ========== Filter Rendering ==========
    function renderFilters() {
        const counts = { all: suggestions.length };
        suggestions.forEach(function (s) {
            counts[s.category] = (counts[s.category] || 0) + 1;
        });

        let html = '<button class="melhoria-filter-btn active" data-filter="all">Todos (' + counts.all + ')</button>';
        Object.keys(CATEGORIES).forEach(function (key) {
            if (counts[key]) {
                html += '<button class="melhoria-filter-btn" data-filter="' + key + '">' +
                    CATEGORIES[key].label + ' (' + counts[key] + ')</button>';
            }
        });
        filtersContainer.innerHTML = html;
    }

    // ========== Data Loading ==========
    async function loadData() {
        grid.innerHTML = '<div class="melhoria-loading">' +
            '<div class="spinner-border text-primary" role="status"></div>' +
            '<p class="mt-2">Carregando sugestoes...</p></div>';

        try {
            await NeuronSupabase.init();
            const results = await Promise.all([
                NeuronSupabase.getSuggestions(),
                NeuronSupabase.getMyVotes()
            ]);

            suggestions = results[0] || [];
            myVotedIds = new Set((results[1] || []).map(function (v) { return v.suggestion_id; }));

            renderFilters();
            renderGrid();
        } catch (err) {
            console.error('[Melhoria] Load error:', err);
            grid.innerHTML = '<div class="melhoria-offline">' +
                '<i class="bi bi-wifi-off"></i>' +
                '<p>Nao foi possivel carregar as sugestoes.</p>' +
                '<p class="small text-body-secondary">' + escapeHtml(err.message) + '</p>' +
                '<button class="btn btn-outline-primary btn-sm mt-2" id="retryLoadBtn">' +
                '<i class="bi bi-arrow-clockwise me-1"></i>Tentar novamente</button></div>';

            document.getElementById('retryLoadBtn')?.addEventListener('click', loadData);
        }
    }

    // ========== Vote Handling ==========
    async function handleVote(suggestionId, currentlyVoted) {
        try {
            if (currentlyVoted) {
                await NeuronSupabase.unvote(suggestionId);
                myVotedIds.delete(suggestionId);
                // Update local count
                const s = suggestions.find(function (s) { return s.id === suggestionId; });
                if (s) s.vote_count = Math.max(0, s.vote_count - 1);
            } else {
                await NeuronSupabase.vote(suggestionId);
                myVotedIds.add(suggestionId);
                const s = suggestions.find(function (s) { return s.id === suggestionId; });
                if (s) s.vote_count += 1;
            }

            // Re-sort by vote count
            suggestions.sort(function (a, b) {
                return b.vote_count - a.vote_count || new Date(b.created_at) - new Date(a.created_at);
            });

            renderGrid();
            renderFilters();

            // Update detail modal if open
            if (detailModalEl.classList.contains('show')) {
                const s = suggestions.find(function (s) { return s.id === suggestionId; });
                if (s) {
                    detailVoteArea.innerHTML = renderVoteBtn(s, myVotedIds.has(s.id));
                }
            }
        } catch (err) {
            console.error('[Melhoria] Vote error:', err);
            // Handle duplicate vote (409 conflict)
            if (err.message && err.message.includes('duplicate')) {
                myVotedIds.add(suggestionId);
                renderGrid();
            } else {
                showStatus('Erro ao votar: ' + err.message, true);
            }
        }
    }

    // ========== Create Suggestion ==========
    async function submitSuggestion() {
        const title = fieldTitle.value.trim();
        const description = fieldDescription.value.trim();
        const category = fieldCategory.value;

        // Validation
        if (title.length < 3) {
            fieldTitle.classList.add('is-invalid');
            return;
        }
        if (description.length < 10) {
            fieldDescription.classList.add('is-invalid');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enviando...';

        try {
            const result = await NeuronSupabase.createSuggestion({
                title: title,
                description: description,
                category: category
            });

            // Add to local state
            if (result && result.length > 0) {
                suggestions.unshift(result[0]);
            }

            createModal.hide();
            clearFormFields();
            renderFilters();
            renderGrid();
            showStatus('Sugestao criada com sucesso!');
        } catch (err) {
            console.error('[Melhoria] Create error:', err);
            showStatus('Erro ao criar sugestao: ' + err.message, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send me-1"></i>Enviar';
        }
    }

    function clearFormFields() {
        fieldTitle.value = '';
        fieldDescription.value = '';
        fieldCategory.value = 'bug';
        fieldTitle.classList.remove('is-invalid');
        fieldDescription.classList.remove('is-invalid');
    }

    // ========== Detail Modal ==========
    function openDetail(suggestionId) {
        const s = suggestions.find(function (s) { return s.id === suggestionId; });
        if (!s) return;

        detailTitle.textContent = s.title;
        detailCategoryBadge.innerHTML = renderBadge(s.category);
        detailMeta.textContent = 'Criado em ' + formatDate(s.created_at);
        detailDescription.textContent = s.description;
        detailVoteArea.innerHTML = renderVoteBtn(s, myVotedIds.has(s.id));

        detailModal.show();
    }

    // ========== Event Listeners ==========

    // Create button
    createBtn.addEventListener('click', function () {
        clearFormFields();
        createModal.show();
    });

    // Submit button
    submitBtn.addEventListener('click', submitSuggestion);

    // Refresh button
    refreshBtn.addEventListener('click', loadData);

    // Remove invalid state on input
    fieldTitle.addEventListener('input', function () {
        fieldTitle.classList.remove('is-invalid');
    });
    fieldDescription.addEventListener('input', function () {
        fieldDescription.classList.remove('is-invalid');
    });

    // Grid click delegation (card click = open detail, vote btn = vote)
    grid.addEventListener('click', function (e) {
        // Vote button click
        const voteBtn = e.target.closest('.vote-btn');
        if (voteBtn) {
            e.stopPropagation();
            const id = voteBtn.dataset.id;
            const isVoted = voteBtn.dataset.voted === 'true';
            handleVote(id, isVoted);
            return;
        }

        // Card click = open detail (data-id is on .hex-cell wrapper)
        const cell = e.target.closest('.hex-cell');
        if (cell) {
            openDetail(cell.dataset.id);
        }
    });

    // Detail modal vote delegation
    detailVoteArea.addEventListener('click', function (e) {
        const voteBtn = e.target.closest('.vote-btn');
        if (voteBtn) {
            const id = voteBtn.dataset.id;
            const isVoted = voteBtn.dataset.voted === 'true';
            handleVote(id, isVoted);
        }
    });

    // Filter click delegation
    filtersContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('.melhoria-filter-btn');
        if (!btn) return;

        activeFilter = btn.dataset.filter;

        // Update active state
        filtersContainer.querySelectorAll('.melhoria-filter-btn').forEach(function (b) {
            b.classList.toggle('active', b.dataset.filter === activeFilter);
        });

        renderGrid();
    });

    // ========== Initial Load ==========
    await loadData();
}
