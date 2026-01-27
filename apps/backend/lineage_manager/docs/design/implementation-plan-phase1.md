# Phase 1 구현 계획: Generated Column 방식

## 개요
- **목표**: Project/User 기준 검색 API 구현
- **접근**: Generated Column + Index (최소 변경)
- **예상 기간**: 1-2주
- **영향 범위**: 최소 (기존 코드 거의 수정 없음)

---

## 1. 현재 데이터 구조 분석 결과

### 1.1 Job Properties JSON 구조
```json
{
  "type": "SELF-TYPE",
  "status": "RUNNING",
  "scheduling_type": "SELF-TYPE",
  "governance": {},
  "owner": "user_a",
  "labels": {
    "project": "self-scheduling",
    "team": "data-platform"
  },
  "is_active": true,
  "schedule": {
    "cron_expression": "@daily",
    "start_date": "2026-01-01",
    "end_date": null
  },
  "upstreams": [...],
  "downstreams": [...]
}
```

### 1.2 데이터 추출 경로
- **Owner**: `properties.owner` (직접 필드)
- **Project ID**: `properties.labels.project` (중첩 필드)

### 1.3 데이터 소스
- `GraphCommandService._extract_job_properties()` 메서드에서 `SchedulingLineage.metadata`로부터 추출
- Job Manager API에서 받은 데이터를 그대로 저장

---

## 2. 데이터베이스 스키마 변경

### 2.1 Generated Column 추가

```sql
-- Migration: 0003_add_search_columns.py

ALTER TABLE graph_node
ADD COLUMN owner_id VARCHAR(100) 
  AS (JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner'))) STORED,
ADD COLUMN project_id VARCHAR(100) 
  AS (JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.project'))) STORED;

CREATE INDEX idx_graph_node_owner ON graph_node(owner_id);
CREATE INDEX idx_graph_node_project ON graph_node(project_id);
CREATE INDEX idx_graph_node_type_owner ON graph_node(node_type, owner_id);
CREATE INDEX idx_graph_node_type_project ON graph_node(node_type, project_id);
```

### 2.2 인덱스 전략
- **단일 컬럼 인덱스**: 기본 검색용
- **복합 인덱스**: `node_type` + `owner_id/project_id` (Job만 필터링)

---

## 3. API 엔드포인트 설계

### 3.1 신규 엔드포인트

#### Project API
```python
# /api/v1/endpoints/projects.py

@router.get("/api/v1/projects/{project_id}")
def get_project_detail(project_id: str)

@router.get("/api/v1/projects/{project_id}/jobs")
def list_project_jobs(
    project_id: str,
    limit: int = 20,
    offset: int = 0
)
```

#### User API (기존 users.py 확장)
```python
# /api/v1/endpoints/users.py

@router.get("/api/v1/users/{user_id}")
def get_user_detail(user_id: str)

@router.get("/api/v1/users/{user_id}/jobs")
def list_user_jobs(
    user_id: str,
    limit: int = 20,
    offset: int = 0
)
```

### 3.2 Response 스키마

#### ProjectDetail
```python
class ProjectDetail(BaseModel):
    project_id: str
    display_name: str
    business_unit: Optional[str] = None

class ProjectSummary(BaseModel):
    jobs: int
    tables: int = 0  # Phase 2

class ProjectDetailResponse(BaseModel):
    project: ProjectDetail
    summary: ProjectSummary
```

#### UserDetail
```python
class UserDetail(BaseModel):
    user_id: str
    email: Optional[str] = None
    department: Optional[str] = None
    status: str = "ACTIVE"

class UserSummary(BaseModel):
    owned_jobs: int

class UserDetailResponse(BaseModel):
    user: UserDetail
    summary: UserSummary
```

#### JobListItem
```python
class JobListItem(BaseModel):
    node_id: int
    job_name: str
    owner_id: Optional[str] = None
    project_id: Optional[str] = None
    status: str
    enabled: bool = True

class JobListResponse(BaseModel):
    jobs: List[JobListItem]
    total: int
    limit: int
    offset: int
```

---

## 4. Repository 레이어 수정

### 4.1 JobRepository 확장

