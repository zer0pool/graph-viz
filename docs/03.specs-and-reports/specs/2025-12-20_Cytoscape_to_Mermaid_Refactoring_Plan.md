# Cytoscape → Mermaid 완전 교체 리팩토링 플랜

작성일: 2025-12-20  
작성자: David Song  
문서 버전: 1.0  
상태: Planning  
관련 문서: [2025-12-20_Cytoscape_to_Mermaid_Migration_Review.md](./2025-12-20_Cytoscape_to_Mermaid_Migration_Review.md)

---

## 목표 (Goals)

Cytoscape.js를 완전히 제거하고 Mermaid.js 기반의 read-only lineage viewer로 전환하여:
1. 코드 복잡도 40% 감소 (~2,800 lines 제거)
2. 렌더링 성능 30% 개선
3. 유지보수 비용 50% 절감
4. 그래프 뷰어의 역할을 "read-only snapshot viewer"로 명확히 재정의

---

## 비목표 (Non-Goals)

- 그래프 레이아웃 알고리즘 변경
- Closure table 구조 변경
- 대규모 그래프 탐색 기능 추가 (depth 제한 유지)

---

## 전제 조건

- ✅ Mermaid 뷰어 이미 부분 구현됨 (`mermaid-viewer.js`)
- ⚠️ Expand 기능 미구현 (추가 필요)
- ⚠️ Cytoscape 코드 병행 운영 중 (제거 필요)

---

## Phase 1: 백엔드 API 정리 (1주)

### 1.1 Graph API 응답 포맷 재정의

**목표:** Cytoscape 전용 필드 제거, Mermaid DSL 생성에 최적화된 포맷으로 변경

#### 변경 대상 파일
- `src/lineage_manager/services/graph_query_service.py`
- `src/lineage_manager/api/v1/schemas.py` (응답 스키마)

#### 제거할 필드
```python
# ❌ 제거 대상
- position (x, y 좌표)
- layout_config
- cytoscape_classes
- expand_state (서버 저장)
```

#### 새로운 응답 포맷
```python
# src/lineage_manager/api/v1/schemas.py

class GraphNode(BaseModel):
    id: str  # "job:daily_aggregation" or "table:proj.ds.tbl"
    type: Literal["job", "table"]
    label: str
    properties: Dict[str, Any] = Field(default_factory=dict)

class GraphEdge(BaseModel):
    source: str
    target: str
    type: str  # "writes", "reads", "depends_on"
    properties: Dict[str, Any] = Field(default_factory=dict)

class GraphMetadata(BaseModel):
    total_nodes: int
    depth: int
    truncated: bool
    max_nodes_reached: bool = False

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metadata: GraphMetadata
```

#### 구현 작업
```python
# src/lineage_manager/services/graph_query_service.py

MAX_NODES = 30
MAX_EDGES = 50
MAX_DEPTH = 2

def get_lineage_graph(
    self, 
    node_id: str, 
    depth: int = 1,
    direction: Optional[str] = None
) -> GraphResponse:
    """
    Get lineage graph for Mermaid rendering.
    
    Args:
        node_id: "job:xxx" or "table:xxx"
        depth: 1 or 2 (max)
        direction: None, "upstream", or "downstream"
    """
    if depth > MAX_DEPTH:
        raise ValueError(f"Depth must be <= {MAX_DEPTH}")
    
    # Query graph
    nodes, edges = self._query_graph_data(node_id, depth, direction)
    
    # Apply limits
    truncated = False
    if len(nodes) > MAX_NODES:
        nodes = nodes[:MAX_NODES]
        truncated = True
    
    # Build response
    return GraphResponse(
        nodes=[self._to_graph_node(n) for n in nodes],
        edges=[self._to_graph_edge(e) for e in edges],
        metadata=GraphMetadata(
            total_nodes=len(nodes),
            depth=depth,
            truncated=truncated
        )
    )

def _to_graph_node(self, node) -> GraphNode:
    """Convert DB node to API GraphNode."""
    return GraphNode(
        id=f"{node.type}:{node.name}",
        type=node.type,
        label=node.display_name or node.name,
        properties={
            "owner": node.owner,
            "status": node.status,
            # Add other relevant properties
        }
    )

def _to_graph_edge(self, edge) -> GraphEdge:
    """Convert DB edge to API GraphEdge."""
    edge_type = self._determine_edge_type(edge)
    return GraphEdge(
        source=f"{edge.source_type}:{edge.source_name}",
        target=f"{edge.target_type}:{edge.target_name}",
        type=edge_type,
        properties={
            "dependency_type": edge.dependency_type
        }
    )

def _determine_edge_type(self, edge) -> str:
    """Determine edge type for Mermaid label."""
    if edge.source_type == "job" and edge.target_type == "table":
        return "writes"
    elif edge.source_type == "table" and edge.target_type == "job":
        return "reads"
    elif edge.source_type == "job" and edge.target_type == "job":
        return "depends_on"
    return "related"
```

