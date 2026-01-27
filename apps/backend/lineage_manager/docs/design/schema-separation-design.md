# 그래프 정보와 메타 정보 테이블 분리 설계

## 개요
- **목적**: 그래프 구조 정보와 비즈니스 메타데이터를 별도 테이블로 분리
- **접근**: 정규화된 스키마 설계 (옵션 A)
- **장점**: 검색 성능, 데이터 일관성, 확장성 향상

---

## 1. 설계 원칙

### 1.1 관심사의 분리 (Separation of Concerns)

**그래프 정보 (Graph Layer)**
- 노드와 엣지의 관계
- 그래프 구조 (Closure Table)
- 변경 빈도: 낮음
- 목적: Lineage 추적, 의존성 분석

**메타 정보 (Metadata Layer)**
- 비즈니스 속성 (owner, project, status)
- 검색 및 필터링용 데이터
- 변경 빈도: 높음
- 목적: 검색, 통계, 관리

### 1.2 설계 목표

1. **성능**: 검색 쿼리 최적화 (인덱스 활용)
2. **확장성**: 새로운 메타데이터 추가 용이
3. **일관성**: 데이터 정규화 및 제약조건
4. **호환성**: 기존 API 하위 호환성 유지

---

## 2. 새로운 스키마 설계

### 2.1 Core Graph Tables (그래프 레이어)

#### GRAPH_NODE (기존 - 단순화)
```sql
CREATE TABLE graph_node (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  node_type VARCHAR(50) NOT NULL,           -- 'job' | 'table'
  name VARCHAR(500) NOT NULL,               -- Natural ID (job_id, table_name)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_node_type_name (node_type, name),
  INDEX idx_node_type (node_type)
);
```

**변경 사항**:
- ❌ `properties` JSON 컬럼 제거 (메타데이터는 별도 테이블로)
- ✅ 순수 그래프 식별 정보만 유지

#### GRAPH_EDGE (기존 - 유지)
```sql
CREATE TABLE graph_edge (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source_node_id BIGINT NOT NULL,
  target_node_id BIGINT NOT NULL,
  edge_type VARCHAR(20) NOT NULL,           -- 'dependency' | 'input' | 'output'
  dependency_type VARCHAR(50),              -- 'HARD' | 'SOFT'
  properties JSON,                          -- Edge 속성 (필요시)
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  UNIQUE KEY uq_edge (source_node_id, target_node_id, edge_type),
  FOREIGN KEY (source_node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  INDEX idx_source (source_node_id),
  INDEX idx_target (target_node_id)
);
```

#### GRAPH_CLOSURE (기존 - 유지)
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

---

### 2.2 Metadata Tables (메타데이터 레이어)

#### JOB_METADATA (신규)
```sql
CREATE TABLE job_metadata (
  node_id BIGINT PRIMARY KEY,               -- FK → graph_node.id
  
  -- 검색 필드
  project_id VARCHAR(100) NOT NULL,
  owner_id VARCHAR(100) NOT NULL,
  
  -- 상태 정보
  status VARCHAR(50) NOT NULL DEFAULT 'unknown',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scheduling_type VARCHAR(50),              -- 'SELF-TYPE' | 'REQUEST-TYPE'
  
  -- 스케줄 정보
  cron_expression VARCHAR(100),
  start_date DATE,
  end_date DATE,
  
  -- 추가 속성 (확장 가능)
  labels JSON,                              -- {"team": "data-platform", ...}
  governance JSON,                          -- Governance 정보
  extra_metadata JSON,                      -- 기타 메타데이터
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  INDEX idx_project (project_id),
  INDEX idx_owner (owner_id),
  INDEX idx_project_owner (project_id, owner_id),
  INDEX idx_status (status),
  INDEX idx_enabled (enabled)
);
```

**핵심 포인트**:
- `project_id`, `owner_id`를 직접 컬럼으로 → 인덱스 최적화
- `status`, `enabled` 등 자주 조회되는 필드 분리
- `labels`, `governance`, `extra_metadata`는 JSON으로 유연성 유지

#### TABLE_METADATA (신규)
```sql
CREATE TABLE table_metadata (
  node_id BIGINT PRIMARY KEY,               -- FK → graph_node.id
  
  -- BigQuery 식별 정보
  project_name VARCHAR(100),
  dataset_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(300) NOT NULL,          -- project.dataset.table
  
  -- 테이블 속성
  storage_type VARCHAR(50) DEFAULT 'bigquery',
  write_mode VARCHAR(50),                   -- 'APPEND' | 'OVERWRITE'
  owner_id VARCHAR(100),
  
  -- 추가 속성
  extra_metadata JSON,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE,
  UNIQUE KEY uq_full_name (full_name),
  INDEX idx_dataset (dataset_name),
  INDEX idx_project_dataset (project_name, dataset_name),
  INDEX idx_owner (owner_id)
);
```

