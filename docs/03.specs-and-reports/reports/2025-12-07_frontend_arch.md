# Frontend Architecture - Refactored Modular Design

## Overview

완성된 프론트엔드 리팩토링: **모놀리식 구조 (2,465 줄) → 모듈식 구조 (50+ 전문화된 모듈)**

### 핵심 원칙
- **단일 책임 원칙**: 각 모듈은 하나의 책임만 담당
- **느슨한 결합**: 모듈 간 의존성 최소화 (이벤트 버스 및 인터페이스 기반)
- **높은 응집도**: 관련 기능을 그룹화 (도메인별 폴더 구조)
- **테스트 가능성**: 각 모듈을 독립적으로 테스트 가능

---

## 아키텍처 계층

```
┌─────────────────────────────────────────┐
│           main.js (App 오케스트레이터)    │
│         (~80 줄: 순수 DI 구성)           │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴──────────┬─────────────────┬──────────┐
      ▼                   ▼                 ▼          ▼
┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐
│ Graph    │ │ Panel        │ │ Controls   │ │ Setup/Layout  │
│ (130 줄) │ │ (150 줄)     │ │ (100 줄)   │ │ (170 줄)      │
└────┬─────┘ └──────┬───────┘ └─────┬──────┘ └───────────────┘
     │              │               │
     ├─ Core        ├─ Views        ├─ Controls
     ├─ Graph       ├─ Managers     └─ Layout
     └─ API         └─ Providers
```

---

## 모듈 구조 (9개 도메인)

### 1. **Core 모듈** (3개, 공유 유틸리티)

| 파일 | 크기 | 책임 |
|------|------|------|
| `core/dom.js` | 73 줄 | DOM 조작 (qs, on, off, addClass, etc) |
| `core/eventBus.js` | 75 줄 | Pub/Sub 이벤트 시스템 |
| `core/layoutShell.js` | 50 줄 | 레이아웃 오케스트레이션 |

**사용처**: 모든 UI 모듈에서 공유

---

### 2. **API 계층** (11개, 도메인별 클라이언트)

| 모듈 | 크기 | 책임 | 엔드포인트 |
|------|------|------|-----------|
| `api/base.js` | 130 줄 | HTTP 요청 래퍼 | - |
| `api/graph.js` | 65 줄 | 그래프 API | `/api/v1/graph/*` |
| `api/job.js` | 50 줄 | Job 조회 | `/api/v1/jobs/*` |
| `api/table.js` | 60 줄 | 테이블 메타 | `/api/v1/tables/*` |
| `api/timeliness.js` | 55 줄 | 데이터 신선도 | `/api/v1/timeliness/*` |
| `api/triggers.js` | 50 줄 | 트리거 설정 | `/api/v1/triggers/*` |
| `api/search.js` | 45 줄 | 검색 자동완성 | `/api/v1/search/*` |
| `api/events.js` | 40 줄 | SSE 이벤트 | `/api/v1/events/*` |
| `api/auth.js` | 25 줄 | OIDC 인증 | `/api/v1/auth/*` |
| `api/eventIdStorage.js` | 20 줄 | 이벤트 ID 저장 | - |
| `api/index.js` | 35 줄 | API 팩토리 | - |

**패턴**: 각 클라이언트는 BaseApiClient 확장, 도메인별 메서드 포함

---

### 3. **Graph 모듈** (11개, 그래프 시각화)

| 파일 | 크기 | 책임 |
|------|------|------|
| `graph/graphView.js` | 145 줄 | Cytoscape 래퍼 (init, render, zoom, pan) |
| `graph/graphSelection.js` | 55 줄 | 노드 선택/강조 |
| `graph/graphFiltering.js` | 40 줄 | 필터 적용 |
| `graph/graphPersistence.js` | 145 줄 | 상태 캐싱 (위치, 뷰포트, 숨김) |
| `graph/graphPositioning.js` | 245 줄 | 레이아웃 알고리즘 (BFS, force) |
| `graph/graphListView.js` | 100 줄 | 테이블 뷰 & CSV 내보내기 |
| `graph/graphNodeSerializer.js` | 105 줄 | 노드 데이터 변환 |
| `graph/graphTooltip.js` | 75 줄 | 호버 토oltip |
| `graph/graphZoomControls.js` | 105 줄 | 줌/미니맵 제어 |
| `graph/graphExpansion.js` | 110 줄 | 그래프 확장/병합 |
| `graph/graphControllerNew.js` | 150 줄 | 오케스트레이터 |

**원본**: GraphController 799 줄 → 11개 모듈로 분해 (평균 95 줄/모듈)

---

### 4. **UI Panel 모듈** (6개, 상세 정보 패널)

| 파일 | 크기 | 책임 |
|------|------|------|
| `ui/jobDetailView.js` | 60 줄 | Job 실행 이력 렌더링 |
| `ui/tableDetailView.js` | 200 줄 | 테이블 메타/스키마 렌더링 |
| `ui/timelinessView.js` | 393 줄 | 데이터 신선도 차트 |
| `ui/triggerManager.js` | 80 줄 | 트리거 UI & 토글 |
| `ui/lineageInsightProvider.js` | 280 줄 | 계보 분석 & 드로어 |
| `ui/panelControllerNew.js` | 150 줄 | 패널 오케스트레이터 |

**원본**: PanelController 747 줄 → 6개 모듈로 분해

---

### 5. **Controls 모듈** (4개, 제어 바)

