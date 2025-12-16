# GraphCommandService Refactoring Guide

작성일: 2025-01-20  
수정일: 2025-01-20  
작성자: Data Platform / Lineage Manager  
문서 버전: 1.0  
상태: Draft  

---

## 1. 리팩토링 목적

GraphCommandService를 **순수 Command Layer**로 정리하여:

- 트랜잭션(commit/rollback) 책임 제거
- Orchestrator(Service) 계층에서 단일 commit 보장
- Sync / Initialize / Preview 흐름 안정화
- 향후 Graph Aggregate 도입 기반 마련

---

## 2. 핵심 원칙

1. CommandService는 **절대 commit하지 않는다**
2. Repository는 commit을 모른다
3. Orchestrator(Service)가 트랜잭션 소유자다
4. QueryService는 read-only다
5. Preview는 항상 rollback된다

---

## 3. 단계별 리팩토링 계획

### Step 1. commit 책임 제거 (P0)

- GraphCommandService 내부의 `uow.commit()`, `rollback()` 전부 제거
- 모든 mutation은 **staged 상태**로 남김

### Step 2. Batch Commit 구조 확립 (P0)

- GraphSyncService / GraphInitializerService에서
  - try / except
  - 단일 commit / rollback 수행

### Step 3. Command API 의미 단위 정리 (P1)

- register_job 내부 로직 분해
- ensure_job / link_inputs / link_outputs / materialize_lineage 패턴 준비

---

## 4. 실제 코드 패치 예시

### 4.1 GraphCommandService (commit 제거)

```diff
- self.uow.commit()
+ # commit is handled by orchestrator service
```

```python
def register_job(self, job_data):
    job = self._create_job_node(job_data)
    self._process_reference_tables(job, job_data)
    self._process_destination_table(job, job_data)
    self._create_upstream_relationships(job)
    return job.id
```

---

### 4.2 GraphSyncService (단일 commit)

```python
def sync_from_payload(self, jobs):
    try:
        for job in jobs:
            self.command_service.register_job(job)
        self.uow.commit()
    except Exception:
        self.uow.rollback()
        raise
```

---

### 4.3 GraphInitializerService (초기화 후 commit)

```python
def initialize(self):
    try:
        self.command_service.reset_graph()
        for job in jobs:
            self.command_service.register_job(job)
        self.uow.commit()
    except Exception:
        self.uow.rollback()
        raise
```

---

## 5. 리팩토링 후 구조

```
API
 └─ GraphSyncService (commit owner)
      └─ GraphCommandService (pure command)
           └─ Repositories
```

---

## 6. 기대 효과

- N번 commit 제거 → 성능/안정성 개선
- Sync 중 실패 시 partial write 방지
- Preview / Dry-run 안정화
- Unified Spec 전환 시 영향 최소화

---

## 7. 다음 단계 (TODO)

- LineageGraph Aggregate 도입
- Preview 전용 UoW context
- CommandService 단위 테스트 추가
- Unified Detail Spec 변환 작업

---

(End of Document)
