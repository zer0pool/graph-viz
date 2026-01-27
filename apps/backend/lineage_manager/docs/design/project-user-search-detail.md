# Project / User 검색 & Detail 지원 설계

## 문서 정보
- **작성일**: 2026-01-27
- **목적**: Project ID / User ID 기준 검색 및 Detail 페이지 지원
- **범위**: 검색 API, Detail API (Graph/Lineage 제외)

---

## 1. 현재 상태 분석

### 1.1 기존 스키마 (Current Schema)

#### GRAPH_NODE (기존)
```sql
CREATE TABLE graph_node (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  node_type VARCHAR(50) NOT NULL,  -- 'job' | 'table'
  name VARCHAR(500) NOT NULL,
  properties JSON,                  -- 모든 메타데이터를 JSON으로 저장
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE (node_type, name)
);
```

**현재 properties JSON 구조 (Job 노드)**:
```json
{
  "owner": "user_a",
  "labels": {"project": "self-scheduling", "team": "data-platform"},
  "status": "active",
  "enabled": true,
  "trigger_tables": ["table1", "table2"],
  "reference_tables": ["table3"],
  "destination_tables": ["table4"],
  "job_metadata": {
    "schedule": "@daily",
    "retry": 3
  }
}
```

**현재 properties JSON 구조 (Table 노드)**:
```json
{
  "project_name": "my-project",
  "dataset_name": "my_dataset",
  "table_name": "my_table",
  "storage_type": "bigquery",
  "full_name": "my-project.my_dataset.my_table"
}
```

### 1.2 기존 API 엔드포인트

현재 구현된 API:
- `GET /api/v1/jobs/{job_id}` - Job Detail
- `GET /api/v1/jobs/{job_id}/graph` - Job Graph
- `GET /api/v1/tables/{table_name}` - Table Detail
- `GET /api/v1/users/` - User List (더미 데이터)
- `GET /api/v1/users/me` - 현재 사용자 프로필

### 1.3 문제점 및 개선 필요사항

1. **검색 성능 이슈**
   - `project_id`와 `owner_id`가 JSON properties 내부에 있어 인덱싱 불가
   - Project/User 기준 검색 시 Full Table Scan 필요

2. **데이터 일관성**
   - Project/User 정보가 정규화되지 않음
   - 중복 데이터 관리 어려움

3. **API 부재**
   - Project 기준 검색 API 없음
   - User 기준 Job 검색 API 없음
   - Project/User Detail API 없음

---

## 2. 제안 스키마 설계

### 2.1 옵션 A: 별도 테이블 생성 (정규화 접근)

#### JOB_NODE
```sql
CREATE TABLE job_node (
  node_id BIGINT PRIMARY KEY,           -- FK → graph_node.id
  project_id VARCHAR(100) NOT NULL,
  owner_id VARCHAR(100) NOT NULL,
  properties JSON,                       -- 나머지 메타데이터
  created_at DATETIME NOT NULL,
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_project ON job_node(project_id);
CREATE INDEX idx_job_owner ON job_node(owner_id);
```

#### TABLE_NODE
```sql
CREATE TABLE table_node (
  node_id BIGINT PRIMARY KEY,           -- FK → graph_node.id
  dataset VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  properties JSON,                       -- 나머지 메타데이터
  created_at DATETIME NOT NULL,
  UNIQUE (dataset, table_name),
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE
);
```

#### PROJECT (Catalog/Dimension)
```sql
CREATE TABLE project (
  project_id VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(255),
  created_at DATETIME
);
```

#### USER (Catalog/Dimension)
```sql
CREATE TABLE user (
  user_id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255),
  department VARCHAR(100),
  status VARCHAR(20),
  created_at DATETIME
);
```

**장점**:
- 검색 성능 최적화 (인덱스 활용)
- 데이터 정규화 및 일관성 보장
- 명확한 스키마 구조

**단점**:
- 마이그레이션 복잡도 증가
- 기존 코드 대폭 수정 필요
- 테이블 수 증가

