# Lineage Manager – Table Lineage Summary API 설계서  
(Upstream Root Nodes / Downstream Leaf Nodes)

---

## 1. 목적

특정 테이블을 기준으로 전체 그래프(closure table)를 조회하여:

- Upstream Root Nodes (절대 상위 테이블들)
- Downstream Leaf Nodes (절대 하위 테이블들)
- 전체 Upstream / Downstream 테이블 수

를 한 번에 반환하는 **Summary API**를 정의하고,  
이를 구현하기 위한 **FastAPI 엔드포인트 템플릿**과  
**GraphQueryService 알고리즘**을 설계한다.

---

## 2. 용어 정의

### Upstream Root Nodes
- 기준 테이블을 중심으로 **upstream 방향**으로 끝까지 올라갔을 때,
- 더 이상 upstream 이 존재하지 않는 테이블들.
- 주로 RAW, SOURCE, INGESTION 테이블에 해당.

### Downstream Leaf Nodes
- 기준 테이블을 중심으로 **downstream 방향**으로 끝까지 내려갔을 때,
- 더 이상 downstream 이 존재하지 않는 테이블들.
- 주로 REPORT, EXPORT, MART 결과 테이블에 해당.

---

## 3. 데이터 모델 전제

이미 존재하는 테이블:

- `graph_table_node`
  - `id` (PK)
  - `full_name` (예: `demo.analytics.sales_daily`)
  - 그 외 컬럼

- `graph_closure`
  - `id`
  - `ancestor_id` (상위 노드 ID)
  - `descendant_id` (하위 노드 ID)
  - `ancestor_type` / `descendant_type` (job / table)
  - `depth` (0 = 자기 자신, 1 = 인접, 2+ = 더 멀리)
  - 그 외 path 정보

여기서는 **type = table** 만 대상으로 하는 Summary API를 정의한다.  
(job 노드에 대해서는 추후 필요 시 유사 구조로 확장 가능)

---

## 4. Summary API 스펙

### 4.1 Endpoint

