; (function () {
    'use strict';

    if (typeof cytoscape === 'undefined') { return; } // require cytoscape.js if you are using a module loader

    cytoscape('core', 'minimap', function (options) {
        var cy = this;

        var defaults = {
            position: 'top-right',
            zoomFactor: 0.2,
            overviewOpacity: 0.9,
            fitViewport: true,
            toggleDisplay: false,
            styles: {}
        };

        options = Object.assign({}, defaults, options);

        var minimap = document.createElement('canvas');
        minimap.id = 'cytoscape-minimap';
        minimap.style.position = 'absolute';
        minimap.style.width = '200px';
        minimap.style.height = '150px';
        minimap.style.opacity = options.overviewOpacity;
        minimap.style.border = '1px solid #d0d7de';
        minimap.style.borderRadius = '6px';
        minimap.style.background = '#fff';
        minimap.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        minimap.style.cursor = 'move';
        minimap.style.zIndex = '50';

        // position
        var pos = options.position;
        if (pos.includes('top')) minimap.style.top = '10px';
        if (pos.includes('bottom')) minimap.style.bottom = '10px';
        if (pos.includes('left')) minimap.style.left = '10px';
        if (pos.includes('right')) minimap.style.right = '10px';

        cy.container().appendChild(minimap);

        var ctx = minimap.getContext('2d');

        function render() {
            var bb = cy.elements().boundingBox();
            var w = minimap.width;
            var h = minimap.height;
            ctx.clearRect(0, 0, w, h);
            ctx.save();
            ctx.scale(w / bb.w, h / bb.h);
            ctx.translate(-bb.x1, -bb.y1);
            ctx.strokeStyle = '#8b949e';
            ctx.lineWidth = 1.5;

            cy.edges().forEach(e => {
                var s = e.source().position();
                var t = e.target().position();
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(t.x, t.y);
                ctx.stroke();
            });

            cy.nodes().forEach(n => {
                var p = n.position();
                ctx.fillStyle = '#0969da';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            });

            ctx.restore();
            requestAnimationFrame(render);
        }

        render();
        return minimap;
    });

})();