---

### 2.2 옵션 B: Generated Column + Index (최소 변경)

기존 `graph_node` 테이블 유지하고, JSON 필드에 대한 Generated Column 추가:

```sql
ALTER TABLE graph_node
ADD COLUMN project_id VARCHAR(100) 
  AS (JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.project'))) STORED,
ADD COLUMN owner_id VARCHAR(100) 
  AS (JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner'))) STORED;

CREATE INDEX idx_graph_node_project ON graph_node(project_id);
CREATE INDEX idx_graph_node_owner ON graph_node(owner_id);
```

**장점**:
- 기존 구조 유지
- 마이그레이션 간단
- 검색 성능 개선

**단점**:
- JSON 구조 변경 시 Generated Column도 수정 필요
- 데이터 정규화 부족
- MySQL 5.7+ 필요

---

### 2.3 권장 접근: 하이브리드 (단계적 마이그레이션)

**Phase 1**: Generated Column으로 빠른 검색 지원
- 옵션 B 적용하여 즉시 검색 성능 개선
- API 먼저 구현하여 기능 검증

**Phase 2**: 별도 테이블 마이그레이션
- 사용 패턴 분석 후 옵션 A로 전환
- 점진적 데이터 마이그레이션

---

## 3. API 설계

### 3.1 Project 관련 API

#### 3.1.1 Project Detail
```
GET /api/v1/projects/{project_id}
```

**Response**:
```json
{
  "project": {
    "project_id": "self-scheduling",
    "display_name": "Self Scheduling Platform",
    "business_unit": "Data Platform"
  },
  "summary": {
    "jobs": 42,
    "tables": 15
  }
}
```

#### 3.1.2 Project 내 Job 검색
```
GET /api/v1/projects/{project_id}/jobs?limit=20&offset=0
```

**SQL (Generated Column 사용)**:
```sql
SELECT 
  g.id, 
  g.name, 
  g.owner_id,
  g.properties
FROM graph_node g
WHERE g.node_type = 'job' 
  AND g.project_id = :project_id
LIMIT :limit OFFSET :offset;
```

**Response**:
```json
{
  "jobs": [
    {
      "node_id": 101,
      "job_name": "daily_sales_aggregation",
      "owner_id": "user_a",
      "status": "active"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### 3.1.3 Project 내 Table 검색 (선택)
```
GET /api/v1/projects/{project_id}/tables?limit=20&offset=0
```
(PROJECT) -- (JOB) --- (TABLE)  의 관계라 project, table 의 직접적인 연결은 없다. 
이 api 는 만들지 않음. 
---

### 3.2 User 관련 API

#### 3.2.1 User Detail
```
GET /api/v1/users/{user_id}
```

**Response**:
```json
{
  "user": {
    "user_id": "user_a",
    "email": "user_a@company.com",
    "department": "Data Platform",
    "status": "ACTIVE"
  },
  "summary": {
    "owned_jobs": 23
  }
}
```

#### 3.2.2 User가 소유한 Job 검색
```
GET /api/v1/users/{user_id}/jobs?limit=20&offset=0
```

**SQL (Generated Column 사용)**:
```sql
SELECT 
  g.id, 
  g.name, 
  g.project_id,
  g.properties
FROM graph_node g
WHERE g.node_type = 'job' 
  AND g.owner_id = :user_id