---

### 2.3 Catalog Tables (선택적 - Phase 3)

#### PROJECT (신규 - Dimension Table)
```sql
CREATE TABLE project (
  project_id VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  business_unit VARCHAR(100),
  description TEXT,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  INDEX idx_business_unit (business_unit),
  INDEX idx_status (status)
);
```

#### USER (신규 - Dimension Table)
```sql
CREATE TABLE user (
  user_id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  UNIQUE KEY uq_email (email),
  INDEX idx_department (department),
  INDEX idx_status (status)
);
```

**외래키 추가 (선택)**:
```sql
ALTER TABLE job_metadata
ADD CONSTRAINT fk_job_project FOREIGN KEY (project_id) REFERENCES project(project_id),
ADD CONSTRAINT fk_job_owner FOREIGN KEY (owner_id) REFERENCES user(user_id);
```

---

## 3. 데이터 마이그레이션 전략

### 3.1 마이그레이션 단계

#### Phase 1: 테이블 생성
```sql
-- 1. 새 테이블 생성 (위 스키마 참조)
CREATE TABLE job_metadata (...);
CREATE TABLE table_metadata (...);
```

#### Phase 2: 데이터 마이그레이션
```sql
-- 2-1. Job 메타데이터 마이그레이션
INSERT INTO job_metadata (
  node_id,
  project_id,
  owner_id,
  status,
  enabled,
  scheduling_type,
  cron_expression,
  start_date,
  end_date,
  labels,
  governance,
  extra_metadata
)
SELECT 
  id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.project')) as project_id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner')) as owner_id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.status')) as status,
  COALESCE(JSON_EXTRACT(properties, '$.is_active'), TRUE) as enabled,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.scheduling_type')) as scheduling_type,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.schedule.cron_expression')) as cron_expression,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.schedule.start_date')) as start_date,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.schedule.end_date')) as end_date,
  JSON_EXTRACT(properties, '$.labels') as labels,
  JSON_EXTRACT(properties, '$.governance') as governance,
  properties as extra_metadata
FROM graph_node
WHERE node_type = 'job'
  AND JSON_EXTRACT(properties, '$.owner') IS NOT NULL
  AND JSON_EXTRACT(properties, '$.labels.project') IS NOT NULL;

-- 2-2. Table 메타데이터 마이그레이션
INSERT INTO table_metadata (
  node_id,
  project_name,
  dataset_name,
  table_name,
  full_name,
  storage_type,
  write_mode,
  owner_id,
  extra_metadata
)
SELECT 
  id,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.project_name')) as project_name,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.dataset_name')) as dataset_name,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.table_name')) as table_name,
  name as full_name,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.storage_type')) as storage_type,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.write_mode')) as write_mode,
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner')) as owner_id,
  properties as extra_metadata
FROM graph_node
WHERE node_type = 'table';
```

#### Phase 3: 검증 및 정리
```sql
-- 3-1. 데이터 검증
SELECT 
  (SELECT COUNT(*) FROM graph_node WHERE node_type = 'job') as total_jobs,
  (SELECT COUNT(*) FROM job_metadata) as migrated_jobs;

-- 3-2. graph_node.properties 컬럼 제거 (선택)
-- 주의: 롤백 불가능하므로 충분한 검증 후 실행
-- ALTER TABLE graph_node DROP COLUMN properties;
```

### 3.2 NULL 값 처리

```sql
-- project_id 또는 owner_id가 NULL인 Job 처리
UPDATE job_metadata
SET project_id = 'unknown'
WHERE project_id IS NULL OR project_id = '';

UPDATE job_metadata
SET owner_id = 'system'
WHERE owner_id IS NULL OR owner_id = '';
```

---

## 4. Repository 레이어 변경

### 4.1 JobRepository 확장