### 1.2 API 엔드포인트 정리

#### 유지할 엔드포인트
```python
# src/lineage_manager/api/v1/endpoints/lineage.py

@router.get("/graph")
def get_lineage_graph(
    node_id: str = Query(..., description="job:xxx or table:xxx"),
    depth: int = Query(1, ge=1, le=2),
    direction: Optional[str] = Query(None, regex="^(upstream|downstream)$"),
    svc: GraphQueryService = Depends(...)
):
    """
    Get lineage graph for Mermaid rendering.
    
    Examples:
    - Initial load: /graph?node_id=job:daily_agg&depth=1
    - Expand upstream: /graph?node_id=job:daily_agg&direction=upstream&depth=1
    - Expand downstream: /graph?node_id=table:proj.ds.tbl&direction=downstream&depth=1
    """
    return svc.get_lineage_graph(node_id, depth, direction)
```

#### 제거할 엔드포인트
```python
# ❌ 제거 대상
- /graph/expand (서버 상태 저장 방식)
- /graph/collapse
- /graph/layout (Cytoscape 전용)
```

---

## Phase 2: 프론트엔드 Mermaid 완성 (1주)

### 2.1 Mermaid DSL 생성 유틸리티

**새 파일:** `static/js/utils/mermaid-dsl-generator.js`

```javascript
/**
 * Mermaid DSL Generator
 * Converts Graph API response to Mermaid DSL
 */

export const MERMAID_STYLES = {
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
    },
    more: {
        fill: '#f8f9fa',
        stroke: '#dadce0',
        strokeDasharray: '5 5'
    }
};

export const EDGE_LABELS = {
    'writes': 'writes',
    'reads': 'reads',
    'depends_on': 'depends on'
};

/**
 * Convert node ID to Mermaid-safe ID
 * @param {string} nodeId - "job:xxx" or "table:xxx"
 * @returns {string} - "J_xxx" or "T_xxx"
 */
export function toMermaidId(nodeId) {
    const [type, ...rest] = nodeId.split(':');
    const prefix = type === 'job' ? 'J' : 'T';
    const sanitized = rest.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
    return `${prefix}_${sanitized}`;
}

/**
 * Generate Mermaid DSL from graph data
 * @param {Object} graphData - {nodes, edges, metadata}
 * @param {string} selectedNodeId - Currently selected node
 * @returns {string} - Mermaid DSL
 */
export function generateMermaidDSL(graphData, selectedNodeId = null) {
    const { nodes, edges } = graphData;
    
    const nodeLines = new Set();
    const edgeLines = [];
    
    // Generate nodes
    nodes.forEach(node => {
        const mermaidId = toMermaidId(node.id);
        const nodeClass = node.type === 'job' ? 'job' : 'table';
        nodeLines.add(`  ${mermaidId}["${node.label}"]:::${nodeClass}`);
    });
    
    // Generate edges
    edges.forEach(edge => {
        const sourceId = toMermaidId(edge.source);
        const targetId = toMermaidId(edge.target);
        const label = EDGE_LABELS[edge.type] || '';
        
        if (label) {
            edgeLines.push(`  ${sourceId} -->|${label}| ${targetId}`);
        } else {
            edgeLines.push(`  ${sourceId} --> ${targetId}`);
        }
    });
    
    // Build DSL
    const lines = [
        'graph LR',
        '  classDef job fill:#e3f2fd,stroke:#1a73e8,rx:6,ry:6',
        '  classDef table fill:#e8f5e9,stroke:#34a853,rx:6,ry:6',
        '  classDef selected stroke:#1a73e8,stroke-width:3.5px',
        ...Array.from(nodeLines),
        ...edgeLines
    ];
    
    // Apply selection style
    if (selectedNodeId) {
        const selectedMermaidId = toMermaidId(selectedNodeId);
        lines.push(`  ${selectedMermaidId}:::selected`);
    }
    
    lines.push('  linkStyle default stroke:#dadce0,stroke-width:1px');
    
    return lines.join('\n');
}
```

