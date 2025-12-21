Table Detail Panel — Lineage Tab Design Specification

작성일: 2025-12-21
수정일: 2025-12-21
작성자: Lineage Manager Team
문서 버전: 1.0
상태: Draft

1. 목적 (Purpose)

Lineage 탭은 선택된 테이블을 기준으로 데이터 흐름, 영향 범위, 출처, 분류 전파 상태를 한 화면에서 파악할 수 있도록 설계된 상세 분석 UI이다.

본 탭은 다음 질문에 즉시 답할 수 있어야 한다.

이 테이블은 어디서 왔는가?

이 테이블이 변경되면 무엇이 영향을 받는가?

어떤 작업(Job) 들이 이 테이블을 생성/사용하는가?

PII / 민감 데이터가 어디서 유입되었는가?

2. 설계 원칙 (Design Principles)

Entity-Centric

Lineage는 독립 화면이 아니라 Table Detail의 한 탭

기준점은 항상 “현재 테이블”

Summary → Graph → Analysis 흐름

요약 → 시각화 → 해석 순서로 정보 노출

읽기 우선(Read-first)

기본 상태는 “보기”

확장/조작은 명시적 액션으로만 발생

운영 판단 지원

단순 구조 표시가 아니라

변경 전 판단, 장애 영향 분석을 지원

3. 탭 전체 레이아웃 구조
Lineage Tab
├─ Header (Table Identity & Tags)
├─ Summary Section
├─ Lineage Graph Section
├─ Impact Analysis Section
└─ Provenance & Classification Section

4. Header 영역
4.1 구성 요소

Table Full Name
project.dataset.table_name

Action

View in Graph

Tags / Properties

Classification (PII / Sensitive 등)

Domain

Owner

4.2 역할

현재 분석 대상 테이블의 정체성 고정

Classification 전파 결과를 항상 노출

5. Summary Section
5.1 목적

Lineage Graph를 보기 전,
이 테이블의 영향 범위를 숫자로 먼저 인지하도록 함.

5.2 Summary Cards
카드	설명
Upstream	상위 테이블/작업 개수
Downstream	하위 테이블/작업 개수
Max Depth	최대 연결 단계
Impact (Leaf)	최종 영향 대상 개수
5.3 Path Preview

가장 대표적인 Provenance 경로 1개 표시

예:

raw.orders → stg.orders → mart.daily_sales


Actions

Show full path

Highlight critical path

6. Lineage Graph Section
6.1 목적

데이터 흐름을 시각적으로 이해

Job / Table 간 관계 파악

6.2 Graph 기본 구성
Node Types

Table Node

Job Node

Edge

Directional (Upstream → Downstream)

Layout

기본: DAG (Left → Right)

6.3 Graph Controls
컨트롤	설명
Tables / Jobs / Columns	노드 타입 토글
Depth	확장 단계 선택
Layout	DAG / Compact
Upstream only	상위만 표시
Downstream only	하위만 표시
Reset	초기 상태 복귀
6.4 Aggregation Policy

노드 수가 임계값을 초과할 경우 자동 집계:

+ N more tables

+ N more jobs

클릭 시:

Graph API 재호출

해당 방향만 확장

Backend는 aggregation 여부를 알지 못하며
Frontend 렌더링 정책으로 처리한다.

6.5 상호작용 규칙

노드 클릭

Right Detail Panel 갱신

Hover

Node type / owner / classification tooltip

Path Highlight

Critical path 강조 가능

7. Impact Analysis Section
7.1 목적

“이 테이블을 변경하면 무엇이 깨질 수 있는가?”

7.2 구성
Downstream Tables

테이블 리스트

Leaf 여부 표시

Downstream Jobs

Job 이름

SLA 의존 여부 표시

7.3 Actions

Export list

Open downstream subtree in Graph

8. Provenance & Classification Section
8.1 Provenance
Source Root Tables

가장 상위 원본 테이블 목록

Transform Chain

대표 변환 경로 요약

Hop 수 / Job 수 표시

8.2 Classification Propagation

적용된 분류 목록

전파 출처 명시

예:

PII inherited from raw.users (column: user_id)


정책 설명:

해당 Classification의 조직 정책 요약 표시

