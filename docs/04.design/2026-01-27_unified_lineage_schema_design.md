# Lineage Manager 통합 설계서 (최종)
- 버전: 1.1 (2026-01-27)
- 상태: **확정 (구현 완료)**

## 1. 개요 및 변경 내역

본 문서는 Lineage Platform의 백엔드 데이터베이스 구조와 데이터 흐름에 대한 최종 설계 사양을 담고 있습니다. 이전의 개별 설계 문서들을 통합하고, 실제 구현 과정에서 변경된 최신 사항을 반영했습니다.

### 1.1 주요 변경 및 고도화 내역
1.  **Properties JSON 분리 및 정형화 (핵심 시작점)**: 기존 `graph_node` 테이블의 `properties` JSON 컬럼에 비정형으로 저장되던 필드들 중 검색과 관리에 필수적인 데이터(프로젝트, 오너, 데이터셋 등)를 추출하여 `job_node`, `table_node`라는 별도의 정형 테이블로 분리했습니다. 이를 통해 검색 성능을 최적화하고 데이터 스키마를 명확히 정의할 수 있게 되었습니다.
2.  **테이블 명칭 표준화**: 용어 혼선을 줄이기 위해 검색/메타 테이블의 명칭을 변경했습니다.
    - `job_meta` → `job_node` (Job 노드의 검색 인덱스 데이터)
    - `table_meta` → `table_node` (Table 노드의 검색 인덱스 데이터)
    - `project_meta` → `project` (프로젝트 마스터 정보)
    - `user` → `user_account` (SSO 및 통합 사용자 정보)
3.  **사용자 테이블 통합**: 레거시 `user` 테이블과 `graph_user_account`를 `user_account` 하나로 통합하여 SSO 계정과 데이터 카탈로그 계정을 단일 계정 체계에서 관리하도록 수정했습니다.
4.  **그래프 초기화(Reset) 정책 확립**: 그래프 초기화 시 관계(`edge`, `closure`)와 노드 검색 인덱스(`job_node`, `table_node`)는 삭제하되, 행정 데이터인 사용자(`user_account`)와 프로젝트(`project`) 정보는 보존하도록 변경하여 SSO 사용자 정보와 업무 연속성을 보장합니다.
5.  **ID 병합 로직 최적화**: 작업 등록 시 발견된 소유자(Owner) 정보와 추후 SSO 로그인을 통해 생성되는 계정을 `user_id` 기준으로 자동 병합(Merge)하는 로직을 구현했습니다.

---

## 2. 테이블 구조 (Table Schema)

### 2.1 Graph Layer (연결 및 구조)

#### `graph_node`
- 그래프 상의 모든 개체(Job, Table)를 식별하는 루트 테이블
- `id`, `node_type` (job/table), `name`, `properties` (기본 속성 JSON)

#### `graph_edge`
- 노드 간의 직접적인 연결 관계
- `from_node_id`, `to_node_id`, `edge_type` (job_to_table, table_to_job), `dependency_type` (HARD/SOFT)

#### `graph_closure`
- 전이적 폐포(Transitive Closure). 영향도 분석 및 계층 구조 조회를 위해 사용
- `ancestor_id`, `descendant_id`, `depth`, `path`

### 2.2 Search & Catalog Layer (검색 및 관리)

#### `job_node` (구 job_meta)
- Job 노드의 검색 속성을 별도로 골라낸 검색 인덱스 테이블
- `node_id` (FK to graph_node), `project_id`, `owner_id`, `properties` (상세 메타 JSON)

#### `table_node` (구 table_meta)
- Table 노드의 검색 속성 (데이터셋, 테이블명 등) 인덱스 테이블
- `node_id` (FK to graph_node), `dataset`, `table_name`, `properties`

#### `project` (구 project_meta)
- 프로젝트 마스터 정보 관리 테이블
- `project_id`, `display_name`, `description`, `business_unit`, `status`

#### `user_account` (구 user)
- SSO 로그인 정보 및 데이터 오너 정보를 포함한 통합 사용자 테이블
- `user_id`, `sub` (SSO ID), `email`, `name`, `roles`, `status`

#### `project_user`
- 프로젝트와 사용자 간의 권한 관계 (M:N)
- `project_id`, `user_id`, `role` (OWNER, MEMBER, VIEWER)

---

## 3. 데이터 업데이트 흐름 (SchedulingLineage Payload)

하나의 `SchedulingLineage` 정보가 시스템에 들어왔을 때, 다음과 같은 순서로 테이블이 업데이트됩니다.

### 예시 데이터 (Payload)
```json
{
  "job_id": "daily_summary_job",
  "name": "일간 정산 작업",
  "metadata": {
    "project": "finance-dept",
    "owner": "admin@company.com"
  },
  "upstreams": [{"name": "raw.sales_transaction"}],
  "downstreams": [{"name": "mart.daily_revenue"}]
}
```

### 1단계: 노드 및 검색 인덱스 생성
1.  **`graph_node`**: `job_id`를 `name`으로 하여 'job' 타입 노드 생성 (또는 업데이트).
2.  **`graph_node` (Table)**: 입력/출력 테이블들에 대해 'table' 타입 노드들 생성.
3.  **`job_node`**: 해당 Job의 `node_id`와 함께 `project_id`('finance-dept'), `owner_id`('admin@company.com') 저장.
4.  **`table_node`**: 각 테이블 노드의 데이터셋과 테이블명 파싱하여 저장.

### 2단계: 마스터 정보 확인
5.  **`project`**: 'finance-dept' 프로젝트가 없다면 기본 정보로 자동 생성.
6.  **`user_account`**: 'admin@company.com' 사용자가 없다면 카탈로그 유저로 우선 등록 (이후 실제 사용자가 SSO 로그인 시 `sub`가 업데이트되며 병합됨).

### 3단계: 관계 및 계층 정보 구축
7.  **`graph_edge`**:
    - `raw.sales_transaction` → `daily_summary_job` (input)
    - `daily_summary_job` → `mart.daily_revenue` (output)
8.  **`graph_closure`**: (백그라운드 또는 리빌드 시) 전체 전이적 관계 계산하여 저장.

---

## 4. 운영 정책

### 4.1 그래프 초기화 (Reset Graph)
콘솔에서 "Reset Graph" 기능을 실행하면 다음과 같은 작업이 일어납니다:
- **삭제 대상**: `graph_edge`, `graph_closure`, `graph_node`, `job_node`, `table_node`
- **보존 대상**: `user_account` (SSO 사용자 계정), `project` (프로젝트 마스터 정보), `project_user` (권한 관리 데이터)

이 정책을 통해 새롭게 데이터를 빌드하더라도 기존에 생성된 사용자 계정이나 프로젝트 권한 설정은 그대로 유지됩니다.

---

## 5. 참고 문서 및 코드

### 관련 코드 위치
- **Models**: `models/graph_node.py`, `models/job_node.py`, `models/user_account.py`, `models/project.py`
- **Repositories**: `repositories/job_node_repository.py`, `repositories/user_repository.py`
- **Services**: `services/graph_command_service.py` (핵심 로직), `services/graph_initializer.py` (배치 로직)

### 설계 검토 이력
- 2026.01.27: 테이블 명칭 변경 및 사용자 테이블 통합 완료.
- 2026.01.27: 그래프 초기화 시 사용자/프로젝트 보존 로직 적용.