```http
GET /api/v1/lineage/tables/{full_name}/summary
{full_name}: project.dataset.table 형식의 테이블 full name

예:

http
코드 복사
GET /api/v1/lineage/tables/demo.analytics.sales_daily/summary
4.2 Query Parameters (옵션)
이름	타입	기본값	설명
max_roots	int	50	반환할 Upstream Root Nodes 최대 개수
max_leaves	int	50	반환할 Downstream Leaf Nodes 최대 개수

(개수가 너무 많을 경우, 일부만 반환하고 truncated 플래그로 표시)

4.3 Response JSON 스키마
json
코드 복사
{
  "status": "success",
  "table": "demo.analytics.sales_daily",
  "upstream": {
    "count": 14,
    "root_nodes": [
      "demo.raw.events",
      "demo.raw.user_dim"
    ],
    "truncated": false
  },
  "downstream": {
    "count": 22,
    "leaf_nodes": [
      "demo.report.sales_daily_summary",
      "demo.export.sales_feed"
    ],
    "truncated": false
  }
}
필드 설명:

status: "success" | "error"

table: 기준 테이블 full name

upstream.count: 기준 테이블의 모든 ancestor 중 type=table 의 개수

upstream.root_nodes: Upstream Root Nodes 목록 (full_name 배열)

upstream.truncated: max_roots 를 넘어서 잘렸으면 true

downstream.count: 기준 테이블의 모든 descendant 중 type=table 의 개수

downstream.leaf_nodes: Downstream Leaf Nodes 목록 (full_name 배열)

downstream.truncated: max_leaves 를 넘어서 잘렸으면 true

4.4 에러 응답 예시
1) 테이블을 찾을 수 없는 경우
json
코드 복사
{
  "status": "error",
  "error_code": "TABLE_NOT_FOUND",
  "message": "Table 'demo.analytics.unknown_table' not found"
}
2) 내부 에러
json
코드 복사
{
  "status": "error",
  "error_code": "INTERNAL_ERROR",
  "message": "Unexpected error occurred"
}
HTTP Status Code:

200: 정상

404: TABLE_NOT_FOUND

500: INTERNAL_ERROR

5. GraphQueryService 설계
5.1 인터페이스
python
코드 복사
class LineageSummaryDTO(BaseModel):
    table: str
    upstream_count: int
    upstream_root_nodes: list[str]
    upstream_truncated: bool
    downstream_count: int
    downstream_leaf_nodes: list[str]
    downstream_truncated: bool


class GraphQueryService:
    def get_table_lineage_summary(
        self,
        full_name: str,
        max_roots: int = 50,
        max_leaves: int = 50,
    ) -> LineageSummaryDTO:
        ...
5.2 알고리즘 개요
full_name 으로 graph_table_node.id 조회

Upstream 전체 테이블 수 계산 (closure table)

Upstream Root Nodes (절대 상위 테이블) 목록 계산

Downstream 전체 테이블 수 계산

Downstream Leaf Nodes 목록 계산

DTO로 변환하여 반환

5.3 상세 알고리즘 (의사 코드)
python
코드 복사
def get_table_lineage_summary(full_name: str, max_roots: int = 50, max_leaves: int = 50):
    # 1. 기준 테이블 ID 조회
    table = table_repo.get_by_full_name(full_name)
    if not table:
        raise TableNotFoundError(full_name)

    table_id = table.id

    # 2. Upstream 전체 테이블 수
    upstream_count = closure_repo.count_upstream_tables(table_id)

    # 3. Upstream Root Nodes
    upstream_roots = closure_repo.find_upstream_root_tables(table_id, limit=max_roots + 1)
    upstream_truncated = len(upstream_roots) > max_roots
    upstream_roots = upstream_roots[:max_roots]

    # 4. Downstream 전체 테이블 수
    downstream_count = closure_repo.count_downstream_tables(table_id)

    # 5. Downstream Leaf Nodes
    downstream_leaves = closure_repo.find_downstream_leaf_tables(table_id, limit=max_leaves + 1)
    downstream_truncated = len(downstream_leaves) > max_leaves
    downstream_leaves = downstream_leaves[:max_leaves]

    # 6. DTO 변환
    return LineageSummaryDTO(
        table=full_name,
        upstream_count=upstream_count,
        upstream_root_nodes=[t.full_name for t in upstream_roots],
        upstream_truncated=upstream_truncated,
        downstream_count=downstream_count,
        downstream_leaf_nodes=[t.full_name for t in downstream_leaves],
        downstream_truncated=downstream_truncated,
    )
5.4 Repository 레벨 SQL (의사 SQL)
5.4.1 Upstream 테이블 수
sql
코드 복사
SELECT COUNT(DISTINCT t.id) AS cnt
FROM graph_closure c
JOIN graph_table_node t
  ON t.id = c.ancestor_id
WHERE c.descendant_id = :table_id
  AND c.ancestor_type = 'table'
  AND c.depth >= 1;
5.4.2 Upstream Root Nodes
sql
코드 복사
SELECT DISTINCT t.*
FROM graph_closure c
JOIN graph_table_node t
  ON t.id = c.ancestor_id
WHERE c.descendant_id = :table_id
  AND c.ancestor_type = 'table'
  AND c.depth >= 1
  AND NOT EXISTS (
    SELECT 1
    FROM graph_closure c2
    WHERE c2.descendant_id = c.ancestor_id   -- c.ancestor 의 상위가 있는지 확인
      AND c2.depth = 1
      AND c2.ancestor_type = 'table'
  )
LIMIT :limit;
5.4.3 Downstream 테이블 수
sql
코드 복사
SELECT COUNT(DISTINCT t.id) AS cnt
FROM graph_closure c
JOIN graph_table_node t
  ON t.id = c.descendant_id
WHERE c.ancestor_id = :table_id
  AND c.descendant_type = 'table'
  AND c.depth >= 1;
5.4.4 Downstream Leaf Nodes
sql
코드 복사
SELECT DISTINCT t.*
FROM graph_closure c
JOIN graph_table_node t
  ON t.id = c.descendant_id
WHERE c.ancestor_id = :table_id
  AND c.descendant_type = 'table'
  AND c.depth >= 1
  AND NOT EXISTS (
    SELECT 1
    FROM graph_closure c2
    WHERE c2.ancestor_id = c.descendant_id   -- c.descendant 의 하위가 있는지 확인
      AND c2.depth = 1
      AND c2.descendant_type = 'table'
  )
LIMIT :limit;
6. FastAPI 엔드포인트 구현 템플릿
6.1 Router 정의
python
코드 복사
# src/lineage_manager/api/v1/endpoints/lineage.py

from fastapi import APIRouter, Depends, HTTPException, Query
from dependency_injector.wiring import inject, Provide

from lineage_manager.containers import GraphContainer
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.schemas.lineage import LineageSummaryResponse

router = APIRouter(prefix="/api/v1/lineage", tags=["lineage"])


@router.get("/tables/{full_name}/summary", response_model=LineageSummaryResponse)
@inject
def get_table_lineage_summary(
    full_name: str,
    max_roots: int = Query(50, ge=1, le=500),
    max_leaves: int = Query(50, ge=1, le=500),
    graph_query_service: GraphQueryService = Depends(Provide[GraphContainer.graph_query_service]),
):
    """
    특정 테이블 기준 Upstream Root Nodes / Downstream Leaf Nodes / 전체 count 요약 조회.
    """
    try:
        summary = graph_query_service.get_table_lineage_summary(
            full_name=full_name,
            max_roots=max_roots,
            max_leaves=max_leaves,
        )
    except TableNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "status": "error",
                "error_code": "TABLE_NOT_FOUND",
                "message": f"Table '{full_name}' not found",
            },
        )
    except Exception as e:
        # 필요시 로깅 추가
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "error_code": "INTERNAL_ERROR",
                "message": "Unexpected error occurred",
            },
        )

    return {
        "status": "success",
        "table": summary.table,
        "upstream": {
            "count": summary.upstream_count,
            "root_nodes": summary.upstream_root_nodes,
            "truncated": summary.upstream_truncated,
        },
        "downstream": {
            "count": summary.downstream_count,
            "leaf_nodes": summary.downstream_leaf_nodes,
            "truncated": summary.downstream_truncated,
        },
    }
6.2 Response 스키마 예시 (schemas/lineage.py)
python
코드 복사
from pydantic import BaseModel
from typing import List


class LineageSideSummary(BaseModel):
    count: int
    root_nodes: List[str] | None = None      # upstream 에서 사용
    leaf_nodes: List[str] | None = None      # downstream 에서 사용
    truncated: bool


class LineageSummaryResponse(BaseModel):
    status: str
    table: str
    upstream: LineageSideSummary
    downstream: LineageSideSummary
(실제 구현 시 root_nodes / leaf_nodes 를 분리된 모델로 정의해도 됨)

7. UI 연동 요약
Table Detail Panel의 Lineage 탭에서:

GET /api/v1/lineage/tables/{full_name}/summary 호출

upstream.count, downstream.count 로 배지 표시

upstream.root_nodes / downstream.leaf_nodes 는 리스트로 일부 표시

“View All” 클릭 시 Drawer 열어 전체 root/leaf 보여주기

이 설계서를 기준으로:

Repository 구현

GraphQueryService 메서드 구현

FastAPI Router 연결

Panel / Drawer UI 연동

을 단계별로 진행하면 된다.