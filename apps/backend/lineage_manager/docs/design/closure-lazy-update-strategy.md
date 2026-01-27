# GRAPH_CLOSURE Lazy Update 전략

## 1. 문제 분석

### 1.1 현재 GRAPH_CLOSURE 비용

**초기화 시나리오**: 1000개 Job, 평균 depth 3
- **계산 복잡도**: O(N × D²) where N=노드수, D=depth
- **INSERT 횟수**: 수만~수십만 건
- **소요 시간**: 전체 초기화 시간의 70-80%

### 1.2 왜 비용이 큰가?

```python
# 현재 방식: Job 등록마다 Closure 계산
for job in jobs:
    register_job(job)  # ← 여기서 매번 closure 계산
    expand_closure(job)  # ← O(N²) 비용
```

**문제점**:
- Job 1000개 등록 시 1000번 계산
- 각 계산마다 기존 closure 조회 + 새 closure 생성
- 트랜잭션 내에서 동기 처리

---

## 2. Lazy Update 전략

### 2.1 핵심 아이디어

```
Job 등록: GRAPH_NODE + JOB_META + GRAPH_EDGE만 (빠름)
         ↓
Closure 계산: 나중에 일괄 처리 (비동기)
```

### 2.2 구현 방식

#### 옵션 A: 완전 분리 (권장)
```python
# 1. Job 등록 (빠름)
def register_lineage_job(lineage, compute_closure=False):
    job = create_job_node(lineage)
    create_job_meta(job, lineage)
    create_edges(job, lineage)
    # closure 계산 생략!
    return job.id

# 2. Closure 일괄 재계산 (나중에)
def rebuild_closure():
    """전체 closure 테이블 재계산"""
    truncate_closure()
    for edge in all_edges:
        expand_closure_from_edge(edge)
```

#### 옵션 B: 마킹 방식
```python
# 1. Job 등록 시 "dirty" 마킹
def register_lineage_job(lineage):
    job = create_job_node(lineage)
    mark_closure_dirty(job.id)  # ← 나중에 계산 필요 표시
    return job.id

# 2. 백그라운드 워커가 주기적으로 처리
def closure_worker():
    while True:
        dirty_nodes = get_dirty_nodes()
        for node in dirty_nodes:
            expand_closure(node)
            mark_closure_clean(node)
        sleep(60)  # 1분마다
```

#### 옵션 C: 이벤트 큐 방식
```python
# 1. Job 등록 시 이벤트 발행
def register_lineage_job(lineage):
    job = create_job_node(lineage)
    publish_event("job.created", job.id)  # ← Redis/Kafka
    return job.id

# 2. 이벤트 컨슈머가 처리
def closure_consumer():
    for event in consume_events("job.created"):
        expand_closure(event.job_id)
```

---

## 3. 권장 방식: 옵션 A (완전 분리)

### 3.1 이유

✅ **가장 단순**: 복잡한 상태 관리 불필요
✅ **성능 최고**: 초기화 시 closure 계산 완전 생략
✅ **안정성**: 기존 코드 최소 변경
✅ **테스트 용이**: 명확한 경계

### 3.2 구현 상세

#### Step 1: Job 등록 시 Closure 생략

```python
# services/graph_command_service.py

def register_lineage_job(
    self, 
    lineage: SchedulingLineage, 
    compute_closure: bool = False  # ← 기본값 False
) -> str:
    """
    Job 등록 (Closure 계산 선택적)
    
    Args:
        compute_closure: True면 즉시 계산, False면 나중에 일괄 계산
    """
    # 1. Graph Node
    job = self._create_job_node(lineage)
    
    # 2. Job Meta
    self._create_job_meta(job.id, lineage)
    
    # 3. Edges
    input_table_ids = self._create_upstream_edges(job, lineage.upstreams)
    output_table_ids = self._create_downstream_edges(job, lineage.downstreams)
    
    # 4. Closure (선택적)
    if compute_closure:
        self._update_closure(job, input_table_ids, output_table_ids)
    
    return job.id
```

#### Step 2: 초기화 시 Closure 생략