```python
# repositories/job_repository.py

class JobRepository(BaseRepository):
    
    def get_with_metadata(self, job_id: str) -> Optional[Tuple[GraphNode, JobMetadata]]:
        """Job과 메타데이터를 함께 조회"""
        result = (
            self.session.query(GraphNode, JobMetadata)
            .join(JobMetadata, GraphNode.id == JobMetadata.node_id)
            .filter(GraphNode.node_type == "job")
            .filter(GraphNode.name == job_id)
            .first()
        )
        return result if result else None
    
    def find_by_project(
        self, 
        project_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> Tuple[List[Tuple[GraphNode, JobMetadata]], int]:
        """Project ID로 Job 검색 (JOIN 사용)"""
        query = (
            self.session.query(GraphNode, JobMetadata)
            .join(JobMetadata, GraphNode.id == JobMetadata.node_id)
            .filter(JobMetadata.project_id == project_id)
        )
        
        total = query.count()
        results = query.limit(limit).offset(offset).all()
        
        return results, total
    
    def find_by_owner(
        self, 
        owner_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> Tuple[List[Tuple[GraphNode, JobMetadata]], int]:
        """Owner ID로 Job 검색 (JOIN 사용)"""
        query = (
            self.session.query(GraphNode, JobMetadata)
            .join(JobMetadata, GraphNode.id == JobMetadata.node_id)
            .filter(JobMetadata.owner_id == owner_id)
        )
        
        total = query.count()
        results = query.limit(limit).offset(offset).all()
        
        return results, total
```

### 4.2 새로운 Repository 추가

```python
# repositories/job_metadata_repository.py

class JobMetadataRepository(BaseRepository):
    """Job 메타데이터 전용 Repository"""
    
    def __init__(self, session):
        super().__init__(session, JobMetadata)
    
    def get_by_node_id(self, node_id: int) -> Optional[JobMetadata]:
        return self.session.query(JobMetadata).filter_by(node_id=node_id).first()
    
    def create_or_update(self, node_id: int, **metadata) -> JobMetadata:
        """메타데이터 생성 또는 업데이트"""
        existing = self.get_by_node_id(node_id)
        
        if existing:
            for key, value in metadata.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            return existing
        else:
            new_metadata = JobMetadata(node_id=node_id, **metadata)
            self.session.add(new_metadata)
            return new_metadata
    
    def get_project_stats(self, project_id: str) -> dict:
        """Project 통계"""
        return {
            "jobs": self.session.query(JobMetadata)
                .filter_by(project_id=project_id)
                .count()
        }
```

---

## 5. Model 정의

### 5.1 JobMetadata Model

```python
# models/job_metadata.py

from sqlalchemy import Column, BigInteger, String, Boolean, Date, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class JobMetadata(Base):
    __tablename__ = "job_metadata"
    
    node_id = Column(BigInteger, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True)
    
    # 검색 필드
    project_id = Column(String(100), nullable=False, index=True)
    owner_id = Column(String(100), nullable=False, index=True)
    
    # 상태 정보
    status = Column(String(50), nullable=False, default="unknown")
    enabled = Column(Boolean, nullable=False, default=True)
    scheduling_type = Column(String(50))
    
    # 스케줄 정보
    cron_expression = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    
    # JSON 필드
    labels = Column(JSON)
    governance = Column(JSON)
    extra_metadata = Column(JSON)
    
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    
    # Relationship
    node = relationship("GraphNode", backref="job_metadata")
    
    def __repr__(self):
        return f"<JobMetadata(node_id={self.node_id}, project={self.project_id}, owner={self.owner_id})>"
```

### 5.2 TableMetadata Model

```python
# models/table_metadata.py

class TableMetadata(Base):
    __tablename__ = "table_metadata"
    
    node_id = Column(BigInteger, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True)
    
    project_name = Column(String(100))
    dataset_name = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)
    full_name = Column(String(300), nullable=False, unique=True)
    
    storage_type = Column(String(50), default="bigquery")
    write_mode = Column(String(50))
    owner_id = Column(String(100))
    
    extra_metadata = Column(JSON)
    
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    
    node = relationship("GraphNode", backref="table_metadata")
```

---

## 6. Service 레이어 수정

### 6.1 GraphCommandService 수정

