

개선 내용. 
- 아래 문서를 읽어 여기에 작성한다. 
https://short-headline-31b.notion.site/10-UX-2ac44cdedc1680148215c38a5befe3ab?pvs=73

## 1. 전체 페이지 와이어프레임 (Figma 스타일 텍스트 버전)

### 1) 페이지 구조 개요

```
┌─────────────────────────────────────────────────────────────┐
│  Top Nav (GitHub 스타일)                                    │
│  [Logo]  Graph | Jobs | Tables | SearchBox        [Avatar] │
└─────────────────────────────────────────────────────────────┘
┌───────────────┬─────────────────────────────────────────────┐
│ Left Panel    │  Graph Area                                │
│ (Node Info)   │  (Cytoscape 캔버스 + 미니맵)               │
│               │                                             │
│  - Node Title │   ● 중심 노드 (orders)                     │
│  - Type       │  /|\ 인입 엣지                              │
│  - Upstream   │   |  아웃바운드 엣지                        │
│  - Downstream │                                             │
│  - Metadata   │  (중앙: 그래프, 우하단: minimap)           │
└───────────────┴─────────────────────────────────────────────┘

```

### 2) Top Nav 상세

- 좌측: 서비스 로고 / 이름 `Graph Manager`
- 중앙: 탭
    - `Graph` / `Jobs` / `Tables` / `Lineage Search`
- 중앙 우측: 검색 박스
- 우측: 프로필 아바타(원형) + 사용자 이름 드롭다운

### 3) Left Panel(정보 패널)

- 섹션 1: Node 기본 정보
    - Title (예: `orders`)
    - Type Badge (Table / Job)
- 섹션 2: Upstream
    - 리스트 (최대 n개 + “더보기” 링크)
- 섹션 3: Downstream
    - 리스트
- 섹션 4: Metadata
    - Owner, Description, Last Updated
- 섹션 5(옵션): 액션 버튼
    - “이 노드만 보기”, “전체 DAG 열기”

### 4) Graph Area

- 중앙: Cytoscape 캔버스
- 우하단: minimap
- 좌상단: 간단한 컨트롤
    - Zoom in/out
    - Layout reset
    - Depth filter (1-hop / 2-hop / all)

# 🖥️ **UI 구조 설명 (미리보기 요약)**

### ✔ **1. 상단바 (GitHub 스타일)**

- Graph / Jobs / Tables / Search
- 우측에 프로필 사진 + 사용자 이름
- 깔끔하고 현대적인 글로벌 내비게이션

### ✔ **2. 좌측 패널 (GCP BigQuery Lineage 스타일)**

노드 선택 시 세부 정보 표시:

- Node type (Table/Job)
- Upstream 리스트
- Downstream 리스트
- Metadata (owner, description 등)

### ✔ **3. 중앙 그래프 영역 (Neo4j Browser 스타일)**

- 선택한 노드를 중심으로 주변 노드가 퍼져 있음
- Table = 초록
- Job = 파랑
- 확대/축소/드래그 가능
- 자연스러운 레이아웃
- 라인 연결 방향 표시

### ✔ **4. 미니맵**

- 우측 하단에 전체 구조를 작은 맵으로 표시
- Neo4j와 유사한 UX

---

## 2. 그래프 인터랙션 애니메이션 설계

### 2.1 노드 선택 시

- **상태 변화**
    - 선택된 노드: 크기 +10~15%, 테두리 두께/색 강조
    - 선택되지 않은 노드: 투명도 0.4 정도로 낮춤
    - 연결된 엣지: 선 두께 + 색 강조
- **애니메이션**
    - 크기/색 변화에 150~200ms ease-out
- **동작**
    - Left Panel 내용이 선택 노드 정보로 스르르 바뀜(페이드 150ms)

### 2.2 노드 확장(Expand)

- 사용자 액션
    - 노드 우클릭 → “Expand neighbors”
    - 또는 Left Panel 버튼 “Expand graph”
- 애니메이션 단계
    1. 새로 추가될 노드들을 중심 노드 근처에 작은 크기로 스폰
    2. 150ms 동안 바깥 방향으로 이동 + 크기 커짐
    3. 전체 레이아웃 재정렬 (CoSE / concentric) 애니메이션 300ms
- 효과
    - “툭” 튀어나오는 느낌 + 자연스러운 구조 재배치

### 2.3 그래프 필터링 / 검색

- 검색/필터 적용 시
    - 조건에 맞지 않는 노드는 바로 삭제하지 말고:
        - 150ms 동안 알파값 줄이면서 축소 → 이후 제거
    - 조건에 맞는 노드는 그대로 유지
- 검색 결과 노드 포커스
    - 화면 중앙으로 pans & zoom
    - 2~3회 짧게 pulse animation (scale 1.0→1.1→1.0)