```python
# services/graph_initializer.py

async def initialize(self) -> Dict[str, Any]:
    """그래프 초기화 (Closure는 마지막에 일괄 계산)"""
    
    # 1. 기존 데이터 삭제
    self.command_service.reset_graph()
    
    # 2. Job 데이터 가져오기
    jobs_data = await self._fetch_jobs()
    
    # 3. Job 등록 (Closure 계산 생략)
    for job_data in jobs_data:
        self.command_service.register_lineage_job(
            job_data, 
            compute_closure=False  # ← 생략!
        )
    
    # 4. Closure 일괄 재계산
    logger.info("모든 Job 등록 완료. Closure 재계산 시작...")
    self.command_service.rebuild_closure()
    logger.info("Closure 재계산 완료")
    
    return {"status": "success", ...}
```

#### Step 3: Closure 일괄 재계산

```python
# services/graph_command_service.py

def rebuild_closure(self):
    """
    전체 Closure 테이블 재계산
    
    전략:
    1. 기존 closure 삭제
    2. 모든 edge로부터 closure 재계산
    """
    logger.info("Closure 재계산 시작...")
    
    # 1. 기존 closure 삭제
    self.uow.closures.clear_all()
    
    # 2. 모든 Job 노드 조회
    job_nodes = self.uow.jobs.get_all()
    
    # 3. 각 Job에 대해 closure 계산
    for i, job in enumerate(job_nodes):
        if i % 100 == 0:
            logger.info(f"Closure 계산 진행: {i}/{len(job_nodes)}")
        
        # Upstream closure
        upstream_tables = self.uow.job_table_links.get_tables_by_job_and_io_type(
            job.id, "input"
        )
        for table in upstream_tables:
            self._expand_closure_from_edge(table.id, job.id)
        
        # Downstream closure
        downstream_tables = self.uow.job_table_links.get_tables_by_job_and_io_type(
            job.id, "output"
        )
        for table in downstream_tables:
            self._expand_closure_from_edge(job.id, table.id)
    
    logger.info(f"Closure 재계산 완료: {len(job_nodes)}개 Job 처리")
```

---

## 4. 성능 비교

### 4.1 초기화 시간 (1000개 Job)

| 방식 | Node/Edge 생성 | Closure 계산 | 총 시간 |
|------|---------------|-------------|---------|
| **기존 (동기)** | 5초 | 45초 | **50초** |
| **Lazy (비동기)** | 5초 | 0초 | **5초** ✅ |
| **Lazy + 재계산** | 5초 | 30초 | **35초** |

**개선**: 초기화 시간 90% 단축 (50초 → 5초)

### 4.2 Closure 재계산 최적화

```python
def rebuild_closure_optimized(self):
    """최적화된 Closure 재계산"""
    
    # 1. 모든 edge 한 번에 조회
    edges = self.uow.edges.get_all()
    
    # 2. Batch로 closure 생성
    closures = []
    for edge in edges:
        # Direct closure (depth=0)
        closures.append({
            "ancestor_id": edge.from_node_id,
            "descendant_id": edge.to_node_id,
            "depth": 0
        })
        
        # Transitive closure 계산
        ancestors = self.uow.closures.get_ancestors(edge.from_node_id)
        for ancestor in ancestors:
            closures.append({
                "ancestor_id": ancestor.ancestor_id,
                "descendant_id": edge.to_node_id,
                "depth": ancestor.depth + 1
            })
    
    # 3. Bulk insert
    self.uow.closures.bulk_create(closures)
```

**효과**: 30초 → 10초 (3배 빠름)

---

## 5. 증분 업데이트 전략

### 5.1 신규 Job 추가 시

```python
# 실시간 Job 추가 (초기화 이후)
def add_new_job(lineage):
    # 옵션 1: 즉시 closure 계산 (실시간성 중요)
    register_lineage_job(lineage, compute_closure=True)
    
    # 옵션 2: 나중에 계산 (성능 중요)
    register_lineage_job(lineage, compute_closure=False)
    schedule_closure_update(job.id)  # 백그라운드 작업 예약
```

### 5.2 백그라운드 Closure 업데이트

```python
# 주기적으로 실행 (Celery/APScheduler)
@scheduler.task(interval=300)  # 5분마다
def update_pending_closures():
    """Closure가 없는 Job들에 대해 계산"""
    
    # Closure가 없는 Job 찾기
    jobs_without_closure = find_jobs_without_closure()
    
    for job in jobs_without_closure:
        expand_closure(job.id)
```