```python
# repositories/job_repository.py

class JobRepository(BaseRepository):
    
    def find_by_project(
        self, 
        project_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> tuple[List[GraphNode], int]:
        """
        Project ID로 Job 검색 (Generated Column 사용)
        
        Returns:
            (jobs, total_count)
        """
        query = (
            self.session.query(GraphNode)
            .filter(GraphNode.node_type == "job")
            .filter(GraphNode.project_id == project_id)
        )
        
        total = query.count()
        jobs = query.limit(limit).offset(offset).all()
        
        return jobs, total
    
    def find_by_owner(
        self, 
        owner_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> tuple[List[GraphNode], int]:
        """
        Owner ID로 Job 검색 (Generated Column 사용)
        
        Returns:
            (jobs, total_count)
        """
        query = (
            self.session.query(GraphNode)
            .filter(GraphNode.node_type == "job")
            .filter(GraphNode.owner_id == owner_id)
        )
        
        total = query.count()
        jobs = query.limit(limit).offset(offset).all()
        
        return jobs, total
    
    def get_project_stats(self, project_id: str) -> dict:
        """Project 통계 조회"""
        job_count = (
            self.session.query(GraphNode)
            .filter(GraphNode.node_type == "job")
            .filter(GraphNode.project_id == project_id)
            .count()
        )
        
        return {"jobs": job_count}
    
    def get_owner_stats(self, owner_id: str) -> dict:
        """User 통계 조회"""
        job_count = (
            self.session.query(GraphNode)
            .filter(GraphNode.node_type == "job")
            .filter(GraphNode.owner_id == owner_id)
            .count()
        )
        
        return {"owned_jobs": job_count}
```

---

## 5. Service 레이어 추가

### 5.1 ProjectService

```python
# services/project_service.py

class ProjectService:
    """Project 관련 비즈니스 로직"""
    
    def __init__(self, uow: GraphUnitOfWork):
        self.uow = uow
    
    def get_project_detail(self, project_id: str) -> dict:
        """
        Project Detail 조회
        
        Note: Phase 1에서는 display_name을 project_id와 동일하게 반환
              Phase 3에서 PROJECT 테이블 추가 시 실제 데이터 조회
        """
        stats = self.uow.jobs.get_project_stats(project_id)
        
        if stats["jobs"] == 0:
            raise ValueError(f"Project '{project_id}' not found")
        
        return {
            "project": {
                "project_id": project_id,
                "display_name": project_id.replace("-", " ").title(),
                "business_unit": None
            },
            "summary": stats
        }
    
    def list_project_jobs(
        self, 
        project_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> dict:
        """Project 내 Job 목록 조회"""
        jobs, total = self.uow.jobs.find_by_project(project_id, limit, offset)
        
        return {
            "jobs": [self._format_job(job) for job in jobs],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    def _format_job(self, job: GraphNode) -> dict:
        """Job 노드를 API 응답 형식으로 변환"""
        meta = job.job_metadata or {}
        
        return {
            "node_id": job.id,
            "job_name": job.display_name or job.name,
            "owner_id": job.owner,
            "project_id": job.labels.get("project") if job.labels else None,
            "status": meta.get("status", "unknown"),
            "enabled": meta.get("enabled", True)
        }
```

### 5.2 UserService 확장

```python
# services/user_service.py (기존 파일 확장)

class UserService:
    
    def get_user_detail(self, user_id: str) -> dict:
        """
        User Detail 조회
        
        Note: Phase 1에서는 기본 정보만 반환
              Phase 3에서 USER 테이블 추가 시 실제 데이터 조회
        """
        stats = self.uow.jobs.get_owner_stats(user_id)
        
        if stats["owned_jobs"] == 0:
            raise ValueError(f"User '{user_id}' not found")
        
        return {
            "user": {
                "user_id": user_id,
                "email": f"{user_id}@company.com",  # 임시
                "department": None,
                "status": "ACTIVE"
            },
            "summary": stats
        }
    
    def list_user_jobs(
        self, 
        user_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> dict:
        """User가 소유한 Job 목록 조회"""
        jobs, total = self.uow.jobs.find_by_owner(user_id, limit, offset)
        
        return {
            "jobs": [self._format_job(job) for job in jobs],
            "total": total,
            "limit": limit,
            "offset": offset
        }
```

---

## 6. 구현 순서

### Step 1: 데이터베이스 마이그레이션
- [ ] Alembic migration 파일 작성
- [ ] 로컬 환경에서 마이그레이션 테스트
- [ ] 기존 데이터에 대한 Generated Column 값 확인