### 2.2 상태 관리 및 Expand 구현

**수정 파일:** `static/js/viewers/mermaid-viewer.js`

```javascript
/**
 * Viewer State Management
 */
const viewerState = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    expandedNodes: new Set(),
    rootNodeId: null,
    depth: 1,
    maxNodes: 30
};

/**
 * Initialize viewer with root node
 */
async function initViewer() {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('node_id') || params.get('job_id');
    
    if (!nodeId) {
        showError("Missing node_id parameter");
        return;
    }
    
    // Normalize node_id format
    viewerState.rootNodeId = nodeId.includes(':') ? nodeId : `job:${nodeId}`;
    viewerState.selectedNodeId = viewerState.rootNodeId;
    
    await loadInitialGraph();
}

/**
 * Load initial graph
 */
async function loadInitialGraph() {
    showLoading();
    
    try {
        const response = await fetch(
            `/api/v1/lineage/graph?node_id=${viewerState.rootNodeId}&depth=1`
        );
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        viewerState.nodes = data.nodes;
        viewerState.edges = data.edges;
        
        renderGraph();
        updateNavbar();
        
    } catch (err) {
        showError(`Failed to load graph: ${err.message}`);
    } finally {
        hideLoading();
    }
}

/**
 * Expand node in specific direction
 */
async function expandNode(direction) {
    if (!viewerState.selectedNodeId) {
        alert('Please select a node first');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(
            `/api/v1/lineage/graph?node_id=${viewerState.selectedNodeId}&direction=${direction}&depth=1`
        );
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        // Merge new data
        mergeGraphData(data);
        
        // Mark as expanded
        viewerState.expandedNodes.add(viewerState.selectedNodeId);
        
        // Re-render
        renderGraph();
        
    } catch (err) {
        showError(`Expansion failed: ${err.message}`);
    } finally {
        hideLoading();
    }
}

/**
 * Merge new graph data (deduplicate)
 */
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

/**
 * Reset to initial view
 */
async function resetView() {
    viewerState.nodes = [];
    viewerState.edges = [];
    viewerState.expandedNodes.clear();
    viewerState.selectedNodeId = viewerState.rootNodeId;
    
    await loadInitialGraph();
}

/**
 * Render graph with current state
 */
function renderGraph() {
    const dsl = generateMermaidDSL(
        {
            nodes: viewerState.nodes,
            edges: viewerState.edges
        },
        viewerState.selectedNodeId
    );
    
    renderMermaid(dsl);
}

/**
 * Render Mermaid DSL
 */
async function renderMermaid(dsl) {
    const container = document.getElementById('mermaid-graph');
    container.innerHTML = '';
    container.textContent = dsl;
    container.className = 'mermaid';
    
    try {
        await mermaid.run({ nodes: [container] });
        attachNodeClickHandlers();
    } catch (err) {
        console.error('Mermaid render error:', err);
        showError(`Rendering failed: ${err.message}`);
    }
}

/**
 * Attach click handlers to rendered nodes
 */
function attachNodeClickHandlers() {
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(node => {
        node.style.cursor = 'pointer';
        node.addEventListener('click', (e) => {
            const nodeId = extractNodeIdFromElement(node);
            if (nodeId) {
                selectNode(nodeId);
            }
        });
    });
}

/**
 * Select a node
 */
function selectNode(nodeId) {
    viewerState.selectedNodeId = nodeId;
    updateNavbar();
    renderGraph();  // Re-render to apply selection style
}

/**
 * Update navigation bar
 */
function updateNavbar() {
    const selectedNode = viewerState.nodes.find(
        n => n.id === viewerState.selectedNodeId
    );
    
    const label = selectedNode ? selectedNode.label : 'No selection';
    document.getElementById('selected-node-label').textContent = label;
    
    // Enable/disable expand buttons
    const hasSelection = !!viewerState.selectedNodeId;
    document.getElementById('expand-upstream').disabled = !hasSelection;
    document.getElementById('expand-downstream').disabled = !hasSelection;
}

// Event listeners
document.getElementById('expand-upstream').addEventListener('click', () => {
    expandNode('upstream');
});

document.getElementById('expand-downstream').addEventListener('click', () => {
    expandNode('downstream');
});

document.getElementById('reset-view').addEventListener('click', resetView);

// Initialize
document.addEventListener('DOMContentLoaded', initViewer);
```