9. API 연계 개요 (요약)
Required Backend Capabilities

Upstream / Downstream traversal

Depth 기반 lineage query

Leaf node 계산

Provenance path 추출

Classification propagation 계산

구현 방식:

Closure Table 또는 Graph traversal API

10. Apache Atlas / Monte Carlo 참고 포인트
항목	반영 여부
Atlas Lineage Tab 구조	✅
Impact Analysis 개념	✅
Provenance 추적	✅
Classification 전파	✅
Monte Carlo 상태 중심 UI	❌ (Lineage 탭에서는 제외)
11. 확장 가능 항목 (Future)

Column-level lineage toggle

SLA 기반 Critical Path 자동 계산

Change simulation (what-if)

Lineage snapshot 저장 / 공유

12. 결론

이 Lineage 탭은 단순 시각화가 아니라,

데이터 변경 전 의사결정을 돕는 운영 도구

를 목표로 설계되었다.

Apache Atlas의 구조적 정석과
Monte Carlo의 관측 경험을 참고하되,
실제 운영자 관점의 UX를 중심으로 재구성한 것이 핵심이다.



Lineage Tab API Specification

작성일: 2025-12-21
수정일: 2025-12-21
작성자: Lineage Manager Team
문서 버전: 1.0
상태: Draft
제목: Table Detail Panel — Lineage Tab API Spec

요약:
Table Detail Panel의 Lineage 탭이 필요로 하는 Summary/Graph/Impact/Provenance/Classification 정보를 제공하는 API 규격.
Frontend는 aggregation/렌더링 정책을 자체 적용하며, Backend는 “그래프/통계/경로”를 데이터로만 제공한다.

0. 공통 규칙
Base

Base path: /api/v1

리소스 기준: table_full_name (권장 형식: project.dataset.table)

응답 포맷

모든 응답은 JSON

에러는 공통 에러 포맷 사용

식별자

node_id: 시스템 내부 그래프 노드 ID (stable)

table_full_name: 사용자 친화 key (stable)

job_id: Job Manager의 job_id (stable)

시간

ISO-8601 UTC 권장 (2025-12-21T04:10:00Z)

“metadata” 금지

사용자 선호에 따라 엔티티 확장 필드는 properties 사용

1. 데이터 모델
1.1 Node
{
  "id": "tbl_8f2a",
  "type": "TABLE",
  "ref": {
    "table_full_name": "project.dataset.mart.daily_sales",
    "job_id": null
  },
  "display_name": "mart.daily_sales",
  "properties": {
    "owner": "analytics_team",
    "domain": "Sales",
    "storage": "bigquery"
  },
  "classifications": [
    {
      "name": "PII",
      "origin": "INHERITED",
      "source_node_id": "tbl_raw_users",
      "source_column": "user_id"
    }
  ]
}

1.2 Edge
{
  "id": "e_1122",
  "type": "DATA_FLOW",
  "from": "tbl_raw_orders",
  "to": "job_ingest_A",
  "properties": {
    "via": "READ"
  }
}

1.3 Graph (LineageGraph)
{
  "center_node_id": "tbl_8f2a",
  "nodes": [/* Node[] */],
  "edges": [/* Edge[] */],
  "stats": {
    "node_counts": { "TABLE": 12, "JOB": 5 },
    "edge_count": 16
  }
}

1.4 Error
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Table not found",
    "details": { "table_full_name": "..." }
  }
}

2. Lineage Summary API

Lineage 탭 상단 Summary Cards + Path Preview를 위한 API.

GET /lineage/tables/{table_full_name}/summary
Query

max_depth (int, default=4): 탐색 최대 hop

include (csv): path_preview,classifications,impact

direction (enum): BOTH|UPSTREAM|DOWNSTREAM (default=BOTH)

Response 200
{
  "table_full_name": "project.dataset.mart.daily_sales",
  "summary": {
    "upstream": { "tables": 5, "jobs": 2 },
    "downstream": { "tables": 3, "jobs": 1 },
    "max_depth": 4,
    "leaf_nodes": { "tables": 2, "jobs": 0 }
  },
  "path_preview": {
    "strategy": "LONGEST_UPSTREAM_TO_CENTER",
    "nodes": [
      { "type": "TABLE", "table_full_name": "project.dataset.raw.orders" },
      { "type": "TABLE", "table_full_name": "project.dataset.stg.orders" },
      { "type": "TABLE", "table_full_name": "project.dataset.mart.daily_sales" }
    ],
    "hops": 2
  },
  "classifications": [
    { "name": "PII", "origin": "INHERITED", "source_table_full_name": "project.dataset.raw.users", "source_column": "user_id" }
  ]
}

