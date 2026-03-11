/**
 * Selectize Dropdown Fix - Adaptive Positioning
 * Automatically repositions Selectize dropdowns upward when insufficient
 * space exists below. Uses MutationObserver for dynamic Selectize instances
 * (ASP.NET UpdatePanel compatibility).
 */

(function() {
    'use strict';

    var DROPDOWN_MAX_HEIGHT = 250;
    var DROPUP_CLASS = 'selectize-dropdown--dropup';
    var DEBOUNCE_MS = 100;

    /**
     * Checks available viewport space below the control and toggles dropup positioning.
     * @param {HTMLElement} dropdown - The .selectize-dropdown element
     * @param {HTMLElement} control - The parent .selectize-control element
     */
    function positionDropdown(dropdown, control) {
        var controlRect = control.getBoundingClientRect();
        var spaceBelow = window.innerHeight - controlRect.bottom;

        if (spaceBelow < DROPDOWN_MAX_HEIGHT) {
            dropdown.classList.add(DROPUP_CLASS);
        } else {
            dropdown.classList.remove(DROPUP_CLASS);
        }
    }

    /**
     * Hooks into a Selectize control's dropdown open/close events.
     * @param {HTMLElement} control - A .selectize-control element
     */
    function hookControl(control) {
        if (control._neuronSelectizeHooked) return;
        control._neuronSelectizeHooked = true;

        // Find the associated input element to access the Selectize API
        var input = control.querySelector('input.selectize-input input') ||
                    control.previousElementSibling;

        var selectizeApi = input && input.selectize;

        if (selectizeApi) {
            selectizeApi.on('dropdown_open', function(dropdown) {
                positionDropdown(dropdown[0] || dropdown, control);
            });
            selectizeApi.on('dropdown_close', function() {
                var dropdown = control.querySelector('.selectize-dropdown');
                if (dropdown) {
                    dropdown.classList.remove(DROPUP_CLASS);
                }
            });
        } else {
            // Fallback: observe for dropdown appearance via DOM mutation
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node.nodeType === 1 && node.classList &&
                            node.classList.contains('selectize-dropdown')) {
                            positionDropdown(node, control);
                        }
                    }
                    for (var k = 0; k < mutation.removedNodes.length; k++) {
                        var removed = mutation.removedNodes[k];
                        if (removed.nodeType === 1 && removed.classList &&
                            removed.classList.contains('selectize-dropdown')) {
                            // Cleanup: dropup class is removed with the element
                        }
                    }
                }
            });
            observer.observe(control, { childList: true });

            // Also handle dropdowns that may already exist or appear as siblings
            var existingDropdown = control.querySelector('.selectize-dropdown');
            if (existingDropdown && existingDropdown.offsetParent !== null) {
                positionDropdown(existingDropdown, control);
            }
        }
    }

    /**
     * Scans the page for all .selectize-control elements and hooks them.
     */
    function hookAllControls() {
        var controls = document.querySelectorAll('.selectize-control');
        for (var i = 0; i < controls.length; i++) {
            hookControl(controls[i]);
        }
    }

    /**
     * Simple debounce utility.
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Debounce delay in ms
     * @returns {Function} Debounced function
     */
    function debounce(fn, delay) {
        var timer = null;
        return function() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    /**
     * Recalculates positioning for all open dropdowns.
     */
    function recalcAllOpen() {
        var dropdowns = document.querySelectorAll('.selectize-dropdown');
        for (var i = 0; i < dropdowns.length; i++) {
            var dropdown = dropdowns[i];
            // Only reposition visible dropdowns
            if (dropdown.offsetParent !== null) {
                var control = dropdown.closest('.selectize-control') ||
                              dropdown.parentElement;
                if (control) {
                    positionDropdown(dropdown, control);
                }
            }
        }
    }

    var debouncedRecalc = debounce(recalcAllOpen, DEBOUNCE_MS);

    // Recalculate on scroll and resize with passive listeners and debounce
    window.addEventListener('scroll', debouncedRecalc, { passive: true });
    window.addEventListener('resize', debouncedRecalc, { passive: true });

    // MutationObserver on document.body to detect new .selectize-control elements
    // (ASP.NET UpdatePanel compatibility)
    var bodyObserver = new MutationObserver(function(mutations) {
        var shouldScan = false;
        for (var i = 0; i < mutations.length; i++) {
            var mutation = mutations[i];
            for (var j = 0; j < mutation.addedNodes.length; j++) {
                var node = mutation.addedNodes[j];
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('selectize-control')) {
                        hookControl(node);
                    } else if (node.querySelectorAll) {
                        var nested = node.querySelectorAll('.selectize-control');
                        if (nested.length > 0) {
                            shouldScan = true;
                        }
                    }
                }
            }
        }
        if (shouldScan) {
            hookAllControls();
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Initial hook of all existing controls
    hookAllControls();
})();
