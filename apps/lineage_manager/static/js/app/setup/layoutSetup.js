/**
 * layoutSetup - UI shell initialization and event binding
 * Extracted from main.js (~170 lines)
 */

export function setupExplorerShell() {
    const controlPanel = document.getElementById("control-panel");
    const detailPanel = document.getElementById("detail-panel");
    const controlToggle = document.getElementById("control-toggle");
    const detailToggle = document.getElementById("detail-toggle");

    if (!controlPanel && !detailPanel) return;

    const setPanelState = (panel, button, open) => {
        if (!panel || !button) return;
        panel.classList.toggle("collapsed", !open);
        button.setAttribute("aria-expanded", open ? "true" : "false");

        const collapsedIcon = button.dataset?.collapsedIcon || "›";
        const expandedIcon = button.dataset?.expandedIcon || "‹";
        const chevron = button.querySelector(".chevron");

        if (chevron) chevron.textContent = open ? expandedIcon : collapsedIcon;
    };

    const togglePanel = (panel, button) => {
        if (!panel || !button) return false;
        const nextOpen = panel.classList.contains("collapsed");
        setPanelState(panel, button, nextOpen);
        return nextOpen;
    };

    controlToggle?.addEventListener("click", () => {
        togglePanel(controlPanel, controlToggle);
    });

    detailToggle?.addEventListener("click", () => {
        togglePanel(detailPanel, detailToggle);
    });

    if (controlPanel && controlToggle) {
        setPanelState(controlPanel, controlToggle, !controlPanel.classList.contains("collapsed"));
    }
    if (detailPanel && detailToggle) {
        setPanelState(detailPanel, detailToggle, !detailPanel.classList.contains("collapsed"));
    }

    document.addEventListener("detail-panel:selection", (evt) => {
        if (!detailPanel || !detailToggle) return;
        const open = Boolean(evt.detail?.hasSelection);
        setPanelState(detailPanel, detailToggle, open);
    });

    document.addEventListener("detail-panel:toggle", () => {
        togglePanel(detailPanel, detailToggle);
    });
}

export function setupViewToggle(graphController, listViewController) {
    const tabs = document.querySelectorAll(".view-tab");
    if (!tabs.length) return;

    const graphView = document.querySelector("#mermaid-graph");
    const listView = document.querySelector("#list-view");
    const contextMenu = document.getElementById('node-context-menu');

    console.log('[ViewToggle] Initializing', { tabs: tabs.length, graphView: !!graphView, listView: !!listView });

    const setActive = (mode) => {
        console.log('[ViewToggle] Setting mode:', mode);

        tabs.forEach((btn) => {
            const isList = btn.textContent.trim().toLowerCase() === "list";
            const active = mode === "list" ? isList : !isList;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-selected", active ? "true" : "false");
        });

        // Toggle DOM elements
        if (mode === "list") {
            console.log('[ViewToggle] Showing List view');

            // Show listview and hide context menu when switching to list view
            if (listView) listView.hidden = false;

            // Hide graphview and context menu when switching to list view
            if (graphView) graphView.hidden = true;
            if (contextMenu) contextMenu.hidden = true;

            // Update list view
            if (listViewController?.updateListView) {
                console.log('[ViewToggle] Updating list view');
                listViewController.updateListView();
            } else if (graphController?.listView?.updateListView) {
                console.log('[ViewToggle] Updating list view via graphController');
                graphController.listView.updateListView();
            }
        } else {
            console.log('[ViewToggle] Showing Graph view');
            if (graphView) graphView.hidden = false;
            if (listView) listView.hidden = true;
        }

        // Call ListView.setViewMode
        if (listViewController?.setViewMode) {
            console.log('[ViewToggle] Calling listViewController.setViewMode');
            listViewController.setViewMode(mode);
        } else {
            console.warn('[ViewToggle] listViewController.setViewMode not found');
        }
    };

    tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            const mode = btn.textContent.trim().toLowerCase() === "list" ? "list" : "graph";
            console.log('[ViewToggle] Tab clicked:', mode);
            setActive(mode);
        });
    });

    setActive("graph");
    console.log('[ViewToggle] Initialized');
}