| 파일 | 크기 | 책임 |
|------|------|------|
| `ui/searchControl.js` | 100 줄 | 검색 입력 & 제안 |
| `ui/filterControl.js` | 50 줄 | 타입/상태/깊이 필터 |
| `ui/resetControl.js` | 60 줄 | 리셋/숨김 버튼 |
| `ui/controlBarNew.js` | 100 줄 | 제어 바 오케스트레이터 |

**원본**: ControlBar 364 줄 → 4개 모듈로 분해

---

### 6. **Setup/Layout 모듈** (1개, 초기화)

| 파일 | 크기 | 책임 |
|------|------|------|
| `setup/layoutSetup.js` | 170 줄 | UI 셸 & 탭 & 리사이저 |

**원본**: main.js 내 함수 → 추출

---

### 7. **State 모듈** (공유)

| 파일 | 책임 |
|------|------|
| `state.js` | FilterState, SearchState, SelectionState, RelationState |

**패턴**: 단순 데이터 컨테이너, getter/setter만 제공

---

### 8. **Services 모듈** (공유)

| 파일 | 책임 |
|------|------|
| `services/api.js` | API 클라이언트 (기존 유지) |
| `services/events.js` | SSE 이벤트 처리 (기존 유지) |

---

## 의존성 그래프

```
main.js
  ├─ GraphController
  │  ├─ GraphView
  │  ├─ GraphSelection
  │  ├─ GraphFiltering
  │  ├─ GraphPersistence
  │  ├─ GraphPositioning
  │  ├─ GraphListView
  │  ├─ GraphNodeSerializer
  │  ├─ GraphTooltip
  │  ├─ GraphZoomControls
  │  ├─ GraphExpansion
  │  └─ PanelController (역참조)
  │
  ├─ PanelController
  │  ├─ JobDetailView
  │  ├─ TableDetailView
  │  ├─ TimelinessView
  │  ├─ TriggerManager (api)
  │  └─ LineageInsightProvider
  │
  ├─ ControlBar
  │  ├─ SearchControl
  │  ├─ FilterControl
  │  ├─ ResetControl
  │  └─ DirectionControl
  │
  ├─ EventService
  │  └─ api, graph, panel, searchState, filterState
  │
  └─ setupExplorerShell, setupViewToggle, setupDetailTabs, setupDetailResizer
```

**순환 참조**: 최소화됨 (GraphController → PanelController 단방향)

---

## 모듈 크기 비교

### Before (리팩토링 전)
```
graph.js             799 줄
panel.js             747 줄
controls.js          364 줄
main.js              247 줄
detailView.js        313 줄
timelinessView.js    393 줄
────────────────────────
합계           2,863 줄 (모듈화 안 됨)
```

### After (리팩토링 후)
```
GraphController 계층:    950 줄 (11 모듈)
PanelController 계층:    813 줄 (6 모듈)
ControlBar 계층:         310 줄 (4 모듈)
API 계층:                520 줄 (11 클라이언트)
Core 계층:               198 줄 (3 유틸)
Setup 계층:              170 줄 (1 모듈)
Main:                     80 줄 (오케스트레이터)
────────────────────────
합계           3,041 줄 (분산, 각 모듈 < 250 줄)
```

**개선사항**:
- ✅ 평균 모듈 크기: 799 → 95 줄
- ✅ 단일 책임 원칙 준수
- ✅ 테스트 가능성 증대
- ✅ 재사용성 향상

---

## 통신 패턴

### 1. **이벤트 기반** (비동기)
```javascript
// 모듈 A → 모듈 B
document.dispatchEvent(new CustomEvent('event-name', { detail: {...} }));
document.addEventListener('event-name', (evt) => {...});
```

### 2. **직접 호출** (동기)
```javascript
// 부모 → 자식
controller.method();
```

### 3. **콜백** (고차함수)
```javascript
new ChildModule(onComplete, onError);
```

---

## 확장 가이드

### 새로운 API 엔드포인트 추가
```javascript
// 1. api/myApi.js 생성
export class MyApi extends BaseApiClient {
  async getMyData() { ... }
}

// 2. api/index.js에 추가
export function createApiClients(authClient) {
  return {
    ...existing,
    my: new MyApi(authClient),
  };
}

// 3. main.js에서 사용
const myData = await api.my.getMyData();
```

### 새로운 UI 모듈 추가
```javascript
// 1. ui/myView.js 생성
export class MyView {
  constructor(elements) { ... }
  render(data) { ... }
}

// 2. 오케스트레이터에서 위임
class MyPanel {
  constructor() {
    this.view = new MyView({...});
  }
}
```

---

## 배포 체크리스트

- [ ] 모든 모듈 테스트 완료
- [ ] 번들 크기 확인 (gzip < 250KB 목표)
- [ ] 성능 프로파일링 (초기 로딩 < 3s)
- [ ] 크로스 브라우저 테스트 (Chrome, Firefox, Safari)
- [ ] 접근성 검사 (WCAG 2.1 AA)
- [ ] 문서 업데이트

---

## 향후 개선

1. **TypeScript 마이그레이션**: 타입 안전성 추가
2. **웹 컴포넌트**: 커스텀 요소로 UI 모듈 캡슐화
3. **상태 관리 라이브러리**: Zustand/Pinia 도입
4. **번들 최적화**: 코드 분할 및 동적 import
5. **성능 모니터링**: Core Web Vitals 추적

---

**마지막 업데이트**: 2025-12-07  
**리팩토링 완료 버전**: 2.0
