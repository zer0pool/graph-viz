# 13. Lineage Manager – Graph Node Hide 기능 설계

---

 

**Version:** 1.0

**Last Updated:** 2025-12-06

**Author:** 시스템 설계 초안

---

## 1. 개요 (Overview)

그래프 조회 및 확장 과정에서 원하지 않는 노드가 화면에 나타날 수 있다.

본 기능은 **DB에서 실제 노드를 삭제하지 않고**,

**그래프 화면에서만 특정 노드를 제거(숨김)**하여 시각적 복잡도를 줄이는 기능을 제공한다.

이 기능은 **프론트엔드 전용 기능**이며, 백엔드 그래프 데이터에는 영향을 주지 않는다.

---

## 2. 기능 목적 (Purpose)

- 그래프 확장 시 의미 없는 노드가 너무 많이 추가되는 상황에서
    
    사용자가 수동으로 노드를 제거하여 화면을 단순화할 수 있도록 한다.
    
- 분석에 필요 없는 노드를 숨겨서 “관심 영역 중심의 그래프 뷰”를 만들 수 있다.
- 삭제가 아닌 **일시적 View Filtering** 역할을 한다.
- “Reset Graph” 또는 새로운 조회 수행 시 숨김 상태는 초기화된다.

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 주요 기능

| 기능 | 설명 |
| --- | --- |
| 노드 숨김 | 선택된 노드를 화면에서 제거한다. |
| 자동 엣지 정리 | 해당 노드에 연결된 엣지들도 함께 제거한다. |
| Hidden Nodes 상태 관리 | 숨겨진 노드 목록을 클라이언트에서 유지한다. |
| 그래프 확장 시 체크 | expand 시 hidden 목록에 포함된 노드는 렌더링하지 않는다. |
| Reset Graph | 숨김 상태를 초기화한다. |

### 3.2 비기능 요구사항

- DB나 graph_edge, graph_node 테이블에는 **절대 변경이 발생하지 않는다.**
- Undo 기능은 초기 버전에서는 제공하지 않는다. (추후 확장 가능)
- UX는 빠르고 직관적이어야 한다.

---

## 4. UI / UX 디자인

### 4.1 위치: Left Panel – Node Actions

삭제 기능이 아니라 “View Control” 기능이므로 왼쪽 패널에 배치한다.

### 기존 구조

```
Graph layout
  Reset graph
  Flow ←→
  Flow ↑↓

Node actions
  Direction ▼
    Upstream
    Downstream
  Apply

```

### 변경 후 구조

```
Node actions
  Direction ▼
    Upstream
    Downstream
  Apply

  ----------------------
  Hide Node (selected)

```

- 선택된 노드가 없으면 Disable
- 선택하면 활성화됨
- 위험한 기능이 아니므로 confirm modal은 optional

---

## 5. 작동 흐름 (Workflow)

### 5.1 노드 숨김 동작

1. 사용자가 그래프에서 노드를 클릭
    
    → selectionState.selectedNode 에 저장됨
    
2. 왼쪽 패널의 **Hide Node** 버튼 클릭
3. GraphController.hideNode() 실행
    - 숨김 목록(hiddenNodes)에 해당 node ID 추가
    - cy.remove(node) 실행하여 그래프 캔버스에서 제거
4. UI 업데이트
    - 선택 상태 초기화
    - 오른쪽 상세 패널도 초기화

---

## 6. 상태 관리 설계 (State Handling)

### 6.1 hiddenNodes 구조

```jsx
hiddenNodes: Set<string>

```

### 6.2 Node 숨김 알고리즘 (핵심)

```jsx
hideNode(node) {
    const id = node.id();
    this.hiddenNodes.add(id);
    this.cy.remove(node);
}

```

### 6.3 그래프 확장 시 필터링

그래프 확장 시 backend로부터 새 노드 목록을 받으면 렌더링 이전에 필터:

```jsx
if (!this.hiddenNodes.has(node.id)) {
    cy.add(node);
}

```

### 6.4 Reset Graph

전체 그래프 초기화 시:

```jsx
this.hiddenNodes.clear();

```

---

## 7. API 영향도 (Backend Impact)

### 없음

- 숨김 기능은 완전히 프론트엔드 단에서 동작한다.
- DB, Redis, Graph Manager API 모두 변경하지 않는다.

---

## 8. Edge Case 고려사항

### 8.1 숨겨진 노드가 upstream/downstream 경로에 필요할 때

경로가 연결되지 않아 그래프가 끊어져 보일 수 있음

→ 정상 behavior. (hidden이 필터 기능이기 때문)

### 8.2 동일 노드를 여러 번 expand했을 때

hiddenNodes Set이 guard 역할을 하므로 항상 숨겨진 상태 유지됨.

### 8.3 그래프가 매우 클 때

cy.remove() 비용이 있지만, 전체 그래프 재렌더링보다 훨씬 가벼운 작업.

---

## 9. 향후 확장 가능성 (Future Enhancements)

| 기능 | 설명 |
| --- | --- |
| Undo Hide | 숨김 취소 기능 |
| Show Hidden Nodes List | 숨긴 노드 목록 UI 제공 |
| Temporary Collapse Group | 숨기기 대신 collapse 기능 |
| View Presets | 특정 노드 집합을 자동 필터링 |

---

## 10. 코드 구현 예시

### 10.1 Hide Node 버튼 핸들러

```jsx
handleHideNode() {
    const node = this.cy.$(':selected');
    if (!node || node.length === 0) return;

    const id = node.id();
    this.hiddenNodes.add(id);

    // Remove from view
    this.cy.remove(node);

    // Clear node selection
    this.selectionState.clear();
}

```

### 10.2 Expand 시 hidden 체크

```jsx
for (const n of newNodes) {
    if (!this.hiddenNodes.has(n.data.id)) {
        cy.add(n);
    }
}

```

---

## 11. 최종 정리

**Hide Node 기능은 “그래프 화면에서만 특정 노드를 제거하는 기능”이며,**

**DB에는 영향을 주지 않고, 사용성 향상을 위한 View Filtering 기능이다.**

- 위치: Left Panel → Node Actions 아래
- 구현 난이도: 낮음
- UX 효과: 매우 큼
- 그래프 작업 시 필요 없는 노드들을 제거해 분석 효율 상승