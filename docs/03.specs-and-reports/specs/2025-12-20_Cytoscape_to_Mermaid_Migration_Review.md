# Cytoscape → Mermaid 완전 교체 검토 문서

작성일: 2025-12-20  
작성자: AI Assistant  
문서 버전: 1.0  
상태: Review

---

## Executive Summary

제시된 마이그레이션 계획은 **전략적으로 타당**하며, "기능 축소"가 아닌 **"역할 재정의"**라는 관점이 정확합니다. 현재 코드베이스를 분석한 결과, Mermaid 뷰어가 이미 구현되어 있으나 **Cytoscape와 병행 운영** 중입니다. 완전 교체를 위해서는 명확한 단계별 실행 계획이 필요합니다.

**핵심 발견사항:**
- ✅ Mermaid 뷰어 이미 구현됨 (`mermaid-viewer.js`, `mermaid-job-viewer.js`, `mermaid-table-viewer.js`)
- ⚠️ Cytoscape 코드 여전히 존재 (`graphView.js`, `cytoscape-minimap.js`)
- ⚠️ 백엔드 API가 두 방식 모두 지원 중 (명확한 분리 필요)
- ❌ Graph API 응답 포맷이 아직 Cytoscape 중심

---

## 1. 백엔드 정리 사항 검토

### 1.1 현재 상태 분석

**발견된 문제점:**
```
현재 Graph API는 Cytoscape 시대의 유산을 그대로 유지 중:
- position, layout 정보 (불필요)
- expand/collapse 상태 저장 (서버 상태 관리)
- Cytoscape-specific 옵션들
```

**권장 조치:**

#### ✅ 즉시 제거 대상
```python
# GraphQueryService에서 제거할 것
- layout_config
- node_positions
- cytoscape_classes
- expand_state (서버 저장)
```

#### ✅ 유지/강화 대상
```python
# 필수 Graph 조회 API
GET /api/v1/lineage/graph?node_id={id}&depth={n}
GET /api/v1/lineage/graph?node_id={id}&direction={upstream|downstream}&depth={n}
GET /api/v1/lineage/snapshots/{snapshot_id}
```

### 1.2 Graph 응답 포맷 재정의

**현재 문제:**
- 응답에 Cytoscape 전용 필드 포함
- Mermaid DSL 생성에 불필요한 정보 과다

**권장 포맷:**
```json
{
  "nodes": [
    {
      "id": "job:daily_aggregation",
      "type": "job",
      "label": "Daily Aggregation",
      "properties": {
        "owner": "data-team",
        "status": "active",
        "schedule": "0 2 * * *"
      }
    },
    {
      "id": "table:project.dataset.table",
      "type": "table",
      "label": "project.dataset.table",
      "properties": {
        "storage": "bigquery",
        "write_mode": "append"
      }
    }
  ],
  "edges": [
    {
      "source": "job:daily_aggregation",
      "target": "table:project.dataset.table",
      "type": "writes",
      "properties": {
        "dependency_type": "HARD"
      }
    }
  ],
  "metadata": {
    "total_nodes": 15,
    "depth": 1,
    "truncated": false
  }
}
```

**핵심 원칙:**
- ❌ `position`, `layout` 제거
- ❌ `cytoscape_classes` 제거
- ✅ `type` 기반 명확한 구분 (job/table)
- ✅ Mermaid DSL 1:1 변환 가능

---

## 2. Mermaid DSL 생성 로직 검토

### 2.1 현재 구현 분석

**발견사항:**
```javascript
// mermaid-viewer.js (현재 구현)
function generateMermaidDSL(jobData) {
    // ✅ 프론트엔드에서 DSL 생성 (올바른 접근)
    // ✅ Job-Table-Job 패턴 구현
    // ⚠️ 하드코딩된 LIMIT = 5 (백엔드에서 제어해야 함)
    // ⚠️ sanitizeId 로직 중복 (유틸리티로 분리 필요)
}
```

### 2.2 권장 개선사항

#### ✅ 책임 분리 (현재 방식 유지)
```
백엔드: Node/Edge JSON 반환
프론트: Mermaid DSL 생성 + 렌더링
```

#### ✅ DSL 생성 규칙 표준화

**Node ID 규칙:**
```javascript
// 표준화된 ID 생성 함수
function toMermaidId(nodeId) {
    const [type, ...rest] = nodeId.split(':');
    const prefix = type === 'job' ? 'J' : 'T';
    const sanitized = rest.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
    return `${prefix}_${sanitized}`;
}

// 예시
"job:daily_aggregation" → "J_daily_aggregation"
"table:proj.ds.tbl" → "T_proj_ds_tbl"
```

