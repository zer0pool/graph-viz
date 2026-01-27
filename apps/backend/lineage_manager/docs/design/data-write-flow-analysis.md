# SchedulingLineage 데이터 쓰기 흐름 분석

## 1. 현재 상황 (Before - 단순)

### 기존 테이블 구조
```
GRAPH_NODE (properties JSON에 모든 메타데이터 포함)
GRAPH_EDGE
GRAPH_CLOSURE
```

### 기존 쓰기 순서
```python
# SchedulingLineage 데이터 입력 시
1. GRAPH_NODE (Job) - properties에 모든 정보 저장
2. GRAPH_NODE (Tables) - upstreams/downstreams
3. GRAPH_EDGE - Job ↔ Table 연결
4. GRAPH_CLOSURE - 전이적 폐포 계산
```

**총 테이블 수**: 3개 (실질적으로)

---

## 2. 새로운 설계 (After - 분리)

### 새 테이블 구조
```
[ Graph Layer ]
GRAPH_NODE
GRAPH_EDGE  
GRAPH_CLOSURE

[ Meta Layer ]
JOB_META
TABLE_META
PROJECT_META (선택)
USER (선택)
PROJECT_USER (선택)
```

### 새 쓰기 순서

#### 핵심 경로 (필수)
```python
# SchedulingLineage 데이터 입력 시
1. GRAPH_NODE (Job) - 순수 식별자만
2. JOB_META - Job 메타데이터 (project_id, owner_id, properties)
3. GRAPH_NODE (Tables) - upstreams/downstreams
4. TABLE_META - Table 메타데이터
5. GRAPH_EDGE - Job ↔ Table 연결
6. GRAPH_CLOSURE - 전이적 폐포 계산
```

**총 테이블 수**: 5개 (필수)

#### 선택적 경로 (Catalog 데이터)
```python
# PROJECT_META, USER, PROJECT_USER는 별도 관리
# Job 등록 시에는 쓰지 않음!
```

---

## 3. 실제 쓰기 비교

### Before (기존)
```python
def register_lineage_job(lineage: SchedulingLineage):
    # 1. Job Node 생성
    job = uow.jobs.get_or_create(
        job_id=lineage.job_id,
        name=lineage.name,
        properties={  # ← 모든 메타데이터 여기에
            "owner": lineage.metadata.get("owner"),
            "labels": lineage.metadata.get("labels"),
            "status": lineage.status,
            "schedule": {...},
            ...
        }
    )
    
    # 2. Table Nodes 생성
    for upstream in lineage.upstreams:
        table = uow.tables.get_or_create(upstream.name)
        uow.edges.create(table.id, job.id, "input")
    
    # 3. Closure 계산
    uow.closures.expand_closure(...)
```

**INSERT 횟수**: 
- GRAPH_NODE: 1 (Job) + N (Tables)
- GRAPH_EDGE: N (upstreams) + M (downstreams)
- GRAPH_CLOSURE: O(N²) (worst case)

---

### After (새 설계)
```python
def register_lineage_job(lineage: SchedulingLineage):
    # 1. Job Node 생성 (순수 식별자만)
    job = uow.jobs.get_or_create(
        job_id=lineage.job_id,
        name=lineage.name
        # properties 없음!
    )
    
    # 2. Job Meta 생성 (메타데이터 분리)
    uow.job_meta.create_or_update(
        node_id=job.id,
        project_id=lineage.metadata.get("labels", {}).get("project"),
        owner_id=lineage.metadata.get("owner"),
        properties={...}  # 나머지 메타데이터
    )
    
    # 3. Table Nodes + Meta 생성
    for upstream in lineage.upstreams:
        table = uow.tables.get_or_create(upstream.name)
        uow.table_meta.create_or_update(
            node_id=table.id,
            dataset=extract_dataset(upstream.name),
            table_name=extract_table(upstream.name),
            properties={...}
        )
        uow.edges.create(table.id, job.id, "input")
    
    # 4. Closure 계산 (동일)
    uow.closures.expand_closure(...)
```

**INSERT 횟수**:
- GRAPH_NODE: 1 (Job) + N (Tables)
- JOB_META: 1
- TABLE_META: N
- GRAPH_EDGE: N (upstreams) + M (downstreams)
- GRAPH_CLOSURE: O(N²) (worst case)

---

## 4. 비교 분석

### 테이블 수 증가
| 항목 | Before | After | 증가 |
|------|--------|-------|------|
| **Graph Layer** | 3 | 3 | 0 |
| **Meta Layer** | 0 | 2 (필수) | +2 |
| **Catalog** | 0 | 3 (선택) | +3 |
| **총계** | 3 | 5 (필수) / 8 (전체) | +2 / +5 |

### INSERT 횟수 증가
| 항목 | Before | After | 증가 |
|------|--------|-------|------|
| Job 등록 시 | 1 | 2 (Node + Meta) | +1 |
| Table 등록 시 | N | 2N (Node + Meta) | +N |
| **총 증가** | - | - | **+1 + N** |

**예시**: Job 1개, Upstream 5개, Downstream 3개
- Before: 1 + 8 = 9 INSERTs
- After: 2 + 16 = 18 INSERTs
- **증가**: +9 INSERTs (2배)

---

## 5. 성능 영향 분석

