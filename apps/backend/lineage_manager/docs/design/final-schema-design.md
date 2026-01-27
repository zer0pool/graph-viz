# Lineage Manager DB 설계서
## Graph 정보 / Metadata 분리 설계 (최종)

---

## 1. 설계 목적

본 설계의 목적은 다음을 동시에 만족하는 것이다:

1. **그래프 탐색(Lineage Traversal)을 빠르고 단순하게**
2. **검색·관리·상세 화면용 메타 정보는 독립적으로 관리**
3. **외부 의존성(IAM 등) 없이 로컬/테스트 환경에서 완결**
4. **Job / Table / User / Project의 역할을 명확히 분리**

---

## 2. 핵심 설계 원칙 (확정)

### 2.1 역할 분리 원칙

| 구분 | 역할 |
|------|------|
| **Graph 테이블** | 연결 관계, 탐색, 영향도 |
| **Meta 테이블** | 검색, 관리, 화면 표시 |

> **Graph는 구조, Meta는 의미**  
> **둘은 섞지 않는다.**

### 2.2 저장 원칙

✅ **Graph 테이블에는 비즈니스 의미를 넣지 않는다**
- project, owner, schedule 등 ❌
- 순수 노드 식별자와 연결 정보만

✅ **Meta 테이블에는 그래프 탐색 로직을 넣지 않는다**
- upstream/downstream 계산 ❌
- 검색과 화면 표시용 데이터만

✅ **둘은 `node_id`로만 연결한다**
- 1:1 관계 유지
- Foreign Key로 무결성 보장

---

## 3. 전체 구조 개요

```
[ Graph Layer ]
  ├─ GRAPH_NODE      (노드 식별)
  ├─ GRAPH_EDGE      (연결 관계)
  └─ GRAPH_CLOSURE   (전이적 폐포)

[ Meta Layer ]
  ├─ JOB_META        (Job 메타데이터)
  ├─ TABLE_META      (Table 메타데이터)
  ├─ PROJECT_META    (Project 메타데이터)
  ├─ USER            (사용자 정보)
  └─ PROJECT_USER    (프로젝트-사용자 관계)
```

---

## 4. Graph Layer (그래프 정보 전용)

### 4.1 GRAPH_NODE

```sql
CREATE TABLE graph_node (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  node_type VARCHAR(20) NOT NULL,           -- 'job' | 'table'
  name VARCHAR(255) NOT NULL,               -- logical identifier (job_id, table_name)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_node_type_name (node_type, name),
  INDEX idx_node_type (node_type)
);
```

#### 책임
- ✅ 그래프 상의 노드 식별
- ✅ Edge 연결의 기준점
- ✅ Lineage 탐색의 출발점

#### 의도적으로 포함하지 않는 것
- ❌ `project` - Meta 테이블로
- ❌ `owner` - Meta 테이블로
- ❌ `schedule` - Meta 테이블로
- ❌ `storage` - Meta 테이블로
- ❌ `properties` JSON - Meta 테이블로

---

### 4.2 GRAPH_EDGE

```sql
CREATE TABLE graph_edge (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  from_node_id BIGINT NOT NULL,
  to_node_id BIGINT NOT NULL,
  edge_type VARCHAR(50) NOT NULL,           -- 'job_to_table' | 'table_to_job'
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_edge (from_node_id, to_node_id, edge_type),
  FOREIGN KEY (from_node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  INDEX idx_edge_from (from_node_id),
  INDEX idx_edge_to (to_node_id)
);
```

#### 책임
- ✅ 노드 간 방향성 연결
- ✅ Upstream / Downstream 탐색
- ✅ Lineage 경로 추적

#### Edge Type 정의
- `job_to_table`: Job → Table (writes)
- `table_to_job`: Table → Job (reads)

---

### 4.3 GRAPH_CLOSURE (기존 유지)