Notes

Summary는 캐시 가능(세션/짧은 TTL 권장)

path_preview는 “대표 1개”만 제공 (전체 경로는 별도 API)

3. Lineage Graph API

그래프 렌더링용. Frontend는 aggregation 정책을 적용하고, 필요 시 확장 재호출.

GET /lineage/tables/{table_full_name}/graph
Query

depth (int, default=1, max=10)

direction (enum): BOTH|UPSTREAM|DOWNSTREAM (default=BOTH)

node_types (csv): 예) TABLE,JOB (default=TABLE,JOB)

layout_hint (enum): DAG|COMPACT (default=DAG) — 힌트일 뿐, 백엔드 렌더링 관여 없음

include (csv): classifications,properties

project (csv): Node 반환 필드 제한(옵션) 예) id,type,ref,display_name

미지정 시 기본 필드 세트 반환

Response 200
{
  "center": { "id": "tbl_8f2a", "type": "TABLE" },
  "graph": {
    "center_node_id": "tbl_8f2a",
    "nodes": [
      {
        "id": "tbl_raw_orders",
        "type": "TABLE",
        "ref": { "table_full_name": "project.dataset.raw.orders", "job_id": null },
        "display_name": "raw.orders",
        "properties": { "owner": "data_eng" },
        "classifications": []
      },
      {
        "id": "job_ingest_A",
        "type": "JOB",
        "ref": { "table_full_name": null, "job_id": "job_ingest_A" },
        "display_name": "job_ingest_A",
        "properties": { "scheduling_type": "DAILY" },
        "classifications": []
      }
    ],
    "edges": [
      { "id": "e1", "type": "DATA_FLOW", "from": "tbl_raw_orders", "to": "job_ingest_A", "properties": { "via": "READ" } },
      { "id": "e2", "type": "DATA_FLOW", "from": "job_ingest_A", "to": "tbl_8f2a", "properties": { "via": "WRITE" } }
    ],
    "stats": { "node_counts": { "TABLE": 6, "JOB": 2 }, "edge_count": 7 }
  }
}

Notes

Graph API는 “부분 그래프” 반환을 기본으로 한다.

aggregation(“+N more …”)은 프론트 책임.

프론트는 노드 수가 많으면 depth/direction 조절로 확장 전략을 만든다.

4. Impact Analysis API

다운스트림 영향 대상 리스트/요약.

GET /lineage/tables/{table_full_name}/impact
Query

depth (int, default=6)

leaf_only (bool, default=false)

include_jobs (bool, default=true)

limit (int, default=100)

cursor (string, optional) pagination

Response 200
{
  "table_full_name": "project.dataset.mart.daily_sales",
  "depth": 6,
  "counts": {
    "downstream_tables": 3,
    "downstream_jobs": 1,
    "leaf_tables": 2
  },
  "items": [
    { "type": "TABLE", "table_full_name": "project.dataset.mart.order_kpi", "is_leaf": false },
    { "type": "TABLE", "table_full_name": "project.dataset.mart.weekly_summary", "is_leaf": true },
    { "type": "JOB", "job_id": "job_publish_report", "is_leaf": true }
  ],
  "next_cursor": null
}

5. Provenance APIs
5.1 Root Sources (Upstream Roots)

가장 상단 원본(더 이상 upstream이 없는 테이블) 목록.

GET /lineage/tables/{table_full_name}/roots

Query:

depth (int, default=10)

limit, cursor

Response 200:

{
  "table_full_name": "project.dataset.mart.daily_sales",
  "roots": [
    { "table_full_name": "project.dataset.raw.orders" },
    { "table_full_name": "project.dataset.raw.users" }
  ],
  "next_cursor": null
}

5.2 Full Path Listing (대표 경로/전체 경로)

“Show full path” drawer 용.

