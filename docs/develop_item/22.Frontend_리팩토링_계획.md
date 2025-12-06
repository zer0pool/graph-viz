📘 Lineage Manager Frontend 리팩터링 계획서 (v1.0)

범위: static/ 전체 (index.html ~ graph/panel/auth/controls 모듈)

1. 현황 분석(Current State Overview)
1.1 주요 파일 및 역할
파일	주요 기능
index.html	전체 레이아웃 + 스크립트 로딩 + 패널 영역 선언
auth.js	Google OAuth / 토큰 갱신 / window.authClient 관리
main.js(app/main.js)	앱 초기 진입점. GraphController/PanelController 초기화와 auth 준비
graph.js	Cytoscape 초기화, 렌더링, 이벤트 처리(클릭/하이라이트), 필터링, 패널 호출까지 담당 (God Object)
panel.js	Table/Job 패널 UI 제어, run history 요청, timeliness graph 렌더 등 복합 기능
controls.js	검색/필터 select UI, graph.applyFilters 호출, 패널 제어
timelinessView.js	ECharts 기반 테이블 적재 타임라인 렌더링
state.js	SelectionState, FilterState, RelationState, SearchState 등 전역 상태 객체
1.2 현 구조의 문제점

GraphController가 “표현계(View) + 도메인 + 앱 orchestration” 을 모두 담당

PanelController가 Table, Job, Timeliness 등 복수 관심사를 혼합

ControlBar가 graph 내부 API에 직접 의존하여 테스트/확장성 저해

모듈 간 의존성 방향이 명확하지 않음 (UI ↔ Graph ↔ Panel ↔ EventService 순환)

main.js가 DI + auth + layout + 초기 graph load까지 모두 처리 (과도한 책임)

1.3 DOM 구조 및 이벤트 흐름
주요 DOM 섹션

Left Control Panel

Graph Visualization Area

Right Detail Panel (Job/테이블 상세)

Timeline Graph Area

Search Box 및 Suggestions

Top Navigation Tabs

주요 이벤트 흐름

onAuthReady → main bootstrap

노드 클릭 → GraphController → SelectionState 업데이트 → PanelController.show

탭 변경 → PanelController → 세부 UI 렌더

EventService(SSE/폴링) → 그래프 invalidate → GraphController.reloadLastQuery

2. 레이아웃/HTML 구조 분리 계획
2.1 목표

index.html은 DOM 구조만 선언한다.

UI/레이아웃 제어는 JS 모듈(core/layoutShell.js)로 이동한다.

스타일은 기능 단위로 분리(SCSS 또는 CSS Partial).

2.2 리팩터링 후 index.html 구성
<body>
  <nav class="top-nav">...</nav>

  <div id="layout">
    <aside id="left-controls"></aside>
    <main id="graph-container"></main>
    <aside id="right-panel"></aside>
  </div>

  <div id="modal-root"></div>

  <script type="module" src="/static/js/app/main.js"></script>
</body>

3. 새 JS 모듈 구조 설계
static/js/
  app/
    main.js
    config.js
    bootstrap.js
    types.js (optional)
  
  core/
    dom.js
    layoutShell.js
    eventBus.js
  
  api/
    apiClient.js
    jobApi.js
    tableApi.js
    eventApi.js
    timelinessApi.js
  
  auth/
    auth.js
  
  graph/
    graphView.js
    graphController.js
    graphStyles.js
    graphSelection.js
    graphPersistence.js
  
  panels/
    panelController.js
    jobDetailView.js
    tableDetailView.js
    timelinessView.js
  
  controls/
    controlBar.js
    filterControl.js
    searchControl.js

모듈 공개 API 예시
GraphController
graph.loadGraph(nodeId)
graph.setFilter(filterState)
graph.resetView()
graph.highlightNode(id)
graph.onNodeSelected(callback)

PanelController
panel.showJob(jobData)
panel.showTable(tableData)
panel.clear()
panel.updateRelations(relations)