```sql
CREATE TABLE graph_closure (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ancestor_id BIGINT NOT NULL,
  descendant_id BIGINT NOT NULL,
  depth INT NOT NULL DEFAULT 0,
  path JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  UNIQUE KEY uq_closure (ancestor_id, descendant_id, depth),
  FOREIGN KEY (ancestor_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  FOREIGN KEY (descendant_id) REFERENCES graph_node(id) ON DELETE CASCADE
);
```

#### 책임
- ✅ 전이적 폐포 (Transitive Closure) 관리
- ✅ 빠른 조상/자손 조회
- ✅ 영향도 분석

---

## 5. Meta Layer (검색·관리·화면 전용)

### 5.1 JOB_META (검색의 중심)

```sql
CREATE TABLE job_meta (
  node_id BIGINT PRIMARY KEY,               -- FK → graph_node.id
  
  -- 검색 필드 (인덱싱 대상)
  project_id VARCHAR(100) NOT NULL,
  owner_id VARCHAR(100) NOT NULL,
  
  -- 메타데이터 (JSON)
  properties JSON,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  INDEX idx_job_project (project_id),
  INDEX idx_job_owner (owner_id),
  INDEX idx_job_project_owner (project_id, owner_id)
);
```

#### 책임
- ✅ **Project / User 기준 검색**
- ✅ **Job Detail 화면에 필요한 정보 제공**
- ✅ **Graph와 분리된 "의미 정보"**

#### properties JSON 구조 예시
```json
{
  "status": "RUNNING",
  "enabled": true,
  "scheduling_type": "SELF-TYPE",
  "schedule": {
    "cron_expression": "@daily",
    "start_date": "2026-01-01",
    "end_date": null
  },
  "labels": {
    "team": "data-platform",
    "environment": "production"
  },
  "governance": {},
  "display_name": "Daily Sales Aggregation"
}
```

---

### 5.2 TABLE_META

```sql
CREATE TABLE table_meta (
  node_id BIGINT PRIMARY KEY,               -- FK → graph_node.id
  
  -- BigQuery 식별 정보
  dataset VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  
  -- 메타데이터 (JSON)
  properties JSON,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_dataset_table (dataset, table_name),
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  INDEX idx_table_dataset (dataset)
);
```

#### 책임
- ✅ **Table의 자연 키 관리** (dataset.table_name)
- ✅ **Table Detail 화면 정보 제공**

#### properties JSON 구조 예시
```json
{
  "project_name": "my-project",
  "full_name": "my-project.my_dataset.my_table",
  "storage_type": "bigquery",
  "write_mode": "APPEND",
  "owner": "user_a",
  "description": "Sales transaction data"
}
```

---

### 5.3 PROJECT_META

```sql
CREATE TABLE project_meta (
  project_id VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  business_unit VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_business_unit (business_unit),
  INDEX idx_status (status)
);
```

#### 책임
- ✅ **Project 기본 정보 관리**
- ✅ **Project Detail 화면 제공**
- ✅ **Project 목록 조회**

#### 주요 필드
- `project_id`: 프로젝트 식별자 (예: "self-scheduling")
- `display_name`: 화면 표시용 이름 (예: "Self Scheduling Platform")
- `business_unit`: 소속 부서/조직
- `status`: 프로젝트 상태 (ACTIVE, ARCHIVED, DEPRECATED)

---

### 5.4 USER

```sql
CREATE TABLE user (
  user_id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  department VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_email (email),
  INDEX idx_department (department),
  INDEX idx_status (status)
);
```

#### 책임
- ✅ 사용자 기본 정보 관리
- ✅ User Detail 화면 제공
- ✅ 외부 IAM 대체 (로컬/테스트 환경)

---

### 5.5 PROJECT_USER

```sql
CREATE TABLE project_user (
  project_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  role VARCHAR(50),                         -- 'OWNER' | 'MEMBER' | 'VIEWER'
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES project_meta(project_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
  INDEX idx_project_user_user (user_id),
  INDEX idx_project_user_project (project_id)
);
```

