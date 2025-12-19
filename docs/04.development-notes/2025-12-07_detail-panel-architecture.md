
🏗️ Lineage Manager – Detail Panel Architecture Spec
(Table Panel + Job Panel + API + DB Schema 통합 문서)
# 1. 개요 (Overview)

Lineage Manager UI에서 노드를 클릭하면 오른쪽에 **상세 패널(Detail Panel)**을 표시한다.
노드 타입은 두 가지:

Table Node

Job Node

각 타입별로 제공해야 하는 정보가 다르므로,
API 또한 table-detail / job-detail로 명확히 분리한다.

# 2. 최종 API 구조
✔ Table Detail API
GET /api/v1/tables/{table_id}/detail

제공 정보

full_name

overview

storage

schema

stats

tags

동적 정보 (Timeline)
GET /api/v1/tables/{full_name}/timelines?days=7

✔ Job Detail API
GET /api/v1/jobs/{job_id}/detail

제공 정보

job_id, name, owner

write_mode

destination_type, destination_table

properties (labels, schedule 등)

upstreams / downstreams

lineage insight summary

# 3. DB 구조 (Table Detail 전용 테이블)
✔ graph_table_node (기존)
컬럼	설명
id	internal PK
full_name	project.dataset.table
project_name	
dataset_name	
table_name	
created_at	
updated_at	
✔ table_property (신규)

정적 메타데이터 저장 전용

table_property (
  id PK,
  table_id FK,
  overview JSON,
  storage JSON,
  schema JSON,
  stats JSON,
  tags JSON,
  updated_at TIMESTAMP
)

컬럼별 저장 내용 예시
overview
{
  "owner": "data-team",
  "description": "Daily aggregated sales table",
  "documentation_url": "https://docs.company.com/tables/sales_daily"
}

storage
{
  "type": "BigQuery",
  "partition": "_PARTITIONDATE",
  "partition_type": "DAY",
  "cluster_columns": ["country", "category"],
  "location": "asia-northeast3"
}

schema
{
  "columns": [
    {"name": "event_date", "type": "DATE", "mode": "REQUIRED"},
    {"name": "sales", "type": "FLOAT", "mode": "NULLABLE"}
  ]
}

stats
{
  "row_count": 53230444,
  "size_bytes": 1324231423,
  "storage_cost": 18.4
}

tags
{
  "domain": "analytics",
  "pii": false,
  "labels": {"env": "prod", "team": "biz-data"}
}

# 4. 그래프 노드 데이터 스키마 (프런트 전달용)
Table Node
{
  "id": "t1468",
  "type": "table",
  "label": "L2_OUT_005",
  "full_name": "demo.analytics.L2_OUT_005"
}

Job Node
{
  "id": "j1571",
  "type": "job",
  "label": "L4_JOB_005"
}

# 5. 상세 패널 UI 구성
✔ 5.1 Table Detail Panel Layout

Tabs:

Overview

owner, description

storage info

stats

Schema

column 리스트

Lineage Insight

direct upstream count

direct downstream count

root tables (Drawer)

leaf tables (Drawer)

Activity (Timeline)

Timeline API에서 가져온 값 시각화

last_loaded → freshness 계산

loading delay 표시

✔ 5.2 Job Detail Panel Layout

Tabs:

Overview

job_id, name, owner

schedule

write_mode

destination

I/O Summary

upstream tables

upstream storages (s3 등)

downstream tables

Lineage Insight

upstream count / downstream count

root jobs / leaf jobs

Execution Info (future)

실행 시간

최근 상태

실패/성공 카운트

# 6. 패널 로딩 흐름 (전체 요청 시퀀스)
▼ Table Node 클릭
GET /api/v1/tables/{table_id}/detail
GET /api/v1/tables/{full_name}/timelines?days=7


두 응답을 merge → Table Detail Panel 렌더링

▼ Job Node 클릭
GET /api/v1/jobs/{job_id}/detail


Job Detail Panel 렌더링

# 7. Graph UI 동작 순서 (요약)

사용자 노드 클릭

node.type 확인

타입에 따른 전용 API 호출

패널에 데이터 표시

Table Node의 경우 Timeline API 추가 호출

Lineage Insight는 graph API에서 가져온 서브그래프를 사용

# 8. 향후 확장 포인트

table_activity 테이블 추가

freshness 정식 계산 로직 추가

Job execution history API 추가

Drawer UI 통합 검색

DataHub-like glossary 연결

# 📌 최종 정리

Table Panel API

GET /api/v1/tables/{table_id}/detail
GET /api/v1/tables/{full_name}/timelines


Job Panel API

GET /api/v1/jobs/{job_id}/detail


정적 메타데이터 저장
→ table_property 테이블 추가로 해결

그래프/패널 분리 설계
→ Graph = 관계 조회
→ Detail = 엔티티 상세 조회