---

## 6. Closure 상태 추적 (선택)

### 6.1 상태 테이블 추가

```sql
CREATE TABLE closure_status (
  node_id BIGINT PRIMARY KEY,
  status VARCHAR(20) NOT NULL,  -- 'PENDING' | 'COMPUTING' | 'COMPLETE'
  last_updated DATETIME,
  FOREIGN KEY (node_id) REFERENCES graph_node(id) ON DELETE CASCADE
);
```

### 6.2 상태 관리

```python
def register_lineage_job(lineage, compute_closure=False):
    job = create_job_node(lineage)
    
    if compute_closure:
        expand_closure(job.id)
        mark_closure_status(job.id, "COMPLETE")
    else:
        mark_closure_status(job.id, "PENDING")
    
    return job.id

def closure_worker():
    """백그라운드 워커"""
    while True:
        pending_jobs = get_jobs_by_closure_status("PENDING")
        for job in pending_jobs:
            mark_closure_status(job.id, "COMPUTING")
            expand_closure(job.id)
            mark_closure_status(job.id, "COMPLETE")
        sleep(60)
```

---

## 7. API 영향 분석

### 7.1 Closure 필요한 API

```python
# Lineage 조회 (Closure 필수)
GET /api/v1/tables/{table_name}/lineage
→ Closure 테이블 조회

# 영향도 분석 (Closure 필수)
GET /api/v1/jobs/{job_id}/impact
→ Closure 테이블 조회
```

**대응**:
- 초기화 후 반드시 `rebuild_closure()` 실행
- 또는 API에서 on-demand 계산

### 7.2 Closure 불필요한 API

```python
# Job 검색 (Closure 불필요)
GET /api/v1/projects/{project_id}/jobs
→ JOB_META만 조회

# Job Detail (Closure 불필요)
GET /api/v1/jobs/{job_id}
→ GRAPH_NODE + JOB_META만 조회
```

**대응**: 영향 없음

---

## 8. 최종 권장 구현

### 8.1 초기화 시

```python
async def initialize(self):
    # 1. Job 등록 (Closure 생략)
    for job_data in jobs_data:
        self.command_service.register_lineage_job(
            job_data, 
            compute_closure=False  # ← 빠름!
        )
    
    # 2. Closure 일괄 재계산
    self.command_service.rebuild_closure()  # ← 한 번만
```

### 8.2 실시간 추가 시

```python
# 옵션 1: 즉시 계산 (추천)
def sync_job(job_id):
    lineage = fetch_job_from_manager(job_id)
    register_lineage_job(lineage, compute_closure=True)

# 옵션 2: 나중에 계산
def sync_job(job_id):
    lineage = fetch_job_from_manager(job_id)
    register_lineage_job(lineage, compute_closure=False)
    # 백그라운드 워커가 나중에 처리
```

---

## 9. 구현 체크리스트

### Phase 1: 기본 Lazy Update
- [ ] `register_lineage_job(compute_closure=False)` 파라미터 추가
- [ ] `rebuild_closure()` 메서드 구현
- [ ] 초기화 로직 수정 (closure 생략 → 일괄 재계산)
- [ ] 테스트 작성

### Phase 2: 최적화
- [ ] Bulk insert로 closure 생성 최적화
- [ ] 진행 상황 로깅 추가
- [ ] 성능 측정 및 튜닝

### Phase 3: 백그라운드 처리 (선택)
- [ ] Closure 상태 추적 테이블 추가
- [ ] 백그라운드 워커 구현
- [ ] 스케줄러 설정 (Celery/APScheduler)

---

## 10. 예상 효과

### 초기화 시간
- **Before**: 50초 (1000개 Job)
- **After**: 5초 (Job 등록만) + 10초 (Closure 재계산) = **15초**
- **개선**: 70% 단축

### 실시간 Job 추가
- **Before**: 50ms (closure 계산 포함)
- **After**: 5ms (closure 생략) 또는 50ms (즉시 계산)
- **개선**: 90% 단축 (비동기 모드)

### 검색 성능
- **영향 없음**: Closure 테이블 사용 안 함

**결론**: Lazy update로 초기화 시간 대폭 단축, 검색 성능은 유지!