#### 책임
- ✅ **Project ↔ User 관계 관리**
- ✅ **프로젝트 멤버 조회**
- ✅ **사용자별 프로젝트 목록 조회**
- ✅ **외부 IAM 대체**
- ✅ **Redis 캐시의 Source of Truth**

#### Role 정의
- `OWNER`: 프로젝트 소유자 (모든 권한)
- `MEMBER`: 일반 멤버 (읽기/쓰기)
- `VIEWER`: 조회 전용

---

## 6. 검색 시나리오별 처리 흐름

### 6.1 Project 기준 Job 검색

```
GET /api/v1/projects/{project_id}/jobs
```

**DB 경로**:
```sql
SELECT n.*, jm.*
FROM job_meta jm
JOIN graph_node n ON jm.node_id = n.id
WHERE jm.project_id = :project_id
LIMIT :limit OFFSET :offset;
```

**흐름**:
```
JOB_META.project_id = ?
 → node_id
 → GRAPH_NODE
```

---

### 6.2 User 기준 Job 검색

```
GET /api/v1/users/{user_id}/jobs
```

**DB 경로**:
```sql
SELECT n.*, jm.*
FROM job_meta jm
JOIN graph_node n ON jm.node_id = n.id
WHERE jm.owner_id = :user_id
LIMIT :limit OFFSET :offset;
```

**흐름**:
```
JOB_META.owner_id = ?
 → node_id
 → GRAPH_NODE
```

---

### 6.3 Project Detail 조회

```
GET /api/v1/projects/{project_id}
```

**DB 경로**:
```sql
-- Project 기본 정보
SELECT * FROM project_meta WHERE project_id = :project_id;

-- Project 통계
SELECT COUNT(*) as job_count
FROM job_meta
WHERE project_id = :project_id;
```

**응답 예시**:
```json
{
  "project": {
    "project_id": "self-scheduling",
    "display_name": "Self Scheduling Platform",
    "business_unit": "Data Platform",
    "status": "ACTIVE"
  },
  "summary": {
    "jobs": 42,
    "members": 5
  }
}
```

---

### 6.4 Project 멤버 조회

```
GET /api/v1/projects/{project_id}/members
```

**DB → Redis 캐시**:
```sql
SELECT u.*, pu.role
FROM project_user pu
JOIN user u ON pu.user_id = u.user_id
WHERE pu.project_id = :project_id
ORDER BY pu.role, u.name;
```

**캐싱 전략**:
- Redis Key: `project:members:{project_id}`
- TTL: 7일
- Invalidation: Project 멤버 변경 시

**응답 예시**:
```json
{
  "members": [
    {
      "user_id": "user_a",
      "email": "user_a@company.com",
      "name": "User A",
      "role": "OWNER"
    },
    {
      "user_id": "user_b",
      "email": "user_b@company.com",
      "name": "User B",
      "role": "MEMBER"
    }
  ]
}
```

---

## 7. Detail 페이지 데이터 조합 방식

### 7.1 Job Detail

```
GET /api/v1/jobs/{node_id}
```

**데이터 조합**:
```
GRAPH_NODE (id, node_type, name)
 + JOB_META (project_id, owner_id, properties)
 + USER (owner 정보)
```

**SQL**:
```sql
SELECT 
  n.id, n.node_type, n.name,
  jm.project_id, jm.owner_id, jm.properties,
  u.email, u.name as owner_name, u.department
FROM graph_node n
JOIN job_meta jm ON n.id = jm.node_id
LEFT JOIN user u ON jm.owner_id = u.user_id
WHERE n.id = :node_id;
```

**응답 예시**:
```json
{
  "node": {
    "id": 101,
    "type": "job",
    "name": "daily_sales_aggregation"
  },
  "job": {
    "project_id": "self-scheduling",
    "owner": {
      "user_id": "user_a",
      "email": "user_a@company.com",
      "name": "User A",
      "department": "Data Platform"
    },
    "properties": {
      "status": "RUNNING",
      "enabled": true,
      "schedule": {...}
    }
  }
}
```