### 5.1 쓰기 성능
- **INSERT 횟수 증가**: 약 2배
- **하지만**:
  - 각 INSERT는 더 단순 (JSON 파싱 없음)
  - 인덱스 크기 감소 (컬럼 기반)
  - 트랜잭션 내에서 일괄 처리

**예상 영향**: 10-20% 쓰기 시간 증가 (허용 가능)

### 5.2 읽기 성능
- **검색 쿼리**: 50-80% 성능 향상 (인덱스 최적화)
- **Detail 조회**: 10-20% 성능 저하 (JOIN 비용)

**트레이드오프**: 쓰기 약간 느려지지만, 검색이 훨씬 빨라짐

---

## 6. 최적화 방안

### 6.1 Batch Insert 사용
```python
# Before (개별 INSERT)
for table in tables:
    uow.table_meta.create(table)

# After (Bulk INSERT)
uow.table_meta.bulk_create([
    TableMeta(node_id=t.id, dataset=..., table_name=...)
    for t in tables
])
```

**효과**: INSERT 횟수 N → 1

### 6.2 Upsert 사용
```python
# INSERT ... ON DUPLICATE KEY UPDATE
uow.job_meta.upsert(
    node_id=job.id,
    project_id=...,
    owner_id=...,
    properties=...
)
```

**효과**: 중복 체크 + INSERT 비용 감소

### 6.3 선택적 Meta 생성
```python
# TABLE_META는 필요할 때만 생성
if not uow.table_meta.exists(table.id):
    uow.table_meta.create(...)
```

---

## 7. 간소화 제안

### 옵션 A: TABLE_META 제거 (권장하지 않음)
```
GRAPH_NODE
GRAPH_EDGE
GRAPH_CLOSURE
JOB_META  ← Job만 Meta 분리
```

**장점**: INSERT 횟수 감소
**단점**: Table 검색 불가능

### 옵션 B: 현재 설계 유지 (권장)
```
GRAPH_NODE
GRAPH_EDGE
GRAPH_CLOSURE
JOB_META
TABLE_META
```

**이유**:
- 검색 성능이 더 중요
- 쓰기는 배치 작업 (초기화 시)
- 읽기는 실시간 (사용자 대기)

### 옵션 C: Lazy Meta Creation (절충안)
```python
# Job 등록 시: GRAPH_NODE + GRAPH_EDGE만
# 검색 시: JOB_META 자동 생성 (첫 검색 시)
```

**장점**: 초기 등록 빠름
**단점**: 첫 검색 느림, 복잡도 증가

---

## 8. 최종 권장 사항

### 현재 설계 유지 (옵션 B)

**이유**:
1. **검색이 더 중요**: 사용자는 검색을 자주 함
2. **쓰기는 배치**: 초기화 시 한 번, 이후 증분 업데이트
3. **최적화 가능**: Bulk Insert로 성능 개선 가능

### 성능 최적화 적용
```python
# GraphCommandService.register_lineage_job()

def register_lineage_job(self, lineage: SchedulingLineage):
    # 1. Graph Node (순수 식별자)
    job = self._create_job_node(lineage)
    
    # 2. Job Meta (메타데이터)
    self._create_job_meta(job.id, lineage)
    
    # 3. Table Nodes + Meta (Bulk)
    table_nodes = self._create_table_nodes(lineage.upstreams + lineage.downstreams)
    self._create_table_metas_bulk(table_nodes)  # ← Bulk Insert
    
    # 4. Edges (Bulk)
    self._create_edges_bulk(job, table_nodes)  # ← Bulk Insert
    
    # 5. Closure (기존 로직)
    self._update_closure(job, table_nodes)
```

---

## 9. 실제 성능 예측

### 시나리오: 1000개 Job 초기화
- Job당 평균 Upstream 5개, Downstream 3개

#### Before
- GRAPH_NODE: 1000 + 8000 = 9000 INSERTs
- GRAPH_EDGE: 8000 INSERTs
- **총**: 17,000 INSERTs
- **예상 시간**: 10초

#### After (최적화 없음)
- GRAPH_NODE: 9000 INSERTs
- JOB_META: 1000 INSERTs
- TABLE_META: 8000 INSERTs
- GRAPH_EDGE: 8000 INSERTs
- **총**: 26,000 INSERTs
- **예상 시간**: 15초 (+50%)

#### After (Bulk Insert 최적화)
- GRAPH_NODE: 9000 INSERTs
- JOB_META: 1 Bulk (1000 rows)
- TABLE_META: 1 Bulk (8000 rows)
- GRAPH_EDGE: 1 Bulk (8000 rows)
- **총**: 9003 INSERTs
- **예상 시간**: 8초 (-20%)

---

## 10. 결론

### 테이블 수는 많지만...
✅ **필수 테이블**: 5개 (GRAPH_NODE, GRAPH_EDGE, GRAPH_CLOSURE, JOB_META, TABLE_META)
✅ **선택 테이블**: 3개 (PROJECT_META, USER, PROJECT_USER) - Job 등록 시 불필요

### 성능은 괜찮음
✅ **쓰기**: Bulk Insert로 오히려 빨라질 수 있음
✅ **읽기**: 검색 성능 50-80% 향상

### 복잡도는 관리 가능
✅ **명확한 역할 분리**: Graph vs Meta
✅ **유지보수 용이**: 각 테이블의 책임 명확
✅ **확장성**: 새 메타데이터 추가 쉬움

**최종 판단**: 현재 설계 유지 + Bulk Insert 최적화 권장
