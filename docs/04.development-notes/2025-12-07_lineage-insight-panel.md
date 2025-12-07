# 📘 Table Node UI Specification

Overview / Lineage / Schema / Activity Tabs
for Lineage Manager (Graph Manager)

## 1. 목적

본 문서는 Table Node 선택 시 우측 패널에서 제공되는 4개 탭(Overview / Lineage / Schema / Activity) UI의 구성, 데이터 구조, 인터랙션 및 시각 표현을 정의한다.
이 UI는 GCP BigQuery, DataHub, Atlan 등 현대적인 데이터 계보(Lineage) UI의 표준 패턴을 준수한다.

## 2. 패널 구조 (Tabs Layout)

Table Node를 클릭하면 우측 패널에 다음 4개의 탭이 표시된다:

Overview | Lineage | Schema | Activity


각 탭은 독립적인 기능을 제공하며, 동일한 Panel Container 안에서 콘텐츠만 전환된다.

## 3. Overview Tab

Table Node의 기본 메타데이터 + properties 기반 확장 정보를 제공하는 탭.

### 3.1 기본 표출 항목
필드	설명
Table Name	full table name (project.dataset.table)
Owner	관리 주체 (팀 또는 사용자)
Storage	BigQuery / S3 / GCS / Internal Table
Partition	파티션 정보
Labels	key-value metadata
Created At	생성 시점 (선택)
### 3.2 properties["table.overview"] 자동 매핑

DB에 저장된 node.properties 중:

{
  "table.overview": {
    "pii_level": "high",
    "quality_score": 82,
    "usage_frequency": "hourly",
    "service_owner": "Platform Ops",
    "retention_policy": "90 days"
  }
}


→ Overview 탭에서 자동으로 다음과 같이 표시됨:

Additional Metadata
─────────────────────────────────
PII Level: High
Quality Score: 82
Usage Frequency: Hourly
Service Owner: Platform Ops
Retention Policy: 90 Days

### 3.3 Overview UI Example (Mockup)
[ Overview ]

Table Info
────────────────────────────────────────
Name: demo.analytics.sales_daily
Owner: data-team
Storage: BigQuery Table
Partition: DATE(_PARTITIONTIME)

Additional Metadata
────────────────────────────────────────
PII Level: High
Quality Score: 82
Usage Frequency: Hourly
Service Owner: Platform Ops
Retention Policy: 90 Days

## 4. Lineage Tab (Lineage Insight Panel)

Lineage 구조를 분석해 제공하는 동적 인사이트 탭이다.
사용자의 탐색 경험을 크게 향상시키는 핵심 기능.

### 4.1 표시 요소
(1) Path to Root

테이블이 어떤 상위(source) 테이블에서 유래했는지 축약된 경로 형태로 제공

“Show Full Path” → Drawer 오픈

SRC_A → ... → sales_daily
[ Show Full Path ]

(2) Root / Leaf Tables Summary
Root Tables (23)
SRC_A, SRC_B, SRC_C …
[ View All ]

Leaf Tables (11)
REPORT_A, REPORT_B …
[ View All ]


View All 클릭 → Drawer로 전체 목록 표시

Drawer에서 검색 가능

(3) Upstream / Downstream Summary
Upstream: 72 tables · 18 jobs
Downstream: 14 tables · 5 jobs

(4) Depth Summary
Depth
Upstream Depth: 4
Downstream Depth: 3

## 5. Lineage Drawer

Lineage Tab에서 “Show Full Path” 또는 “View All”을 클릭 시
오른쪽에서 슬라이드되는 Drawer가 열린다.

기능:

Root/Leaf 목록 전체 출력

Full Lineage path 표시

검색 가능

Scroll 가능

Graph에는 영향 없음

## 6. Schema Tab

BigQuery Table 등의 스키마 정보를 표시하는 탭.

### 6.1 UI 항목
컬럼명	타입	설명(optional)
date	DATE	-
region	STRING	user region
sales_amount	FLOAT64	daily sales amount
created_at	TIMESTAMP	ingestion time
### 6.2 추가 요소

컬럼 검색

Partition/Clustering 정보 표시

Column-level metadata (lineage, owner, usage 등) 확장 가능

### 6.3 Schema UI Example (Mockup)
[ Schema ]

Columns (12)
────────────────────────────────
date            DATE
region          STRING
sales_amount    FLOAT64
is_active       BOOL
created_at      TIMESTAMP
...

## 7. Activity Tab (Load Timeline / Timeliness)

기존에 너가 제공한 Google Data Catalog 스타일 UI를 그대로 적용한다.
Table이 일정 주기에 따라 정상적으로 로딩되었는지 시각적으로 보여준다.

### 7.1 Timeliness Summary (Last N Days)
Timeliness (Last 14 Days)
[🟩 Loaded] [🟥 Missing]

01 02 03 04 05 06 07 ...
[🟩][🟩][🟩][🟩][🟩][🟩][🟥]...

Tooltip Example:
Data Interval
2025-04-04 00:00 ~ 2025-04-05 00:00

### 7.2 Detailed Timeline (Hourly)
Hourly Timeline (Selected Day)
01 02 03 04 05 06 ... 23
[🟩][🟥][🟩][🟩][🟩]...

### 7.3 Activity Tab Mockup
[ Activity ]

Timeliness (Last 14 Days)
────────────────────────────────────────────
🟩 Loaded    🟥 Missing

01 02 03 04 05 06 07 08 09 10 11 12 13 14
🟩 🟩 🟩 🟩 🟩 🟩 🟥 🟥 🟥 🟥 🟩 🟩 🟩 🟩

Tooltip:
Data Interval 2025-04-04 ~ 2025-04-05
────────────────────────────────────────────

Detailed Timeline
01 02 03 04 05 ... 23
🟥 🟩 🟩 🟩 🟥 ...

## 8. 패널 구조 전체 개요 (최종)
┌──────────────────────────────────────────────────────────────┐
│                        Graph Canvas                           │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────── Right Panel (Tabs) ────────────────────┐
│ Overview | Lineage | Schema | Activity                        │
│                                                           ▼   │
│ (Active Tab Content)                                          │
└────────────────────────────────────────────────────────────────┘


Drawer는 Lineage 탭의 부가 기능으로 동작한다.

## 9. Node Properties 규칙 (중요)
표준 property 구조
properties = {
  "table.overview": { ... },
  "table.schema": { ... },
  "table.activity": { ... },
  "table.lineage": { ... },
  ...
}


Overview 탭 → properties["table.overview"]

Schema 탭 → DB schema + optional metadata

Activity 탭 → properties["table.activity"]

Lineage 탭 → Graph 기반 계산값 (properties 사용 X)

## 10. 확장성

추가 탭 또는 기능 확장이 용이한 구조이다:

향후 기능	탭 또는 확장 위치
Data Quality Score	Overview 또는 Activity
Lineage Impact Simulation	Lineage 탭
Upstream freshness	Activity 탭
Column-level lineage	Schema 탭
## 📌 최종 결론

이 문서는 Table Node에 대한 완전체 UI 탭 구성을 정의한다.
결과적으로:

Overview → 정적 정보

Lineage → 계보(리니지) 인사이트

Schema → 테이블 스키마

Activity → Timeliness / Load Timeline

모두 상호 독립적, UX 명확, 표준 기반으로 구성되었다.