ControlBar
controls.init()
controls.onSearch(keyword => graph.highlight(keyword))
controls.onFilterChange(state => graph.setFilter(state))

4. 엔트리포인트(app/main.js) 재작성
기존 main.js 문제

auth → api → controllers → layout → 이벤트 바인딩, 모든 책임 집중

DOM 직접 제어코드가 많음

재사용 가능성이 낮고 테스트 불가

개선된 main.js (개요)
import { initLayoutShell } from "../core/layoutShell.js";
import { createStateStore } from "./state.js";
import { createApiClients } from "../api/index.js";
import { GraphController } from "../graph/graphController.js";
import { PanelController } from "../panels/panelController.js";
import { ControlBar } from "../controls/controlBar.js";
import { EventService } from "../api/eventApi.js";

document.addEventListener("DOMContentLoaded", async () => {
  await window.authReady;

  const layout = initLayoutShell();
  const state = createStateStore();
  const api = createApiClients(window.authClient);

  const panel = new PanelController(api, state);
  const graph = new GraphController(api, state, panel);
  const controls = new ControlBar(state, graph, panel);

  const events = new EventService(api.eventApi, graph, panel, state);
  events.start();
});

5. 기능 단위 리팩터링 로드맵
5.1 Auth 모듈

auth.js를 그대로 두되, 반환 API를 명확히(types + interface)

로그인/로그아웃 UI는 layoutShell로 이동

5.2 Graph 모듈

기존 graph.js에서 다음 단계로 분해:

graphView (Cytoscape 초기화 + render)

graphController (API/state/panel 연결)

graphSelection (선택/하이라이트 관련)

graphPersistence (좌표 저장/복원)

이는 가장 큰 변경 작업이며, 전체 안정성 확보의 핵심.

5.3 Controls 모듈

검색 / 필터 / reset 을 각각 독립 컴포넌트로 확장

graphController API에만 의존하도록 단방향화

search suggestion 로직도 controls/searchControl.js 로 이동

5.4 Panel + DetailView

PanelController는 orchestrator 역할로 단순화

JobDetailView / TableDetailView / TimelinessView 완전 분리

tab 전환은 layoutShell에서 위임

5.5 API 레이어

apiClient.js 공통 fetch 정의

jobApi / tableApi / eventApi / timelinessApi 로 기능 분리

6. 개발 인프라/빌드 구조
6.1 ESM 구조 정비

모든 파일 ES module 방식 통일(import/export)

6.2 번들러 도입 여부

short-term: 번들러 없이도 가능

mid-term: Vite/Webpack 도입 시 장점

코드 스플리팅

빠른 HMR

TS(optional) 적용 용이

6.3 Lint/Format

ESLint + Prettier 기본 rule 추가

jsdoc 기반 타입 추가 가능

7. 회귀 테스트 전략
7.1 수동 테스트 체크리스트

노드 클릭/하이라이트/이웃 강조

Job/테이블 상세 정보 정상 표시

Timeliness 그래프 정상 로딩

필터/검색 작동

우측 패널 접기/펼치기

이벤트 업데이트 시 그래프 invalidate 후 다시 렌더

7.2 자동 테스트

Cypress (UI 액션 중심)

Playwright (비동기 흐름 포함)

단위 테스트 (Jest + DOM mocking)

8. 문서화

docs/frontend-architecture.md 생성

다음 내용 포함:

디렉토리 구조

주요 컴포넌트와 역할

GraphController / PanelController / ControlBar API 명세

이벤트 흐름도

데이터 모델 schema

마지막 정리

이 플랜은 다음 효과를 보장한다:

index.html가 단순해진다

main.js가 “조립만 하는 코드”가 된다

GraphController의 God Object 성격이 사라진다

Panel/Timeliness/Controls 모듈이 기능별로 선명히 분리된다

API 호출 및 상태 관리 구조가 명확해진다

전체 리팩토링 후 유지보수가 매우 쉬워진다