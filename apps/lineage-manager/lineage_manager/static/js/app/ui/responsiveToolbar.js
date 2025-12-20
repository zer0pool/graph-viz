/**
 * ResponsiveToolbar - Handles the burger menu logic for the control bar
 */
export class ResponsiveToolbar {
    constructor() {
        this.menuBtn = document.getElementById('toolbar-menu-btn');
        this.overflowMenu = document.getElementById('toolbar-overflow-menu');
        this.mainActions = document.getElementById('toolbar-main-actions');
        this.isOpen = false;
    }

    init() {
        if (!this.menuBtn || !this.overflowMenu || !this.mainActions) return;

        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.overflowMenu.contains(e.target) && e.target !== this.menuBtn) {
                this.closeMenu();
            }
        });

        // Initialize visibility
        this.updateVisibility();
        window.addEventListener('resize', () => this.updateVisibility());
    }

    updateVisibility() {
        const isNarrow = window.matchMedia('(max-width: 650px)').matches;
        if (!isNarrow && this.isOpen) {
            this.closeMenu();
        }
    }


    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        // Move all children of mainActions to overflowMenu
        while (this.mainActions.firstChild) {
            this.overflowMenu.appendChild(this.mainActions.firstChild);
        }

        this.overflowMenu.hidden = false;
        this.isOpen = true;
    }

    closeMenu() {
        // Move everything back to mainActions
        while (this.overflowMenu.firstChild) {
            this.mainActions.appendChild(this.overflowMenu.firstChild);
        }

        this.overflowMenu.hidden = true;
        this.isOpen = false;
    }

    setupResponsiveBehavior() {
        // We use a ResizeObserver or simple media query listener to handle state cleanup
        const mediaQuery = window.matchMedia('(max-width: 650px)');

        const handleResize = (e) => {
            if (!e.matches && this.isOpen) {
                this.closeMenu();
            }
        };

        mediaQuery.addEventListener('change', handleResize);

        // Initial check
        if (!mediaQuery.matches && this.isOpen) {
            this.closeMenu();
        }
    }
}

export default ResponsiveToolbar;
