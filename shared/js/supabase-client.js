/**
 * NeuronSupabase - Lightweight Supabase REST client for Neuron Extension
 * Uses fetch() only, no SDK required. Follows NeuronDB IIFE pattern.
 */

var NeuronSupabase = NeuronSupabase || (function () {
    'use strict';

    let config = null;
    let userId = null;
    let initialized = false;

    async function init() {
        if (initialized) return;

        // Load Supabase config
        const res = await fetch(chrome.runtime.getURL('config/supabase.json'));
        config = await res.json();

        // Get or create persistent anonymous user ID
        const data = await chrome.storage.local.get('neuron_user_id');
        if (data.neuron_user_id) {
            userId = data.neuron_user_id;
        } else {
            userId = crypto.randomUUID();
            await chrome.storage.local.set({ neuron_user_id: userId });
        }

        initialized = true;
    }

    function buildHeaders(extra = {}) {
        return {
            'apikey': config.anonKey,
            'Authorization': 'Bearer ' + config.anonKey,
            'Content-Type': 'application/json',
            'x-neuron-user-id': userId,
            'Prefer': 'return=representation',
            ...extra
        };
    }

    async function request(path, options = {}) {
        await init();
        const url = config.url + '/rest/v1/' + path;
        const mergedHeaders = buildHeaders(options.headers);
        const { headers: _h, ...restOptions } = options;
        const res = await fetch(url, {
            ...restOptions,
            headers: mergedHeaders
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(error.message || 'HTTP ' + res.status);
        }

        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    // ========== Public API ==========
    return {
        init: init,
        getUserId: function () { return userId; },

        /**
         * Fetch all suggestions ordered by vote count (desc)
         */
        getSuggestions: function () {
            return request('suggestions?order=vote_count.desc,created_at.desc&select=*');
        },

        /**
         * Create a new suggestion
         * @param {{ title: string, description: string, category: string }} data
         */
        createSuggestion: function (data) {
            return request('suggestions', {
                method: 'POST',
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    author_id: userId
                })
            });
        },

        /**
         * Vote for a suggestion
         * @param {string} suggestionId - UUID of the suggestion
         */
        vote: function (suggestionId) {
            return request('votes', {
                method: 'POST',
                body: JSON.stringify({
                    suggestion_id: suggestionId,
                    voter_id: userId
                })
            });
        },

        /**
         * Remove vote from a suggestion
         * @param {string} suggestionId - UUID of the suggestion
         */
        unvote: function (suggestionId) {
            return request(
                'votes?suggestion_id=eq.' + suggestionId + '&voter_id=eq.' + userId,
                { method: 'DELETE' }
            );
        },

        /**
         * Get all suggestion IDs the current user has voted for
         * @returns {Promise<Array<{suggestion_id: string}>>}
         */
        getMyVotes: function () {
            return request('votes?voter_id=eq.' + userId + '&select=suggestion_id');
        }
    };
})();