GET /lineage/tables/{table_full_name}/paths

Query:

direction (enum): UPSTREAM_TO_CENTER|CENTER_TO_DOWNSTREAM|ROOT_TO_LEAF (default=UPSTREAM_TO_CENTER)

strategy (enum): SHORTEST|LONGEST|TOP_K (default=TOP_K)

k (int, default=10, max=50)

depth (int, default=10)

Response 200:

{
  "table_full_name": "project.dataset.mart.daily_sales",
  "direction": "UPSTREAM_TO_CENTER",
  "strategy": "TOP_K",
  "paths": [
    {
      "hops": 4,
      "nodes": [
        { "type": "TABLE", "table_full_name": "project.dataset.raw.orders" },
        { "type": "JOB", "job_id": "job_ingest_A" },
        { "type": "TABLE", "table_full_name": "project.dataset.stg.orders" },
        { "type": "JOB", "job_id": "job_clean_B" },
        { "type": "TABLE", "table_full_name": "project.dataset.mart.daily_sales" }
      ]
    }
  ]
}

6. Classification Propagation API

Lineage 탭의 “Classification Propagation” 카드/설명용.

GET /lineage/tables/{table_full_name}/classifications
Query

include_sources (bool, default=true)

include_policy_hints (bool, default=true)

Response 200
{
  "table_full_name": "project.dataset.mart.daily_sales",
  "classifications": [
    {
      "name": "PII",
      "origin": "INHERITED",
      "sources": [
        {
          "source_table_full_name": "project.dataset.raw.users",
          "source_node_id": "tbl_raw_users",
          "source_column": "user_id",
          "path_hops": 3
        }
      ],
      "policy_hints": [
        { "key": "export_restriction", "value": "PII must not reach external exports." }
      ]
    }
  ]
}

7. Node Quick View API (선택)

그래프 노드 클릭 시, 우측 패널에 간단 정보 표시.

GET /lineage/nodes/{node_id}

Query:

include (csv): properties,classifications,relations_preview

Response 200:

{
  "node": {
    "id": "tbl_8f2a",
    "type": "TABLE",
    "ref": { "table_full_name": "project.dataset.mart.daily_sales", "job_id": null },
    "display_name": "mart.daily_sales",
    "properties": { "owner": "analytics_team", "domain": "Sales" },
    "classifications": [{ "name": "PII", "origin": "INHERITED", "source_node_id": "tbl_raw_users" }]
  },
  "relations_preview": {
    "upstream": { "tables": 2, "jobs": 1 },
    "downstream": { "tables": 1, "jobs": 0 }
  }
}

8. 성능/캐시 가이드 (API 관점)

Summary/Classification은 캐시 적합

TTL 30s~5m (환경에 따라)

Graph/Paths는 depth에 따라 비용 증가

depth 상한 적용 권장

대규모 downstream(팬아웃) 대비

impact는 pagination 필수

paths는 k 상한 필수

9. 권한/감사 로그(선택 규칙)

모든 요청은 사용자 컨텍스트(oidc subject 등)를 서버에서 추출

감사 로그 필드 예:

actor, table_full_name, endpoint, latency_ms, result_count

10. 에러 코드
HTTP	code	의미
400	INVALID_ARGUMENT	파라미터 오류
401	UNAUTHENTICATED	인증 실패
403	FORBIDDEN	권한 없음
404	NOT_FOUND	테이블/노드 없음
409	CONFLICT	그래프 상태 충돌(희귀)
429	RATE_LIMITED	과다 호출
500	INTERNAL	서버 오류
11. 프론트엔드 호출 시나리오 (권장)

탭 진입

GET /lineage/tables/{full}/summary?include=path_preview,classifications,impact

GET /lineage/tables/{full}/graph?depth=1&direction=BOTH&node_types=TABLE,JOB&include=properties,classifications

“Show full path”

GET /lineage/tables/{full}/paths?direction=UPSTREAM_TO_CENTER&strategy=TOP_K&k=10

“Impact Analysis 펼치기”

GET /lineage/tables/{full}/impact?depth=6&limit=100

그래프 확장 (“+N more jobs”)

GET /lineage/tables/{full}/graph?depth=2&direction=DOWNSTREAM... (프론트 정책대로)