---

### 7.2 Table Detail

```
GET /api/v1/tables/{node_id}
```

**데이터 조합**:
```
GRAPH_NODE (id, node_type, name)
 + TABLE_META (dataset, table_name, properties)
```

**SQL**:
```sql
SELECT 
  n.id, n.node_type, n.name,
  tm.dataset, tm.table_name, tm.properties
FROM graph_node n
JOIN table_meta tm ON n.id = tm.node_id
WHERE n.id = :node_id;
```

---

## 8. Graph / Meta 분리의 효과

### 8.1 장점

✅ **Graph 테이블 극도로 안정**
- 스키마 변경 거의 없음
- 마이그레이션 리스크 최소화

✅ **Meta 테이블 변경이 Graph에 영향 없음**
- 비즈니스 로직 변경 시 Meta만 수정
- Graph 탐색 로직 독립적

✅ **검색/관리 쿼리 단순**
- 인덱스 최적화 용이
- JOIN 비용 예측 가능

✅ **테스트 데이터 만들기 쉬움**
- Graph: 최소 노드/엣지만
- Meta: 필요한 속성만

✅ **나중에 Graph DB로 교체도 쉬움**
- Graph Layer만 교체
- Meta Layer는 그대로 유지

---

### 8.2 의도적으로 하지 않는 것

❌ **Graph 테이블에 project / owner 저장**
- 검색 성능을 위해 Meta 테이블로

❌ **Meta 테이블에서 traversal 수행**
- Lineage 탐색은 Graph 테이블에서만

❌ **양쪽에 중복 데이터 저장**
- Single Source of Truth 원칙

---

## 9. Redis 캐시 전략 (명확)

| 대상 | Source of Truth | Cache | TTL |
|------|----------------|-------|-----|
| **Project Info** | DB (PROJECT_META) | Redis | 1일 |
| **Project Members** | DB (PROJECT_USER) | Redis | 7일 |
| **Job 검색** | DB | ❌ (캐시 안 함) | - |
| **Graph** | DB | (선택, 나중에) | - |
| **User Profile** | DB (USER) | Redis | 1일 |

**캐시 키 규칙**:
- `project:info:{project_id}` → Project object
- `project:members:{project_id}` → List of {user_id, role}
- `user:profile:{user_id}` → User object
- `user:projects:{user_id}` → List of project_id

---

## 10. 데이터 마이그레이션 전략

### 10.1 마이그레이션 단계

#### Step 1: 새 테이블 생성
```sql
CREATE TABLE job_meta (...);
CREATE TABLE table_meta (...);
CREATE TABLE project_meta (...);
CREATE TABLE user (...);
CREATE TABLE project_user (...);
```

#### Step 2: 기존 데이터 마이그레이션
```sql
-- Job 메타데이터 추출
INSERT INTO job_meta (node_id, project_id, owner_id, properties)
SELECT 
  id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.project')) as project_id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner')) as owner_id,
  properties
FROM graph_node
WHERE node_type = 'job';

-- Table 메타데이터 추출
INSERT INTO table_meta (node_id, dataset, table_name, properties)
SELECT 
  id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.dataset_name')) as dataset,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.table_name')) as table_name,
  properties
FROM graph_node
WHERE node_type = 'table';
```

#### Step 3: graph_node 정리
```sql
-- properties 컬럼 제거 (충분한 검증 후)
ALTER TABLE graph_node DROP COLUMN properties;
```

### 10.2 NULL 값 처리

```sql
-- project_id가 NULL인 경우 기본값 설정
UPDATE job_meta
SET project_id = 'unknown'
WHERE project_id IS NULL OR project_id = '';

-- owner_id가 NULL인 경우 기본값 설정
UPDATE job_meta
SET owner_id = 'system'
WHERE owner_id IS NULL OR owner_id = '';
```