### 2.4 그래프 초기 로드

- 초기에는 중심 노드 + 1-hop만 표시
- 2-hop 이상은 흐릿한 placeholder나 “+ N more…” bubble로 표시
- 사용자가 확장하면 그 때 실제 노드 로딩 + 위의 expand 애니메이션 적용

---

## 3. 상세 UX 설계

(노드 확장, 검색, 하이라이트, 필터링)

### 3.1 노드 확장 UX

1. 노드 클릭 → Left Panel에 노드 정보 표시
2. 사용자가:
    - 노드 우클릭 컨텍스트 메뉴 → `Expand Upstream`, `Expand Downstream`
    - 혹은 Left Panel 버튼 클릭
3. API 호출
    - `GET /graph/{nodeId}/neighbors?direction=upstream&depth=1`
4. 응답 받은 노드 + 엣지 → 그래프에 추가
5. 이미 존재하는 노드는 재사용, 신규 노드만 애니메이션

**예외 처리 UX**

- 이미 확장된 방향은 메뉴에 check 표시 or 비활성화
- 너무 많은 노드가 추가될 경우:
    - “50개 이상 노드가 있습니다. 그래프 확대 필터를 적용할까요?” 토스트 노출

---

### 3.2 검색 UX (상단 Search Box + 그래프 내 탐색)

- 상단 검색 박스:
    - 입력: job 이름, table 이름, 태그 등
    - 엔터 → `/search?query=xxx` 호출
- 결과:
    - 1개면: 해당 노드로 바로 이동 + 하이라이트
    - 여러 개면: 좌측에 검색 결과 리스트 보여주고 클릭 시 그래프 포커스

**그래프 내 찾기**

- `Ctrl+F` → 그래프 전용 search input 오버레이
- 노드 이름/ID로 필터
- 검색 결과 노드들은 yellow outline 적용

---

### 3.3 하이라이트 UX

- Hover 시:
    - 노드와 연결된 edge만 강하게 보이기
    - 나머지는 알파 0.2 처리
- 클릭 시:
    - 하이라이트 상태를 고정
    - Left Panel 업데이트
- “Highlight lineage path” 기능:
    - 특정 upstream ~ downstream 경로 선택 시 path에 있는 노드/엣지만 컬러 강조

---

### 3.4 필터링 UX

필터 시나리오 예:

- 노드 타입 필터: Job / Table / External
- 상태 필터: 활성 / 비활성 / 에러
- Depth 필터: 중심 노드 기준 N-hop 이내만 표시

UX:

1. 그래프 상단에 Filter bar:
    - `Type: [All | Job | Table]`
    - `Status: [All | Active | Disabled | Error]`
    - `Depth: [1, 2, 3, All]`
2. 필터 변경 시:
    - 현재 그래프에서 조건에 맞지 않는 노드는 fade-out 후 제거
    - 남은 노드만 다시 레이아웃

---

## 4. React + Cytoscape 코드 템플릿

### 4.1 의존성 예시

```bash
npm install react react-dom
npm install cytoscape react-cytoscapejs
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

```

### 4.2 기본 레이아웃 (App.tsx)

```tsx
// App.tsx
import React from "react";
import { CssBaseline, Box } from "@mui/material";
import { TopNav } from "./components/TopNav";
import { GraphPage } from "./pages/GraphPage";

const App: React.FC = () => {
  return (
    <><CssBaseline />
      <Box display="flex" flexDirection="column" height="100vh">
        <TopNav />
        <Box flex={1} minHeight={0}>
          <GraphPage />
        </Box>
      </Box>
    </>
  );
};

export default App;

```

### 4.3 상단 네비게이션 (TopNav.tsx)

```tsx
// components/TopNav.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  TextField,
  Button,
} from "@mui/material";

export const TopNav: React.FC = () => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ mr: 4 }}>
          Graph Manager
        </Typography>

        <Button color="inherit">Graph</Button>
        <Button color="inherit">Jobs</Button>
        <Button color="inherit">Tables</Button>

        <Box sx={{ flex: 1 }} />

        <TextFieldsize="small"
          placeholder="Lineage Search"
          sx={{ mr: 2, width: 260 }}
        />

        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 32, height: 32 }}>D</Avatar>
          <Typography variant="body2">David Song</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

```

### 4.4 GraphPage 레이아웃 (GraphPage.tsx)

```tsx
// pages/GraphPage.tsx
import React, { useState } from "react";
import { Box, Divider } from "@mui/material";
import { NodeInfoPanel } from "../components/NodeInfoPanel";
import { GraphView, GraphNode } from "../components/GraphView";

export const GraphPage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  return (
    <Box display="flex" height="100%">
      {/* Left Panel */}
      <Boxwidth={280}
        borderRight="1px solid #e0e0e0"
        bgcolor="#fafafa"
        display="flex"
        flexDirection="column"
      >
        <NodeInfoPanel node={selectedNode} />
      </Box>

      {/* Divider optional */}
      <Divider orientation="vertical" flexItem />

      {/* Graph Area */}
      <Box flex={1} minWidth={0}>
        <GraphView onSelectNode={setSelectedNode} />
      </Box>
    </Box>
  );
};

```

