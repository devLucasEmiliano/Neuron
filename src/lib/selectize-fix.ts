/**
 * Selectize Dropdown Fix - Adaptive Positioning
 * Automatically repositions Selectize dropdowns upward when insufficient
 * space exists below. Uses MutationObserver for dynamic Selectize instances
 * (ASP.NET UpdatePanel compatibility).
 */

const DROPDOWN_MAX_HEIGHT = 250;
const DROPUP_CLASS = 'selectize-dropdown--dropup';
const DEBOUNCE_MS = 100;

/** Controls already hooked (replaces the legacy `_neuronSelectizeHooked` DOM expando). */
const hookedControls = new WeakSet<Element>();

/**
 * Minimal surface of the page's Selectize instance (exposed as `input.selectize`).
 * Only the members used in this file are declared.
 */
interface SelectizeApi {
    // Selectize passes the jQuery-wrapped dropdown (array-like: the element sits at index 0)
    on(event: 'dropdown_open', handler: (dropdown: ArrayLike<HTMLElement>) => void): void;
    on(event: 'dropdown_close', handler: () => void): void;
}

/**
 * Checks available viewport space below the control and toggles dropup positioning.
 * @param {HTMLElement} dropdown - The .selectize-dropdown element
 * @param {HTMLElement} control - The parent .selectize-control element
 */
function positionDropdown(dropdown: Element, control: Element): void {
    const controlRect = control.getBoundingClientRect();
    const spaceBelow = window.innerHeight - controlRect.bottom;

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
function hookControl(control: Element): void {
    if (hookedControls.has(control)) return;
    hookedControls.add(control);

    // Find the associated input element to access the Selectize API
    const input = control.querySelector('input.selectize-input input') ||
                  control.previousElementSibling;

    // The page's Selectize plugin attaches its API to the input element as `selectize`
    const selectizeApi = input && (input as HTMLElement & { selectize?: SelectizeApi }).selectize;

    if (selectizeApi) {
        selectizeApi.on('dropdown_open', function(dropdown) {
            // Selectize passa this.$dropdown (jQuery): o elemento está em [0]
            positionDropdown((dropdown[0] || dropdown) as HTMLElement, control);
        });
        selectizeApi.on('dropdown_close', function() {
            const dropdown = control.querySelector('.selectize-dropdown');
            if (dropdown) {
                dropdown.classList.remove(DROPUP_CLASS);
            }
        });
    } else {
        // Fallback: observe for dropdown appearance via DOM mutation
        const observer = new MutationObserver(function(mutations) {
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                for (let j = 0; j < mutation.addedNodes.length; j++) {
                    const node = mutation.addedNodes[j];
                    if (node instanceof Element &&
                        node.classList.contains('selectize-dropdown')) {
                        positionDropdown(node, control);
                    }
                }
                for (let k = 0; k < mutation.removedNodes.length; k++) {
                    const removed = mutation.removedNodes[k];
                    if (removed instanceof Element &&
                        removed.classList.contains('selectize-dropdown')) {
                        // Cleanup: dropup class is removed with the element
                    }
                }
            }
        });
        observer.observe(control, { childList: true });

        // Also handle dropdowns that may already exist or appear as siblings
        // .selectize-dropdown is a <div> rendered by Selectize, hence HTMLElement (needed for offsetParent)
        const existingDropdown = control.querySelector<HTMLElement>('.selectize-dropdown');
        if (existingDropdown && existingDropdown.offsetParent !== null) {
            positionDropdown(existingDropdown, control);
        }
    }
}

/**
 * Scans the page for all .selectize-control elements and hooks them.
 */
function hookAllControls(): void {
    const controls = document.querySelectorAll('.selectize-control');
    for (let i = 0; i < controls.length; i++) {
        hookControl(controls[i]);
    }
}

/**
 * Simple debounce utility.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} Debounced function
 */
function debounce(fn: () => void, delay: number): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, delay);
    };
}

/**
 * Recalculates positioning for all open dropdowns.
 */
function recalcAllOpen(): void {
    // .selectize-dropdown is a <div> rendered by Selectize, hence HTMLElement (needed for offsetParent)
    const dropdowns = document.querySelectorAll<HTMLElement>('.selectize-dropdown');
    for (let i = 0; i < dropdowns.length; i++) {
        const dropdown = dropdowns[i];
        // Only reposition visible dropdowns
        if (dropdown.offsetParent !== null) {
            const control = dropdown.closest('.selectize-control') ||
                            dropdown.parentElement;
            if (control) {
                positionDropdown(dropdown, control);
            }
        }
    }
}

/**
 * Installs the Selectize dropdown fix on the current page: scroll/resize
 * recalculation, a MutationObserver on document.body for dynamically added
 * controls, and the initial hook of all existing .selectize-control elements.
 * Must be called from a content script once the document is available.
 */
export function initSelectizeFix(): void {
    const debouncedRecalc = debounce(recalcAllOpen, DEBOUNCE_MS);

    // Recalculate on scroll and resize with passive listeners and debounce
    window.addEventListener('scroll', debouncedRecalc, { passive: true });
    window.addEventListener('resize', debouncedRecalc, { passive: true });

    // MutationObserver on document.body to detect new .selectize-control elements
    // (ASP.NET UpdatePanel compatibility)
    const bodyObserver = new MutationObserver(function(mutations) {
        let shouldScan = false;
        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i];
            for (let j = 0; j < mutation.addedNodes.length; j++) {
                const node = mutation.addedNodes[j];
                if (node instanceof Element) {
                    if (node.classList.contains('selectize-control')) {
                        hookControl(node);
                    } else {
                        const nested = node.querySelectorAll('.selectize-control');
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
}