```python
# services/graph_command_service.py

def register_lineage_job(self, lineage: SchedulingLineage, compute_closure: bool = True) -> str:
    """
    Job 등록 (Graph + Metadata 분리)
    """
    # 1. Graph Node 생성 (메타데이터 없음)
    job_node = self.uow.jobs.get_or_create(
        job_id=lineage.job_id,
        name=lineage.name
    )
    
    # 2. Job Metadata 생성
    metadata_dict = self._extract_job_metadata(lineage)
    self.uow.job_metadata.create_or_update(
        node_id=job_node.id,
        **metadata_dict
    )
    
    # 3. 나머지 로직 (upstreams, downstreams 처리)
    # ... (기존 로직 유지)
    
    return job_node.id

def _extract_job_metadata(self, lineage: SchedulingLineage) -> dict:
    """메타데이터 추출 (분리된 필드)"""
    meta = lineage.metadata or {}
    
    return {
        "project_id": meta.get("labels", {}).get("project", "unknown"),
        "owner_id": meta.get("owner", "system"),
        "status": lineage.status,
        "enabled": meta.get("is_active", True),
        "scheduling_type": lineage.type,
        "cron_expression": lineage.schedule.cron_expression if lineage.schedule else None,
        "start_date": lineage.schedule.start_date if lineage.schedule else None,
        "end_date": lineage.schedule.end_date if lineage.schedule else None,
        "labels": meta.get("labels", {}),
        "governance": lineage.governance,
        "extra_metadata": meta
    }
```

---

## 7. 장단점 분석

### 7.1 장점

✅ **검색 성능 향상**
- 인덱스 최적화 (project_id, owner_id 직접 인덱싱)
- JOIN 비용 < JSON 파싱 비용

✅ **데이터 일관성**
- 정규화된 스키마
- 외래키 제약조건 (선택)
- NULL 값 제어 용이

✅ **확장성**
- 새로운 메타데이터 필드 추가 용이
- Catalog 테이블 (PROJECT, USER) 추가 가능

✅ **유지보수성**
- 명확한 스키마 구조
- 타입 안정성 (VARCHAR vs JSON)

### 7.2 단점

❌ **마이그레이션 복잡도**
- 기존 데이터 마이그레이션 필요
- 다운타임 또는 복잡한 배포 전략

❌ **코드 변경 범위**
- Repository, Service, API 레이어 수정
- 기존 코드 호환성 유지 필요

❌ **JOIN 비용**
- 메타데이터 조회 시 항상 JOIN 필요
- 단, 인덱스 최적화로 상쇄 가능

---

## 8. 마이그레이션 로드맵

### Phase 1: 준비 (1주)
- [ ] 스키마 최종 검토 및 승인
- [ ] 마이그레이션 스크립트 작성
- [ ] 개발 환경 테스트

### Phase 2: 구현 (2-3주)
- [ ] Model 클래스 생성
- [ ] Repository 레이어 수정
- [ ] Service 레이어 수정
- [ ] 단위 테스트 작성

### Phase 3: 마이그레이션 (1주)
- [ ] 스테이징 환경 마이그레이션
- [ ] 데이터 검증
- [ ] 성능 테스트

### Phase 4: 배포 (1주)
- [ ] 운영 환경 마이그레이션
- [ ] 모니터링 및 롤백 준비
- [ ] 기존 properties 컬럼 제거 (선택)

---

## 9. 롤백 계획

### 9.1 마이그레이션 중 롤백

```sql
-- 메타데이터 테이블 삭제
DROP TABLE IF EXISTS job_metadata;
DROP TABLE IF EXISTS table_metadata;

-- graph_node.properties 복원 (백업에서)
-- 또는 기존 properties 유지 (제거하지 않은 경우)
```

### 9.2 코드 롤백

- 기존 코드 브랜치로 복원
- properties 기반 로직 재활성화

---

## 10. 권장 사항

### 10.1 단계적 접근

1. **Phase 1**: 메타데이터 테이블 생성 + 데이터 복제
   - `graph_node.properties` 유지 (백업 용도)
   - 새 테이블에 데이터 복제
   
2. **Phase 2**: 코드 전환
   - 읽기: 메타데이터 테이블 사용
   - 쓰기: 양쪽 모두 업데이트 (Dual Write)
   
3. **Phase 3**: properties 제거
   - 충분한 검증 후
   - 롤백 불가능 시점

### 10.2 성능 모니터링

```sql
-- JOIN 성능 확인
EXPLAIN SELECT n.*, jm.*
FROM graph_node n
JOIN job_metadata jm ON n.id = jm.node_id
WHERE jm.project_id = 'self-scheduling';

-- 인덱스 사용 확인
SHOW INDEX FROM job_metadata;
```

---

## 11. 다음 단계

### 즉시 수행
- [ ] 스키마 설계 최종 검토
- [ ] 마이그레이션 스크립트 작성
- [ ] 테스트 데이터 준비

### 구현 준비
- [ ] Alembic migration 파일 작성
- [ ] Model 클래스 구현
- [ ] Repository 레이어 구현 계획 수립