---

## 11. Repository 레이어 구조

### 11.1 JobRepository

```python
class JobRepository(BaseRepository):
    """Graph Node (Job) 조회"""
    
    def get(self, job_id: str) -> Optional[GraphNode]:
        """Job ID로 Graph Node 조회"""
        return self.session.query(GraphNode).filter(
            GraphNode.node_type == "job",
            GraphNode.name == job_id
        ).first()
```

### 11.2 JobMetaRepository

```python
class JobMetaRepository(BaseRepository):
    """Job 메타데이터 조회 및 검색"""
    
    def find_by_project(self, project_id: str, limit: int, offset: int):
        """Project 기준 검색"""
        return self.session.query(GraphNode, JobMeta).join(
            JobMeta, GraphNode.id == JobMeta.node_id
        ).filter(
            JobMeta.project_id == project_id
        ).limit(limit).offset(offset).all()
    
    def find_by_owner(self, owner_id: str, limit: int, offset: int):
        """Owner 기준 검색"""
        return self.session.query(GraphNode, JobMeta).join(
            JobMeta, GraphNode.id == JobMeta.node_id
        ).filter(
            JobMeta.owner_id == owner_id
        ).limit(limit).offset(offset).all()
```

---

## 12. 최종 설계 요약 (문서용)

### 핵심 원칙

1. **그래프 구조와 메타 정보는 물리적으로 분리한다**
2. **Graph는 연결만, Meta는 의미만 가진다**
3. **둘은 `node_id`로만 연결된다**

### 테이블 역할

| Layer | Table | 역할 |
|-------|-------|------|
| **Graph** | GRAPH_NODE | 노드 식별 |
| **Graph** | GRAPH_EDGE | 연결 관계 |
| **Graph** | GRAPH_CLOSURE | 전이적 폐포 |
| **Meta** | JOB_META | Job 검색·관리 |
| **Meta** | TABLE_META | Table 검색·관리 |
| **Meta** | PROJECT_META | 프로젝트 정보 |
| **Meta** | USER | 사용자 정보 |
| **Meta** | PROJECT_USER | 프로젝트-사용자 관계 |

### 검색 경로

```
Project 검색: JOB_META.project_id → node_id → GRAPH_NODE
User 검색:    JOB_META.owner_id → node_id → GRAPH_NODE
Lineage 탐색: GRAPH_NODE → GRAPH_EDGE → GRAPH_CLOSURE
```

---

## 13. 구현 체크리스트

### Phase 1: 스키마 생성 (1주)
- [ ] Alembic migration 파일 작성
- [ ] 개발 환경 테이블 생성
- [ ] 기존 데이터 마이그레이션 스크립트 작성

### Phase 2: Model & Repository (1주)
- [ ] JobMeta, TableMeta Model 생성
- [ ] ProjectMeta, User, ProjectUser Model 생성
- [ ] JobMetaRepository 구현
- [ ] TableMetaRepository 구현
- [ ] ProjectMetaRepository 구현

### Phase 3: Service & API (1주)
- [ ] ProjectService 구현
- [ ] UserService 확장
- [ ] API 엔드포인트 구현
- [ ] Response 스키마 정의

### Phase 4: 테스트 & 배포 (1주)
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 스테이징 환경 배포
- [ ] 운영 환경 배포

---

## 14. 참고 자료

### 관련 문서
- `project-user-search-detail.md` - 원본 설계 문서
- `schema-separation-design.md` - 상세 구현 설계
- `approach-comparison.md` - 설계 방식 비교

### 코드 위치
- `models/graph_node.py` - GraphNode 모델
- `models/job_meta.py` - JobMeta 모델 (신규)
- `repositories/job_repository.py` - Job 조회
- `repositories/job_meta_repository.py` - Job 검색 (신규)
