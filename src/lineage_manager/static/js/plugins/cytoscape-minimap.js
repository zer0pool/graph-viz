; (function () {
    'use strict';

    if (typeof cytoscape === 'undefined') {
        return;
    }

    cytoscape('core', 'minimap', function (options) {
        const cy = this;

        let lastViewState = null;

        const defaults = {
            position: 'top-right',
            zoomFactor: 0.2,
            overviewOpacity: 0.95,
            refreshRate: 200, // ms 단위 (렌더링 지연)
            background: '#ffffff',
        };

        options = Object.assign({}, defaults, options);

        // ✅ minimap canvas 생성
        const minimap = document.createElement('canvas');
        minimap.id = 'cytoscape-minimap';
        minimap.width = 200;
        minimap.height = 120;

        Object.assign(minimap.style, {
            position: 'fixed',
            width: '200px',
            height: '120px',
            opacity: options.overviewOpacity,
            border: '1px solid rgba(26, 115, 232, 0.7)',
            borderRadius: '6px',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            cursor: 'move',
            zIndex: '50',
        });

        minimap.style.bottom = '20px';
        minimap.style.right = '20px';
        minimap.style.left = 'auto';
        minimap.style.boxShadow = '0 12px 32px rgba(15,23,42,0.18)';
        minimap.style.borderRadius = '10px';

        // ✅ 위치 설정
        // const pos = options.position;
        // if (pos.includes('top')) minimap.style.top = '10px';
        // if (pos.includes('bottom')) minimap.style.bottom = '10px';
        // if (pos.includes('left')) minimap.style.left = '10px';
        // if (pos.includes('right')) minimap.style.right = '10px';

        cy.container().appendChild(minimap);
        const ctx = minimap.getContext('2d');

        // 내부 상태 저장 (이미지 + bounding box)
        let cachedImg = null;
        let bb = null;

        /**
 * ✅ 미니맵 전체 렌더링 (단순화된 노드 실루엣)
 */
        function renderFull() {
            try {
                bb = cy.elements().boundingBox();
                if (!bb || !isFinite(bb.w) || !isFinite(bb.h) || bb.w === 0 || bb.h === 0) {
                    bb = { x1: -100, y1: -100, x2: 100, y2: 100, w: 200, h: 200 };
                }

                const margin = Math.min(minimap.width, minimap.height) * 0.08;
                const innerWidth = Math.max(minimap.width - margin * 2, 10);
                const innerHeight = Math.max(minimap.height - margin * 2, 10);
                const scale = Math.min(innerWidth / bb.w, innerHeight / bb.h);
                const drawWidth = bb.w * scale;
                const drawHeight = bb.h * scale;
                const offsetX = margin + (innerWidth - drawWidth) / 2;
                const offsetY = margin + (innerHeight - drawHeight) / 2;

                const tmpCanvas = document.createElement("canvas");
                tmpCanvas.width = minimap.width;
                tmpCanvas.height = minimap.height;
                const tmpCtx = tmpCanvas.getContext("2d");

                tmpCtx.clearRect(0, 0, minimap.width, minimap.height);
                tmpCtx.globalAlpha = 1;
                tmpCtx.fillStyle = "rgba(248, 250, 255, 0.95)";
                tmpCtx.fillRect(0, 0, minimap.width, minimap.height);

                const nodes = cy.nodes(":visible");
                nodes.forEach((node) => {
                    const pos = node.position();
                    if (!pos) return;
                    const x = offsetX + (pos.x - bb.x1) * scale;
                    const y = offsetY + (pos.y - bb.y1) * scale;
                    const baseSize = Math.max(node.width(), node.height());
                    const radius = Math.min(6, Math.max(2, (baseSize || 20) * scale * 0.25));
                    const type = (node.data("type") || "").toLowerCase();
                    let color = "#94a3b8";
                    if (type === "table") color = "#7baaf7";
                    else if (type === "job") color = "#fbbc04";
                    else if (type === "storage") color = "#a3bffa";

                    tmpCtx.beginPath();
                    tmpCtx.globalAlpha = 0.9;
                    tmpCtx.fillStyle = color;
                    tmpCtx.arc(x, y, radius, 0, Math.PI * 2);
                    tmpCtx.fill();
                });
                tmpCtx.globalAlpha = 1;

                const finalImg = new Image();
                finalImg.onload = function () {
                    cachedImg = finalImg;
                    ctx.clearRect(0, 0, minimap.width, minimap.height);
                    ctx.drawImage(finalImg, 0, 0, minimap.width, minimap.height);
                    lastViewState = { offsetX, offsetY, scale };
                    drawViewportBox();
                };
                finalImg.src = tmpCanvas.toDataURL();
            } catch (e) {
                console.warn("Minimap render failed:", e);
            }
        }




        /**
         * ✅ 뷰포트 사각형만 빠르게 갱신 (여백 포함 + 누적 방지)
         */
        function drawViewportBox() {
            if (!cachedImg || !bb || !lastViewState) {
                console.warn("⚠️ cachedImg not ready yet");
                return;
            }

            const pan = cy.pan();
            const zoom = cy.zoom();
            const container = cy.container().getBoundingClientRect();

            const { offsetX, offsetY, scale } = lastViewState;
            const vpW = (container.width * scale) / zoom;
            const vpH = (container.height * scale) / zoom;
            const vpX = offsetX + (-pan.x - bb.x1) * scale;
            const vpY = offsetY + (-pan.y - bb.y1) * scale;

            ctx.save();

            ctx.clearRect(0, 0, minimap.width, minimap.height);

            ctx.drawImage(cachedImg, 0, 0, minimap.width, minimap.height);

            // ✅ 새 뷰포트 박스만 표시
            ctx.strokeStyle = "#1a73e8";
            ctx.lineWidth = 1;
            ctx.fillStyle = "rgba(26, 115, 232, 0.12)";
            ctx.beginPath();
            ctx.rect(vpX, vpY, vpW, vpH);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        /**
         * ✅ 이벤트 최적화
         */
        let renderTimer = null;
        const triggerRender = () => {
            clearTimeout(renderTimer);
            renderTimer = setTimeout(renderFull, options.refreshRate);
        };



        // ✅ 레이아웃 완료 후 전체 렌더
        cy.on('layoutstop', triggerRender);
        // 🔹 그래프 구조나 스타일이 변경될 때도 갱신
        cy.on('add remove data style', triggerRender);
        cy.on('hide show', triggerRender);
        cy.on('position', triggerRender);



        // ✅ pan/zoom 시엔 뷰포트 박스만 갱신
        cy.on('pan zoom', () => drawViewportBox());

        // 초기 렌더
        renderFull();


        /**
     * ✅ 브라우저 크기 변경 시 미니맵 위치/렌더 재계산
     */
        window.addEventListener('resize', () => {
            if (!minimap || !cy) return;


            // ✅ 왼쪽 아래 고정 (navbar 높이 고려 불필요)
            minimap.style.bottom = '20px';
            minimap.style.right = '20px';
            minimap.style.left = 'auto';

            // Cytoscape 컨테이너에 다시 append (사라졌을 경우 대비)
            if (!cy.container().contains(minimap)) {
                cy.container().appendChild(minimap);
            }

            // 미니맵 다시 렌더링
            setTimeout(() => {
                renderFull();
            }, 300);
        });

        return minimap;
    });


})();
