/**
 * Melhoria - Suggestion Board for Neuron Extension
 * Handles the "Melhorias" section in options page.
 */

import { Modal } from 'bootstrap';
import { NeuronSupabase } from '@/lib/supabase-client';
import { escapeHtml, errorMessage } from '@/lib/neuron-utils';
import type { Suggestion, SuggestionCategory } from '@/lib/types';

interface CategoryInfo {
    label: string;
    icon: string;
    badgeClass: string;
}

export async function setupMelhoriaTab(): Promise<void> {
    'use strict';

    // ========== Constants ==========
    const CATEGORIES: Record<SuggestionCategory, CategoryInfo> = {
        bug:              { label: 'Bug',              icon: 'bi-bug',          badgeClass: 'melhoria-badge-bug' },
        nova_ferramenta:  { label: 'Nova Ferramenta',  icon: 'bi-tools',        badgeClass: 'melhoria-badge-nova_ferramenta' },
        melhoria_ux:      { label: 'Melhoria UX',      icon: 'bi-palette',      badgeClass: 'melhoria-badge-melhoria_ux' },
        documentacao:     { label: 'Documentacao',     icon: 'bi-book',         badgeClass: 'melhoria-badge-documentacao' },
        performance:      { label: 'Performance',      icon: 'bi-speedometer2', badgeClass: 'melhoria-badge-performance' },
        outro:            { label: 'Outro',             icon: 'bi-three-dots',   badgeClass: 'melhoria-badge-outro' }
    };

    // ========== DOM References ==========
    // Elementos estáticos de index.html: o legado os acessa sem verificação de null (TypeError se ausentes).
    const grid = document.getElementById('melhoriaGrid')!;
    const statusEl = document.getElementById('melhoriaStatus')!;
    const createBtn = document.getElementById('createSuggestionBtn')!;
    const submitBtn = document.getElementById('submitSuggestionBtn') as HTMLButtonElement; // <button id="submitSuggestionBtn">
    const refreshBtn = document.getElementById('refreshMelhoriaBtn')!;

    // Modal elements
    const createModalEl = document.getElementById('createSuggestionModal')!;
    const detailModalEl = document.getElementById('detailSuggestionModal')!;
    const createModal = new Modal(createModalEl);
    const detailModal = new Modal(detailModalEl);

    // Form fields
    const fieldCategory = document.getElementById('suggestionCategory') as HTMLSelectElement;     // <select id="suggestionCategory">
    const fieldTitle = document.getElementById('suggestionTitle') as HTMLInputElement;            // <input type="text" id="suggestionTitle">
    const fieldDescription = document.getElementById('suggestionDescription') as HTMLTextAreaElement; // <textarea id="suggestionDescription">

    // Detail fields
    const detailTitle = document.getElementById('detailTitle')!;
    const detailCategoryBadge = document.getElementById('detailCategoryBadge')!;
    const detailMeta = document.getElementById('detailMeta')!;
    const detailDescription = document.getElementById('detailDescription')!;
    const detailVoteArea = document.getElementById('detailVoteArea')!;

    // Filter
    const filtersContainer = document.getElementById('melhoriaFilters')!;

    // ========== State ==========
    let suggestions: Suggestion[] = [];
    let myVotedIds = new Set<string>();
    let activeFilter = 'all';

    // ========== Helpers ==========
    function formatDate(dateStr: string) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function getTier(voteCount: number) {
        if (voteCount >= 10) return 'high';
        if (voteCount >= 3) return 'medium';
        return 'low';
    }

    function showStatus(msg: string, isError = false) {
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
    function renderBadge(category: SuggestionCategory) {
        const cat = CATEGORIES[category] || CATEGORIES.outro;
        return '<span class="melhoria-badge ' + escapeHtml(cat.badgeClass) + '">' +
            '<i class="bi ' + escapeHtml(cat.icon) + '"></i> ' + escapeHtml(cat.label) + '</span>';
    }

    // ========== Vote Button ==========
    function renderVoteBtn(suggestion: Suggestion, isVoted: boolean) {
        const cls = isVoted ? 'vote-btn voted' : 'vote-btn';
        const icon = isVoted ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up';
        return '<button class="' + escapeHtml(cls) + '" data-id="' + escapeHtml(suggestion.id) + '" data-voted="' + escapeHtml(isVoted) + '">' +
            '<i class="bi ' + escapeHtml(icon) + '"></i> ' + suggestion.vote_count + '</button>';
    }

    // ========== Grid Rendering ==========
    const HEX_ROW_SIZE = 5;

    function renderCard(s: Suggestion) {
        const tier = getTier(s.vote_count);
        const isVoted = myVotedIds.has(s.id);
        return '<div class="melhoria-card" data-tier="' + escapeHtml(tier) + '" data-id="' + escapeHtml(s.id) +
            '" data-category="' + escapeHtml(s.category) + '" title="' + escapeHtml(s.title) + '">' +
            renderBadge(s.category) +
            '<h3 class="melhoria-card-title">' + escapeHtml(s.title) + '</h3>' +
            '<div class="melhoria-card-footer">' +
            '<span class="melhoria-date">' + formatDate(s.created_at) + '</span>' +
            renderVoteBtn(s, isVoted) +
            '</div></div>';
    }

    function renderGrid() {
        const filtered = activeFilter === 'all'
            ? suggestions
            : suggestions.filter(function (s) { return s.category === activeFilter; });

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="melhoria-empty">' +
                '<i class="bi bi-lightbulb"></i>' +
                '<p>Nenhuma sugestao encontrada.</p>' +
                '<p class="small">Clique em "Nova Sugestao" para criar a primeira!</p></div>';
            return;
        }

        const cardHtml = filtered.map(renderCard);
        let html = '';
        for (let i = 0; i < cardHtml.length; i += HEX_ROW_SIZE) {
            const rowIndex = Math.floor(i / HEX_ROW_SIZE);
            const offsetCls = rowIndex % 2 === 1 ? ' hex-row-offset' : '';
            html += '<div class="hex-row' + escapeHtml(offsetCls) + '">' +
                cardHtml.slice(i, i + HEX_ROW_SIZE).join('') +
                '</div>';
        }
        grid.innerHTML = html;
    }

    // ========== Filter Rendering ==========
    function renderFilters() {
        const counts: Record<string, number> = { all: suggestions.length };
        suggestions.forEach(function (s) {
            counts[s.category] = (counts[s.category] || 0) + 1;
        });

        let html = '<button class="melhoria-filter-btn active" data-filter="all">Todos (' + counts.all + ')</button>';
        // CATEGORIES é Record<SuggestionCategory, …>; Object.keys perde o tipo das chaves
        (Object.keys(CATEGORIES) as SuggestionCategory[]).forEach(function (key) {
            if (counts[key]) {
                html += '<button class="melhoria-filter-btn" data-filter="' + escapeHtml(key) + '">' +
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
                '<p class="small text-body-secondary">' + escapeHtml(errorMessage(err)) + '</p>' +
                '<button class="btn btn-outline-primary btn-sm mt-2" id="retryLoadBtn">' +
                '<i class="bi bi-arrow-clockwise me-1"></i>Tentar novamente</button></div>';

            document.getElementById('retryLoadBtn')?.addEventListener('click', loadData);
        }
    }

    // ========== Vote Handling ==========
    async function handleVote(suggestionId: string, currentlyVoted: boolean) {
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
                return b.vote_count - a.vote_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
            if (errorMessage(err).includes('duplicate')) {
                myVotedIds.add(suggestionId);
                renderGrid();
            } else {
                showStatus('Erro ao votar: ' + errorMessage(err), true);
            }
        }
    }

    // ========== Create Suggestion ==========
    async function submitSuggestion() {
        const title = fieldTitle.value.trim();
        const description = fieldDescription.value.trim();
        // As <option>s de #suggestionCategory são exatamente os valores de SuggestionCategory (types.ts)
        const category = fieldCategory.value as SuggestionCategory;

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
            showStatus('Erro ao criar sugestao: ' + errorMessage(err), true);
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
    function openDetail(suggestionId: string) {
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
        if (!(e.target instanceof HTMLElement)) return;
        // Vote button click
        const voteBtn = e.target.closest<HTMLElement>('.vote-btn');
        if (voteBtn) {
            e.stopPropagation();
            const id = voteBtn.dataset.id ?? '';
            const isVoted = voteBtn.dataset.voted === 'true';
            handleVote(id, isVoted);
            return;
        }

        // Card click = open detail
        const card = e.target.closest<HTMLElement>('.melhoria-card');
        if (card) {
            openDetail(card.dataset.id ?? '');
        }
    });

    // Detail modal vote delegation
    detailVoteArea.addEventListener('click', function (e) {
        if (!(e.target instanceof HTMLElement)) return;
        const voteBtn = e.target.closest<HTMLElement>('.vote-btn');
        if (voteBtn) {
            const id = voteBtn.dataset.id ?? '';
            const isVoted = voteBtn.dataset.voted === 'true';
            handleVote(id, isVoted);
        }
    });

    // Filter click delegation
    filtersContainer.addEventListener('click', function (e) {
        if (!(e.target instanceof HTMLElement)) return;
        const btn = e.target.closest<HTMLElement>('.melhoria-filter-btn');
        if (!btn) return;

        activeFilter = btn.dataset.filter ?? 'all';

        // Update active state
        filtersContainer.querySelectorAll<HTMLElement>('.melhoria-filter-btn').forEach(function (b) {
            b.classList.toggle('active', b.dataset.filter === activeFilter);
        });

        renderGrid();
    });

    // ========== Initial Load ==========
    await loadData();
}