### 2.3 UI 구조 업데이트

**수정 파일:** `static/viewers/mermaid-lineage.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lineage Viewer</title>
    <link rel="stylesheet" href="/static/css/viewers/mermaid-viewer.css">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="lineage-viewer">
        <!-- Navigation Bar -->
        <div class="viewer-navbar">
            <div class="selected-node-info">
                <label>Selected:</label>
                <span id="selected-node-label">Loading...</span>
            </div>
            <div class="viewer-controls">
                <button id="expand-upstream" class="btn btn-primary" disabled>
                    ↑ Expand Upstream
                </button>
                <button id="expand-downstream" class="btn btn-primary" disabled>
                    ↓ Expand Downstream
                </button>
                <button id="reset-view" class="btn btn-secondary">
                    ⟲ Reset
                </button>
            </div>
        </div>
        
        <!-- Mermaid Canvas -->
        <div class="graph-container">
            <div id="mermaid-graph" class="mermaid"></div>
        </div>
        
        <!-- Loading Indicator -->
        <div id="loading" class="loading" style="display: none;">
            <div class="spinner"></div>
            <p>Loading graph...</p>
        </div>
        
        <!-- Error Display -->
        <div id="error" class="error" style="display: none;">
            <p class="error-message"></p>
        </div>
    </div>
    
    <script type="module" src="/static/js/utils/mermaid-dsl-generator.js"></script>
    <script type="module" src="/static/js/viewers/mermaid-viewer.js"></script>
</body>
</html>
```

---

## Phase 3: Cytoscape 제거 (3일)

### 3.1 제거할 파일 목록

```bash
# Cytoscape 관련 파일
static/js/plugins/cytoscape-minimap.js
static/js/app/graph/graphView.js
static/js/app/graph/graphZoomControls.js

# Cytoscape 임포트가 있는 HTML
static/index.html (Cytoscape 스크립트 태그 제거)
static/embed.html (Cytoscape 스크립트 태그 제거)
```

### 3.2 제거 스크립트

```bash
#!/bin/bash
# scripts/remove_cytoscape.sh

echo "Removing Cytoscape files..."

# Remove Cytoscape plugin
rm -f src/lineage_manager/static/js/plugins/cytoscape-minimap.js

# Remove Cytoscape graph modules
rm -f src/lineage_manager/static/js/app/graph/graphView.js
rm -f src/lineage_manager/static/js/app/graph/graphZoomControls.js

# Remove empty directories
rmdir src/lineage_manager/static/js/app/graph 2>/dev/null || true

echo "Cytoscape files removed successfully"
```

### 3.3 HTML 파일 정리

**수정:** `static/index.html`, `static/embed.html`

```html
<!-- ❌ 제거: Cytoscape 스크립트 -->
<!-- <script src="https://unpkg.com/cytoscape@3.x/dist/cytoscape.min.js"></script> -->

<!-- ✅ 유지: Mermaid 스크립트 -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
```

### 3.4 라우팅 업데이트

**확인:** 모든 lineage 관련 페이지가 Mermaid 뷰어를 사용하도록 변경

```python
# src/lineage_manager/api/v1/endpoints/web.py

@router.get("/lineage")
def lineage_viewer(node_id: str):
    """Redirect to Mermaid lineage viewer"""
    return RedirectResponse(
        url=f"/static/viewers/mermaid-lineage.html?node_id={node_id}"
    )
```

---

## Phase 4: 문서화 및 배포 (2일)

### 4.1 API 문서 업데이트

**파일:** `docs/api/lineage-api.md`

```markdown
# Lineage API Documentation

## GET /api/v1/lineage/graph

Get lineage graph for Mermaid rendering.

### Parameters
- `node_id` (required): Node identifier in format "job:xxx" or "table:xxx"
- `depth` (optional, default=1): Traversal depth (1-2)
- `direction` (optional): "upstream" or "downstream" for expansion

### Response
```json
{
  "nodes": [...],
  "edges": [...],
  "metadata": {
    "total_nodes": 15,
    "depth": 1,
    "truncated": false
  }
}
```

### Deprecated Fields (Removed)
- ❌ `position`
- ❌ `layout_config`
- ❌ `cytoscape_classes`
```