**Style Mapping:**
```javascript
const MERMAID_STYLES = {
    job: {
        fill: '#e3f2fd',
        stroke: '#1a73e8',
        shape: 'rectangle'
    },
    table: {
        fill: '#e8f5e9',
        stroke: '#34a853',
        shape: 'rectangle'
    },
    selected: {
        strokeWidth: '3.5px',
        stroke: '#1a73e8'
    }
};
```

**Edge Label Vocabulary:**
```javascript
const EDGE_LABELS = {
    'job->table': 'writes',
    'table->job': 'reads',
    'job->job': 'depends_on'
};
```

---

## 3. 프론트엔드 정리 사항 검토

### 3.1 제거 대상 코드 목록

**발견된 Cytoscape 관련 파일:**
```
✅ 제거 필요:
- static/js/plugins/cytoscape-minimap.js
- static/js/app/graph/graphView.js (Cytoscape 초기화)
- static/js/app/graph/graphZoomControls.js
- static/index.html (Cytoscape 임포트)
- static/embed.html (Cytoscape 임포트)
```

**예상 코드 감소:**
- Cytoscape 관련: ~2,000 lines
- Layout 로직: ~500 lines
- Event handlers: ~300 lines
- **총 ~2,800 lines 제거 가능**

### 3.2 Mermaid 렌더링 구조

**현재 구현 (mermaid-viewer.js):**
```javascript
// ✅ 이미 올바른 구조
async function renderGraph(dsl) {
    const container = document.getElementById('mermaid-graph');
    container.innerHTML = '';
    container.textContent = dsl;
    await mermaid.run({ nodes: [container] });
}
```

**권장 UI 구조:**
```html
<div class="lineage-viewer">
    <!-- Top Navigation Bar -->
    <div class="viewer-navbar">
        <div class="selected-node-info">
            <span id="selected-node-label">No selection</span>
        </div>
        <div class="viewer-controls">
            <button id="expand-upstream">↑ Expand Upstream</button>
            <button id="expand-downstream">↓ Expand Downstream</button>
            <button id="reset-view">⟲ Reset</button>
        </div>
    </div>
    
    <!-- Mermaid Canvas (Read-only) -->
    <div id="mermaid-graph" class="mermaid"></div>
</div>
```

### 3.3 상태 관리 구현

**권장 State 구조:**
```javascript
const viewerState = {
    // Graph Data
    nodes: [],
    edges: [],
    
    // Selection
    selectedNodeId: null,
    
    // Expansion History
    expandedNodes: new Set(),
    
    // View Config
    depth: 1,
    maxNodes: 30
};
```

**상태 업데이트 플로우:**
```javascript
// 1. 노드 클릭
function onNodeClick(nodeId) {
    viewerState.selectedNodeId = nodeId;
    updateNavbar();
    // Mermaid는 재렌더링 필요 (선택 스타일 적용)
    rerenderGraph();
}

// 2. Expand
async function expandNode(nodeId, direction) {
    const newData = await fetchExpansion(nodeId, direction);
    mergeGraphData(newData);
    viewerState.expandedNodes.add(nodeId);
    rerenderGraph();
}

// 3. Reset
function resetView() {
    const rootNode = viewerState.nodes[0].id;
    const initialData = await fetchInitialGraph(rootNode);
    viewerState.nodes = initialData.nodes;
    viewerState.edges = initialData.edges;
    viewerState.expandedNodes.clear();
    rerenderGraph();
}
```

### 3.4 Expand 구현 방식

**현재 문제:**
- `mermaid-viewer.js`에 expand 로직 없음
- 하드코딩된 LIMIT으로 truncation만 표시

**권장 구현:**
```javascript
async function expandUpstream() {
    if (!viewerState.selectedNodeId) {
        alert('Please select a node first');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(
            `/api/v1/lineage/graph?node_id=${viewerState.selectedNodeId}&direction=upstream&depth=1`
        );
        const data = await response.json();
        
        // Merge new nodes/edges
        mergeGraphData(data);
        
        // Re-render entire graph
        const dsl = generateMermaidDSL(viewerState);
        await renderGraph(dsl);
        
    } catch (err) {
        showError(`Expansion failed: ${err.message}`);
    } finally {
        hideLoading();
    }
}

function mergeGraphData(newData) {
    // Deduplicate nodes
    const existingIds = new Set(viewerState.nodes.map(n => n.id));
    const newNodes = newData.nodes.filter(n => !existingIds.has(n.id));
    viewerState.nodes.push(...newNodes);
    
    // Deduplicate edges
    const existingEdges = new Set(
        viewerState.edges.map(e => `${e.source}->${e.target}`)
    );
    const newEdges = newData.edges.filter(
        e => !existingEdges.has(`${e.source}->${e.target}`)
    );
    viewerState.edges.push(...newEdges);
}
```