### 4.5 NodeInfoPanel (좌측 패널)

```tsx
// components/NodeInfoPanel.tsx
import React from "react";
import { Box, Typography, Chip, List, ListItem, ListItemText } from "@mui/material";
import { GraphNode } from "./GraphView";

interface Props {
  node: GraphNode | null;
}

export const NodeInfoPanel: React.FC<Props> = ({ node }) => {
  if (!node) {
    return (
      <Box p={2}>
        <Typography variant="subtitle1">노드를 선택하세요</Typography>
      </Box>
    );
  }

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box>
        <Typography variant="h6">{node.label}</Typography>
        <Chipsize="small"
          label={node.type}
          color={node.type === "table" ? "success" : "primary"}
          sx={{ mt: 1 }}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2">Upstream</Typography>
        <List dense>
          {node.upstream?.map((u) => (
            <ListItem key={u.id}>
              <ListItemText primary={u.label} />
            </ListItem>
          )) || <Typography variant="body2">없음</Typography>}
        </List>
      </Box>

      <Box>
        <Typography variant="subtitle2">Downstream</Typography>
        <List dense>
          {node.downstream?.map((d) => (
            <ListItem key={d.id}>
              <ListItemText primary={d.label} />
            </ListItem>
          )) || <Typography variant="body2">없음</Typography>}
        </List>
      </Box>
    </Box>
  );
};

```

### 4.6 Cytoscape 그래프 컴포넌트 (GraphView.tsx)

```tsx
// components/GraphView.tsx
import React, { useRef, useEffect } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape, { Core } from "cytoscape";

export type GraphNode = {
  id: string;
  label: string;
  type: "job" | "table";
  upstream?: GraphNode[];
  downstream?: GraphNode[];
};

interface Props {
  onSelectNode: (node: GraphNode | null) => void;
}

const elements = [
  // 간단 예시 데이터
  { data: { id: "orders", label: "orders", type: "table" } },
  { data: { id: "sales", label: "sales", type: "table" } },
  { data: { id: "update_orders", label: "update_orders", type: "job" } },
  { data: { source: "sales", target: "orders" } },
  { data: { source: "orders", target: "update_orders" } },
];

export const GraphView: React.FC<Props> = ({ onSelectNode }) => {
  const cyRef = useRef<Core | null>(null);

  const layout = { name: "cose", animate: true };

  const style = [
    {
      selector: "node",
      style: {
        "background-color": (ele: any) =>
          ele.data("type") === "table" ? "#4caf50" : "#1976d2",
        label: "data(label)",
        color: "#fff",
        "font-size": 10,
        "text-valign": "center",
        "text-halign": "center",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#b0bec5",
        "target-arrow-color": "#b0bec5",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#ffb300",
        "background-opacity": 1,
      },
    },
  ];

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.on("tap", "node", (evt) => {
      const n = evt.target;
      const node: GraphNode = {
        id: n.id(),
        label: n.data("label"),
        type: n.data("type"),
      };
      onSelectNode(node);
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });
  }, [onSelectNode]);

  return (
    <CytoscapeComponentelements={elements as any}
      style={{ width: "100%", height: "100%" }}
      layout={layout}
      stylesheet={style as any}
      cy={(cy) => {
        cyRef.current = cy;
      }}
    />
  );
};

```

이 템플릿에:

- **노드 확장 API 연동**
- **검색/필터 버튼**
- **SSE 기반 상태 업데이트**

만 추가하면, 아까 얘기한 “BigQuery + Neo4j + GitHub 느낌”의 그래프 매니저 UI까지 무난히 확장 가능해.



프론트 코드는 지금.. 아래와 같은 구조인데..

((.venv) ) darkwing@BOOK-VAHPQ6SRRD:~/src/lineage_manager/src/graph_manager$ tree static
static
├── css
│   └── modern-console.css
├── images
│   ├── favicon.ico
│   ├── icon-bq-table.svg
│   ├── icon-job.svg
│   ├── logo.png
│   ├── modern-console.css
│   └── rail-blue.svg
├── index.html
└── js
    ├── auth.js
    ├── main.js
    └── plugins
        └── cytoscape-minimap.js

4 directories, 11 files
((.venv) ) darkwing@BOOK-VAHPQ6SRRD:~/src/lineage_manager/src/graph_manager$ 

방금 알려준 것은 tsx 확장자다.. 
 tsx 기반으로 크게 변경이 필요한가??  