LIMIT :limit OFFSET :offset;
```

**Response**:
```json
{
  "jobs": [
    {
      "node_id": 101,
      "job_name": "daily_sales_aggregation",
      "project_id": "self-scheduling",
      "status": "active"
    }
  ],
  "total": 23,
  "limit": 20,
  "offset": 0
}
```

---

### 3.3 Job Detail API (기존 개선)

```
GET /api/v1/jobs/{node_id}
```

**현재 구현**: `job_id` (name) 기준 조회
**개선 필요**: `node_id` 기준 조회도 지원

**Response**:
```json
{
  "node": {
    "id": 101,
    "type": "job",
    "name": "daily_sales_aggregation",
    "created_at": "2026-01-10T09:12:00Z"
  },
  "job": {
    "project": {
      "project_id": "self-scheduling",
      "display_name": "Self Scheduling Platform"
    },
    "owner": {
      "user_id": "user_a",
      "email": "user_a@company.com"
    },
    "properties": {
      "schedule": "@daily",
      "retry": 3,
      "status": "active",
      "enabled": true
    }
  }
}
```

---

## 4. 검색 & Detail 흐름

### 4.1 Project 기준
```
/projects/{project_id}
 → /projects/{project_id}/jobs
   → /jobs/{node_id}
```

### 4.2 User 기준
```
/users/{user_id}
 → /users/{user_id}/jobs
   → /jobs/{node_id}
```

---

## 5. 구현 우선순위

### Phase 1: 최소 기능 구현 (1-2주)
1. ✅ Generated Column 추가 (Alembic migration)
2. ✅ Project/User 검색 API 구현
3. ✅ 기존 Job Detail API 개선
4. ✅ 기본 테스트 작성

### Phase 2: 데이터 정규화 (2-3주)
1. ⬜ JOB_NODE, TABLE_NODE 테이블 생성
2. ⬜ 데이터 마이그레이션 스크립트
3. ⬜ Repository 레이어 수정
4. ⬜ 통합 테스트

### Phase 3: Catalog 테이블 (선택)
1. ⬜ PROJECT, USER 테이블 생성
2. ⬜ 외래키 제약조건 추가
3. ⬜ Admin API 구현

---

## 6. 기술적 고려사항

### 6.1 데이터베이스
- **MySQL Version**: 5.7+ (Generated Column 지원)
- **인덱스 전략**: project_id, owner_id에 인덱스
- **JSON 경로**: `$.labels.project`, `$.owner` 표준화 필요

### 6.2 성능
- **예상 검색 성능**: O(log n) with index
- **페이지네이션**: limit/offset 방식
- **캐싱**: 필요 시 Redis 도입 고려

### 6.3 호환성
- **기존 API**: 하위 호환성 유지
- **프론트엔드**: 새로운 API 엔드포인트 추가
- **데이터 마이그레이션**: 무중단 배포 가능

---

## 7. 다음 단계

### 즉시 검토 필요
1. **스키마 접근 방식 결정**: 옵션 A vs B vs 하이브리드
2. **JSON 구조 표준화**: project_id 저장 위치 통일
3. **User 데이터 소스**: 실제 User 데이터는 어디서 가져올지?

### 구현 전 확인 필요
1. 현재 `properties` JSON 구조 전수 조사
2. 기존 Job 등록 로직에서 project_id 추출 방법
3. 테스트 데이터 준비

---

## 8. 질문 사항

1. **Project ID 저장 위치**: 현재 `labels.project`에 저장되어 있는지? 아니면 별도 필드?
2. **User 데이터**: User 테이블은 실제 인증 시스템과 연동? 아니면 독립적?
3. **우선순위**: Phase 1만 먼저 구현? 아니면 전체 마이그레이션?
4. **기존 데이터**: 현재 운영 중인 데이터 규모는? (마이그레이션 전략 수립용)

---

## 부록: 원본 설계 문서 비교

### 원본 설계와의 차이점

| 항목 | 원본 설계 | 현재 제안 |
|------|----------|----------|
| 스키마 접근 | 별도 테이블 생성 | 하이브리드 (단계적) |
| 마이그레이션 | 즉시 전환 | Phase별 점진적 |
| 기존 코드 영향 | 대폭 수정 | 최소 수정 후 확장 |
| 검색 성능 | 최적 | 충분 (Generated Column) |

### 원본 설계 장점 유지
- ✅ Project/User 기준 검색 지원
- ✅ node_id 기반 Detail 조회
- ✅ 명확한 API 구조
- ✅ 확장 가능한 설계