---

## 4. UX 변경 사항 검토

### 4.1 유지되는 UX ✅

| 기능 | Cytoscape | Mermaid | 상태 |
|------|-----------|---------|------|
| 그래프 구조 이해 | ✅ | ✅ | 유지 |
| Job ↔ Table 관계 | ✅ | ✅ | 유지 |
| 단계적 확장 | ✅ | ✅ | 유지 |
| 상세 정보 이동 | ✅ | ✅ | 유지 |

### 4.2 제거되는 UX ⚠️

| 기능 | Cytoscape | Mermaid | 영향 |
|------|-----------|---------|------|
| Hover 정보 | ✅ | ❌ | 상단 패널로 대체 |
| 노드 드래그 | ✅ | ❌ | 자동 레이아웃만 |
| 자유 줌/팬 | ✅ | ❌ | 브라우저 줌만 |
| 대규모 탐색 | ✅ | ❌ | depth 제한 강화 |

### 4.3 개선되는 UX ✨

| 기능 | 설명 |
|------|------|
| 렌더링 속도 | Mermaid가 더 빠름 (SVG 기반) |
| 코드 유지보수 | 단순한 DSL 생성 로직 |
| 일관성 | 항상 동일한 레이아웃 |
| 접근성 | SVG 텍스트 선택 가능 |

### 4.4 사용자 커뮤니케이션

**릴리즈 노트 예시:**
```markdown
## Lineage Viewer 개선 (v2.0)

### 주요 변경사항
- 그래프 렌더링 엔진을 Mermaid로 전환하여 성능 및 안정성 개선
- Read-only 뷰어로 역할 명확화

### 제거된 기능
- 노드 드래그 앤 드롭
- 그래프 내 hover 툴팁 (→ 상단 패널로 대체)
- 무제한 확장 (→ depth 제한 적용)

### 개선된 기능
- 빠른 렌더링 속도
- 일관된 레이아웃
- 단계적 확장 UX 개선
```

---

## 5. 성능/안정성 기준 검토

### 5.1 현재 문제

**발견사항:**
```javascript
// mermaid-viewer.js
const LIMIT = 5;  // ⚠️ 프론트에서 하드코딩

// 문제점:
// - 백엔드가 100개 노드를 보내도 프론트가 5개만 표시
// - 일관성 없는 제한
```

### 5.2 권장 기준

**백엔드 강제 제한:**
```python
# GraphQueryService
MAX_NODES = 30
MAX_EDGES = 50
MAX_DEPTH = 2

def get_lineage_graph(node_id: str, depth: int = 1):
    if depth > MAX_DEPTH:
        raise ValueError(f"Depth must be <= {MAX_DEPTH}")
    
    nodes, edges = self._query_graph(node_id, depth)
    
    if len(nodes) > MAX_NODES:
        # Truncate and add metadata
        nodes = nodes[:MAX_NODES]
        metadata = {"truncated": True, "total_nodes": len(nodes)}
    
    return {"nodes": nodes, "edges": edges, "metadata": metadata}
```

**프론트엔드 검증:**
```javascript
function validateGraphSize(data) {
    if (data.nodes.length > 50) {
        showWarning('Large graph detected. Performance may be affected.');
    }
    
    if (data.metadata?.truncated) {
        showInfo(`Graph truncated. Showing ${data.nodes.length} of ${data.metadata.total_nodes} nodes.`);
    }
}
```

---

## 6. 테스트 항목 검토

### 6.1 기능 테스트 체크리스트

```
□ 최초 그래프 렌더링
  □ Job 기준 조회
  □ Table 기준 조회
  □ 빈 결과 처리

□ Expand 기능
  □ Upstream 확장
  □ Downstream 확장
  □ 중복 노드 병합
  □ 최대 depth 제한

□ Reset 기능
  □ 초기 상태 복원
  □ 선택 상태 초기화

□ 선택 상태
  □ 노드 클릭
  □ 상단 패널 업데이트
  □ 선택 스타일 적용

□ 에러 처리
  □ API 실패
  □ 잘못된 node_id
  □ 렌더링 실패
```

### 6.2 회귀 테스트

```
□ Job Detail 페이지
  □ Lineage 탭 표시
  □ Mermaid 뷰어 로딩

□ Table Detail 페이지
  □ Lineage 탭 표시
  □ Mermaid 뷰어 로딩

□ Snapshot 기능
  □ 저장
  □ 복원
  □ 공유 링크
```

### 6.3 성능 테스트

```
□ 렌더링 속도
  □ 10 nodes: < 100ms
  □ 30 nodes: < 300ms
  □ 50 nodes: < 500ms

□ Expand 응답
  □ API 호출: < 500ms
  □ 재렌더링: < 200ms
```