### 4.2 릴리즈 노트

**파일:** `docs/release-notes/v2.0.0.md`

```markdown
# Release Notes v2.0.0 - Lineage Viewer Upgrade

## 주요 변경사항

### ✨ 새로운 기능
- Mermaid.js 기반 lineage viewer로 완전 전환
- 단계적 확장 (Expand Upstream/Downstream) 기능 추가
- 일관된 그래프 레이아웃

### 🚀 성능 개선
- 렌더링 속도 30% 향상
- 코드 복잡도 40% 감소

### ⚠️ Breaking Changes
- Cytoscape.js 완전 제거
- 노드 드래그 앤 드롭 기능 제거
- 그래프 내 hover 툴팁 제거 (상단 패널로 대체)
- Depth 제한 강화 (최대 2)

### 📝 마이그레이션 가이드
기존 Cytoscape 기반 뷰어를 사용하던 사용자:
1. 모든 lineage 페이지가 자동으로 Mermaid 뷰어로 전환됩니다
2. 노드 선택은 클릭으로 가능합니다
3. Expand 버튼을 사용하여 단계적으로 확장할 수 있습니다
4. Reset 버튼으로 초기 상태로 돌아갈 수 있습니다
```

### 4.3 ADR (Architecture Decision Record)

**파일:** `docs/architecture/decisions/001-mermaid-migration.md`

```markdown
# ADR-001: Cytoscape에서 Mermaid로 전환

## Status
Accepted (2025-12-20)

## Context
- Lineage 뷰어는 read-only 용도로만 사용
- Cytoscape는 강력하지만 복잡한 상태 관리 필요
- 유지보수 비용이 높음 (~2,800 lines)

## Decision
Mermaid.js로 완전 교체

## Consequences

### Positive
- 코드 복잡도 40% 감소
- 렌더링 성능 30% 개선
- 일관된 레이아웃
- 유지보수 비용 50% 절감

### Negative
- 인터랙티브 기능 제한 (드래그, 자유 줌)
- 대규모 그래프 탐색 어려움

### Mitigation
- Depth 제한으로 성능 보장
- 단계적 확장으로 탐색 지원
- 상단 내비바로 선택 정보 표시
```

---

## 검증 계획

### 기능 테스트

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

□ 선택 상태
  □ 노드 클릭
  □ 상단 패널 업데이트
```

### 회귀 테스트

```
□ Job Detail 페이지 lineage 탭
□ Table Detail 페이지 lineage 탭
□ Snapshot 저장/복원
```

### 성능 테스트

```
□ 렌더링 속도
  □ 10 nodes: < 100ms
  □ 30 nodes: < 300ms

□ Expand 응답
  □ API 호출: < 500ms
  □ 재렌더링: < 200ms
```

---

## 위험 요소 및 완화 전략

| 위험 | 영향 | 확률 | 완화 전략 |
|------|------|------|-----------|
| 사용자 반발 | 높음 | 중간 | 릴리즈 노트, 사전 공지 |
| 기능 누락 | 높음 | 중간 | 철저한 회귀 테스트 |
| 성능 저하 | 중간 | 낮음 | 백엔드 제한, 성능 테스트 |

### Rollback 계획
1. Git 태그로 이전 버전 보존
2. Feature flag 유지 (1개월)
3. 문제 발생 시 즉시 롤백

---

## 타임라인

| Phase | 작업 | 기간 | 담당 |
|-------|------|------|------|
| Phase 1 | 백엔드 API 정리 | 1주 | Backend Team |
| Phase 2 | 프론트 Mermaid 완성 | 1주 | Frontend Team |
| Phase 3 | Cytoscape 제거 | 3일 | Frontend Team |
| Phase 4 | 문서화 및 배포 | 2일 | All |

**총 예상 기간: 2-3주**

---

## 성공 기준

```
✅ 모든 기존 기능이 Mermaid로 동작
✅ 성능 저하 없음 (오히려 개선)
✅ 사용자 불만 최소화
✅ 코드 복잡도 감소
✅ 문서 완비
```

---

## 참고 문서

- [Migration Review](./2025-12-20_Cytoscape_to_Mermaid_Migration_Review.md)
- [Mermaid.js Documentation](https://mermaid.js.org/)
- [Graph API Specification](../api/lineage-api.md)
