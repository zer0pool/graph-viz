; (function () {
    'use strict';

    if (typeof cytoscape === 'undefined') {
        return;
    }

    cytoscape('core', 'minimap', function (options) {
        const cy = this;

        // ✅ 여기 추가
        let lastMargin = { x: 0, y: 0, ratio: 0 };

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
            border: '1px solid #d0d7de',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
            cursor: 'move',
            zIndex: '50',
        });

        // ✅ 왼쪽 아래로 위치 변경
        minimap.style.bottom = '20px'; // 화면 아래쪽에서 20px 위
        minimap.style.left = '20px';   // 왼쪽 여백 20px

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
 * ✅ 미니맵 전체 렌더링 (여백 포함 + cachedImg 반영)
 */
        /**
 * ✅ 미니맵 전체 렌더링 (여백 + 원본 비율 유지)
 */
        function renderFull() {
            try {
                const imgData = cy.png({
                    full: true,
                    scale: options.zoomFactor,
                    bg: options.background,
                });

                const rawImg = new Image();
                rawImg.onload = function () {
                    bb = cy.elements().boundingBox();

                    // ✅ 여백 비율 (0.1~0.2 권장)
                    const marginRatio = 0.05;
                    const marginX = minimap.width * marginRatio;
                    const marginY = minimap.height * marginRatio;
                    const innerWidth = minimap.width - marginX * 1;
                    const innerHeight = minimap.height - marginY * 1;

                    // ✅ 원본 그래프 비율 계산
                    const aspect = bb.w / bb.h; // 그래프 비율 (가로/세로)
                    let drawW = innerWidth;
                    let drawH = innerHeight;

                    if (drawW / drawH > aspect) {
                        // 가로가 더 넓은 경우 → 세로 기준 축소
                        drawW = drawH * aspect;
                    } else {
                        // 세로가 더 긴 경우 → 가로 기준 축소
                        drawH = drawW / aspect;
                    }

                    // ✅ 중앙 정렬 보정
                    const offsetX = marginX + (innerWidth - drawW) / 2;
                    const offsetY = marginY + (innerHeight - drawH) / 2;

                    // ✅ 임시 캔버스에 원본 비율로 그리기
                    const tmpCanvas = document.createElement("canvas");
                    tmpCanvas.width = minimap.width;
                    tmpCanvas.height = minimap.height;
                    const tmpCtx = tmpCanvas.getContext("2d");

                    tmpCtx.fillStyle = "#fff";
                    tmpCtx.fillRect(0, 0, minimap.width, minimap.height);

                    // ✅ 비율 유지 + 중앙정렬 + 여백 적용
                    tmpCtx.drawImage(rawImg, offsetX, offsetY, drawW, drawH);

                    // ✅ 완성본을 cachedImg로 저장
                    const finalImg = new Image();
                    finalImg.onload = function () {
                        cachedImg = finalImg;

                        ctx.clearRect(0, 0, minimap.width, minimap.height);
                        ctx.drawImage(finalImg, 0, 0, minimap.width, minimap.height);

                        lastMargin = { x: offsetX, y: offsetY, ratio: marginRatio };
                        drawViewportBox(offsetX, offsetY, marginRatio);
                    };
                    finalImg.src = tmpCanvas.toDataURL();
                };
                rawImg.src = imgData;
            } catch (e) {
                console.warn("Minimap render failed:", e);
            }
        }




        /**
         * ✅ 뷰포트 사각형만 빠르게 갱신 (여백 포함 + 누적 방지)
         */
        function drawViewportBox(
            marginX = lastMargin.x,
            marginY = lastMargin.y,
            marginRatio = lastMargin.ratio
        ) {
            if (!cachedImg || !bb) {
                console.warn("⚠️ cachedImg not ready yet");
                return;
            }

            const pan = cy.pan();
            const zoom = cy.zoom();
            const container = cy.container().getBoundingClientRect();

            const scaleX = minimap.width / bb.w;
            const scaleY = minimap.height / bb.h;
            const ratio = Math.min(scaleX, scaleY);

            const vpW = (container.width * ratio) / zoom;
            const vpH = (container.height * ratio) / zoom;
            const vpX = (-pan.x - bb.x1) * ratio;
            const vpY = (-pan.y - bb.y1) * ratio;

            ctx.save();

            // ✅ 이전 박스 제거용으로 전체를 clear
            ctx.clearRect(0, 0, minimap.width, minimap.height);

            // ✅ margin 적용된 그래프 이미지 다시 그림
            ctx.drawImage(cachedImg, 0, 0, minimap.width, minimap.height);

            // ✅ 새 뷰포트 박스만 표시
            ctx.strokeStyle = "#1a73e8";
            ctx.lineWidth = 1;
            ctx.fillStyle = "rgba(26, 115, 232, 0.12)";
            ctx.beginPath();
            ctx.rect(
                vpX + marginX,
                vpY + marginY,
                vpW * (1 - marginRatio),
                vpH * (1 - marginRatio)
            );
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
        cy.on('pan zoom', () => drawViewportBox(lastMargin.x, lastMargin.y, lastMargin.ratio));

        // 초기 렌더
        renderFull();


        /**
     * ✅ 브라우저 크기 변경 시 미니맵 위치/렌더 재계산
     */
        window.addEventListener('resize', () => {
            if (!minimap || !cy) return;


            // ✅ 왼쪽 아래 고정 (navbar 높이 고려 불필요)
            minimap.style.bottom = '20px';
            minimap.style.left = '20px';

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