export function setupDetailTabs() {
    const groups = document.querySelectorAll(".detail-tabs");
    if (!groups.length) return;

    groups.forEach((group) => {
        const tabs = group.querySelectorAll(".detail-tab");
        if (!tabs.length) return;

        const groupName = group.dataset.tabGroup || "default";
        const panelsContainer = document.querySelector(
            `.detail-tab-panels[data-tab-group="${groupName}"]`
        );

        const panes = panelsContainer
            ? panelsContainer.querySelectorAll(".detail-pane")
            : document.querySelectorAll(
                `.detail-pane[data-tab-panel][data-group="${groupName}"]`
            );

        const defaultTab = group.dataset.defaultTab || tabs[0]?.dataset.tab || "schema";

        const activate = (target, suppressEvent = false) => {
            tabs.forEach((tab) => {
                const isActive = tab.dataset.tab === target;
                tab.classList.toggle("active", isActive);
                tab.setAttribute("aria-selected", isActive ? "true" : "false");
            });

            panes.forEach((pane) => {
                pane.classList.toggle("active", pane.dataset.tabPanel === target);
            });

            if (!suppressEvent) {
                document.dispatchEvent(
                    new CustomEvent("detail-tabs:changed", {
                        detail: { group: groupName, tab: target },
                    })
                );
            }
        };

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const target = tab.dataset.tab || defaultTab;
                activate(target);
            });
        });

        activate(defaultTab, true);
    });
}

export function setupDetailResizer() {
    const detailPanel = document.getElementById("detail-panel");
    const resizer = document.getElementById("detail-resizer");

    if (!detailPanel || !resizer) return;

    const clampWidth = (width) => {
        const min = Math.max(window.innerWidth * 0.2, 240);
        const max = Math.max(window.innerWidth * 0.5, min + 40);
        return Math.min(Math.max(width, min), max);
    };

    let currentWidth = detailPanel.getBoundingClientRect().width;

    const applyWidth = (width) => {
        const clamped = clampWidth(width);
        currentWidth = clamped;
        document.documentElement.style.setProperty("--detail-panel-width", `${clamped}px`);
        detailPanel.style.width = `${clamped}px`;

        document.dispatchEvent(
            new CustomEvent("detail-panel:resized", {
                detail: { width: clamped },
            })
        );
    };

    let startX = 0;
    let startWidth = 0;
    let dragging = false;

    const handleDrag = (event) => {
        if (!dragging) return;
        const delta = startX - event.clientX;
        applyWidth(startWidth + delta);
    };

    const stopDrag = () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleDrag);
        document.removeEventListener("mouseup", stopDrag);
    };

    resizer.addEventListener("mousedown", (event) => {
        if (detailPanel.classList.contains("collapsed")) return;

        dragging = true;
        startX = event.clientX;
        startWidth = detailPanel.getBoundingClientRect().width;
        document.body.style.userSelect = "none";

        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("mouseup", stopDrag);
    });

    window.addEventListener("resize", () => {
        const current = detailPanel.getBoundingClientRect().width;
        if (!detailPanel.classList.contains("collapsed")) {
            applyWidth(current);
        }
    });

    const observer = new MutationObserver(() => {
        const collapsed = detailPanel.classList.contains("collapsed");
        resizer.hidden = collapsed;

        if (collapsed) {
            detailPanel.style.removeProperty("width");
            document.dispatchEvent(
                new CustomEvent("detail-panel:resized", {
                    detail: { width: 0 },
                })
            );
        } else {
            applyWidth(currentWidth);
        }
    });

    observer.observe(detailPanel, { attributes: true, attributeFilter: ["class"] });
    resizer.hidden = detailPanel.classList.contains("collapsed");
}