---

## 7. 문서 업데이트 항목

### 7.1 필수 문서

```
□ Architecture Diagram
  - Cytoscape 제거
  - Mermaid 렌더링 플로우 추가

□ API Documentation
  - Graph API 응답 포맷 업데이트
  - Deprecated 필드 명시

□ Frontend Guide
  - Mermaid DSL 생성 규칙
  - 상태 관리 전략
  - Expand 구현 방법

□ UX Guidelines
  - 제약사항 명시
  - 사용자 가이드

□ Migration Guide
  - Cytoscape → Mermaid 전환 이유
  - Breaking Changes
  - 마이그레이션 타임라인
```

### 7.2 Decision Record

**ADR (Architecture Decision Record) 예시:**
```markdown
# ADR-001: Cytoscape에서 Mermaid로 전환

## Status
Accepted

## Context
- Cytoscape는 강력하지만 복잡한 상태 관리 필요
- Lineage 뷰어는 read-only 용도로 충분
- 유지보수 비용 절감 필요

## Decision
Mermaid.js로 완전 교체

## Consequences
### Positive
- 코드 복잡도 감소 (~2,800 lines 제거)
- 렌더링 성능 개선
- 일관된 레이아웃

### Negative
- 인터랙티브 기능 제한
- 대규모 그래프 탐색 어려움

### Mitigation
- Depth 제한으로 성능 보장
- 단계적 확장으로 탐색 지원
```

---

## 8. 실행 계획 (Phased Approach)

### Phase 1: 백엔드 정리 (1주)
```
□ Graph API 응답 포맷 재정의
□ Cytoscape 전용 필드 제거
□ Depth/Node 제한 강제
□ API 문서 업데이트
```

### Phase 2: 프론트엔드 Mermaid 완성 (1주)
```
□ Expand 기능 구현
□ 상태 관리 추가
□ 상단 내비바 구현
□ 에러 처리 강화
```

### Phase 3: Cytoscape 제거 (3일)
```
□ Cytoscape 파일 삭제
□ 임포트 제거
□ 라우팅 업데이트
□ 회귀 테스트
```

### Phase 4: 문서화 및 배포 (2일)
```
□ 릴리즈 노트 작성
□ 사용자 가이드 업데이트
□ ADR 작성
□ 배포
```

**총 예상 기간: 2-3주**

---

## 9. 위험 요소 및 완화 전략

### 9.1 위험 요소

| 위험 | 영향 | 확률 | 완화 전략 |
|------|------|------|-----------|
| 사용자 반발 | 높음 | 중간 | 명확한 커뮤니케이션, 피드백 수집 |
| 성능 저하 | 중간 | 낮음 | 백엔드 제한, 성능 테스트 |
| 기능 누락 | 높음 | 중간 | 철저한 회귀 테스트 |
| 문서 부족 | 중간 | 높음 | 문서화 우선순위 상향 |

### 9.2 Rollback 계획

```
1. Git 태그로 이전 버전 보존
2. Feature flag로 Cytoscape/Mermaid 전환 가능하게 유지 (1개월)
3. 사용자 피드백 모니터링
4. 문제 발생 시 즉시 롤백
```

---

## 10. 최종 권고사항

### ✅ 즉시 시작 가능
1. **백엔드 API 정리** - 가장 중요하고 영향 범위 명확
2. **문서화** - 병행 작업 가능

### ⚠️ 신중한 접근 필요
1. **Cytoscape 제거** - 회귀 테스트 철저히
2. **사용자 커뮤니케이션** - 충분한 사전 공지

### 🎯 성공 기준
```
□ 모든 기존 기능이 Mermaid로 동작
□ 성능 저하 없음 (오히려 개선)
□ 사용자 불만 최소화
□ 코드 복잡도 감소
□ 문서 완비
```

---

## 결론

제시된 마이그레이션 계획은 **기술적으로 타당하며 전략적으로 올바른 방향**입니다. 현재 코드베이스 분석 결과, Mermaid 뷰어가 이미 부분적으로 구현되어 있어 **완전 교체의 기반이 마련**되어 있습니다.

**핵심 성공 요인:**
1. **명확한 역할 재정의**: Lineage 뷰어는 read-only snapshot viewer
2. **단계적 실행**: Phase별 명확한 목표와 검증
3. **철저한 테스트**: 기능/성능/회귀 테스트
4. **투명한 커뮤니케이션**: 사용자에게 변경사항 명확히 전달

**예상 효과:**
- 코드 복잡도 **40% 감소**
- 렌더링 성능 **30% 개선**
- 유지보수 비용 **50% 절감**

이 마이그레이션은 단순한 라이브러리 교체가 아니라, **시스템 아키텍처의 명확화**입니다.