### Step 2: Repository 레이어
- [ ] `JobRepository`에 검색 메서드 추가
- [ ] 통계 조회 메서드 추가
- [ ] 단위 테스트 작성

### Step 3: Service 레이어
- [ ] `ProjectService` 생성
- [ ] `UserService` 확장
- [ ] 비즈니스 로직 테스트

### Step 4: API 엔드포인트
- [ ] `projects.py` 라우터 생성
- [ ] `users.py` 라우터 확장
- [ ] Response 스키마 정의
- [ ] API 문서 확인 (Swagger)

### Step 5: Container 설정
- [ ] DI Container에 Service 등록
- [ ] Wiring 설정

### Step 6: 통합 테스트
- [ ] E2E 테스트 작성
- [ ] 성능 테스트 (인덱스 효과 확인)

---

## 7. 테스트 전략

### 7.1 단위 테스트

```python
# tests/unit/repositories/test_job_repository.py

def test_find_by_project():
    """Project ID로 Job 검색 테스트"""
    
def test_find_by_owner():
    """Owner ID로 Job 검색 테스트"""

def test_get_project_stats():
    """Project 통계 조회 테스트"""
```

### 7.2 통합 테스트

```python
# tests/integration/test_project_api.py

def test_get_project_detail():
    """GET /api/v1/projects/{project_id}"""
    
def test_list_project_jobs():
    """GET /api/v1/projects/{project_id}/jobs"""

def test_list_project_jobs_pagination():
    """페이지네이션 테스트"""
```

---

## 8. 성능 고려사항

### 8.1 인덱스 효과
- **Before**: Full Table Scan (O(n))
- **After**: Index Scan (O(log n))

### 8.2 예상 성능
- 10,000개 Job 기준
- Project 검색: ~10ms (인덱스 사용)
- 페이지네이션: ~5ms

### 8.3 모니터링
- Slow Query Log 활성화
- 검색 API 응답 시간 측정

---

## 9. 제약사항 및 주의사항

### 9.1 MySQL 버전
- **필수**: MySQL 5.7+ (Generated Column 지원)
- 현재 환경 확인 필요

### 9.2 JSON 경로 표준화
- `$.owner` 경로 고정
- `$.labels.project` 경로 고정
- Job Manager API 응답 구조 변경 시 마이그레이션 필요

### 9.3 NULL 처리
- `owner_id`가 NULL인 경우 검색 제외
- `project_id`가 NULL인 경우 검색 제외

---

## 10. 롤백 계획

### 10.1 마이그레이션 롤백
```sql
ALTER TABLE graph_node
DROP INDEX idx_graph_node_type_project,
DROP INDEX idx_graph_node_type_owner,
DROP INDEX idx_graph_node_project,
DROP INDEX idx_graph_node_owner,
DROP COLUMN project_id,
DROP COLUMN owner_id;
```

### 10.2 코드 롤백
- 신규 엔드포인트는 독립적이므로 라우터만 제거
- 기존 코드 영향 없음

---

## 11. Phase 2 준비사항

Phase 1 완료 후 다음 단계를 위한 고려사항:

### 11.1 데이터 수집
- Project별 Job 수 분포
- Owner별 Job 수 분포
- 검색 패턴 분석

### 11.2 성능 분석
- Generated Column vs 별도 테이블 성능 비교
- 인덱스 크기 모니터링

### 11.3 사용자 피드백
- API 사용성 평가
- 추가 필요 기능 파악

---

## 12. 체크리스트

### 구현 전 확인
- [ ] MySQL 버전 확인 (5.7+)
- [ ] 현재 `properties` JSON 구조 샘플 데이터 확인
- [ ] Job Manager API 응답 구조 문서 확인
- [ ] 기존 Job 데이터에 `owner`, `labels.project` 필드 존재 여부 확인

### 구현 중 확인
- [ ] Generated Column 값이 올바르게 생성되는지 확인
- [ ] 인덱스가 실제로 사용되는지 EXPLAIN으로 확인
- [ ] NULL 값 처리 로직 테스트
- [ ] 페이지네이션 경계 조건 테스트

### 구현 후 확인
- [ ] Swagger 문서 업데이트
- [ ] API 응답 시간 측정
- [ ] 프론트엔드 팀에 API 스펙 공유
- [ ] 운영 환경 배포 계획 수립
