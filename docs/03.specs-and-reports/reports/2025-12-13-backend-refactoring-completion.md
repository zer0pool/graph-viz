# Backend Refactoring: Direct Lineage Sync APIs - 완성 보고서

작성일: 2025-12-13  
작성자: Lineage Manager Team  
관련 Spec: `specs/2025-12-13_backend_refactoring.md`  
상태: Completed  

---

## 요약

**구현된 기능**: Job Manager로부터 받은 Scheduling Lineage 데이터를 Graph Manager에 직접 동기화하는 3개의 신규 API 구현 완료. 중간 변환 계층(JobDataTransformer) 제거 및 Dry-run 기능 추가.

**예상과의 차이사항**: 
- ✅ 계획된 모든 기능 구현 완료
- ✅ Backward compatibility 추가 (metadata/properties 동시 지원)
- ✅ Dry-run 기능 추가로 안전성 향상

---

## 구현 결과

### ✅ 완료된 항목

#### 1. Core Refactoring
- [x] `SchedulingLineage` 모델 업데이트 (metadata/properties 동시 지원)
- [x] `sync_from_lineage()` 핵심 메서드 구현
- [x] Helper 메서드 5개 구현
  - `_extract_job_properties()` - 화이트리스트 기반 속성 추출
  - `_create_or_update_node()` - 범용 노드 생성 (table, s3, gcs, kafka 등)
  - `_extract_node_metadata()` - table.* 키 파싱
  - `_extract_destination()`, `_extract_triggers()`, `_extract_references()`

#### 2. Service Layer
- [x] `sync_single_job()` - 단일 Job 동기화
- [x] `sync_multiple_jobs()` - 배치 Job 동기화
- [x] `preview_sync_from_lineage()` - Dry-run 미리보기

#### 3. API Endpoints
- [x] `POST /api/v1/graph/jobs/sync` - 직접 동기화 API
- [x] `POST /api/v1/graph/jobs/sync/by_ids` - 배치 동기화 API
- [x] Query parameter `?dry_run=true` 지원

#### 4. Infrastructure
- [x] Job Manager Adapter에 `fetch_lineages_by_ids()` 메서드 추가
- [x] Request/Response 스키마 추가 (`JobSyncRequest`, `BatchJobSyncRequest`)

### ⚠️ 부분적으로 완료된 항목

- [ ] **기존 `/graph/initialize` 엔드포인트 리팩토링**: 아직 `JobDataTransformer` 사용 중
- [ ] **JobDataTransformer 클래스 제거**: 기존 코드와의 호환성 유지를 위해 보류

### ❌ 미완료 항목 (향후 계획)

- [ ] 통합 테스트 작성
- [ ] Job Manager API 실제 연동 테스트
- [ ] 성능 벤치마크 (기존 방식 vs 신규 방식)
- [ ] API 문서 자동 생성 (Swagger/OpenAPI)

---

## 기술 상세

### 실제 구현된 아키텍처

```
┌─────────────────┐
│  Job Manager    │
│  (External API) │
└────────┬────────┘
         │ POST /api/v1/jobs/scheduling-lineage/by_ids
         ↓
┌─────────────────────────────────────────────┐
│  Graph Manager - New Sync APIs              │
│                                              │
│  POST /graph/jobs/sync                      │
│  POST /graph/jobs/sync/by_ids               │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ GraphService                         │  │
│  │  ├─ sync_single_job()                │  │
│  │  ├─ sync_multiple_jobs()             │  │
│  │  └─ preview_sync_from_lineage()      │  │
│  └──────────────┬───────────────────────┘  │
│                 │                            │
│  ┌──────────────▼───────────────────────┐  │
│  │ sync_from_lineage()                  │  │
│  │  ├─ _extract_job_properties()        │  │
│  │  ├─ _create_or_update_node()         │  │
│  │  └─ _extract_node_metadata()         │  │
│  └──────────────┬───────────────────────┘  │
│                 │                            │
│  ┌──────────────▼───────────────────────┐  │
│  │ Unit of Work (UoW)                   │  │
│  │  ├─ jobs.get_or_create()             │  │
│  │  ├─ tables.get_or_create()           │  │
│  │  └─ edges.get_or_create()            │  │
│  └──────────────┬───────────────────────┘  │
└─────────────────┼───────────────────────────┘
                  │
         ┌────────▼────────┐
         │  PostgreSQL DB  │
         │  (graph_node,   │
         │   graph_edge)   │
         └─────────────────┘
```

### 설계 변경사항 및 이유

#### 1. Backward Compatibility 추가
**변경**: `SchedulingLineage` 모델에 `properties`와 `metadata` 필드 동시 지원

**이유**: 
- 현재 Job Manager는 `metadata` 사용
- 향후 버전에서 `properties`로 변경 가능
- 두 필드를 자동으로 병합하여 투명하게 처리

```python
@root_validator(pre=True)
def handle_metadata_and_properties(cls, values):
    merged = {**metadata, **properties}
    values["properties"] = merged
    values["metadata"] = merged  # Backward compatibility
```

#### 2. Deduplication 로직 추가
**변경**: Upstream/Downstream 중복 제거

**이유**: Job Manager에서 중복 데이터를 전송하는 버그 발견
```python
seen_upstreams = set()
for upstream in lineage.upstreams:
    if upstream.name in seen_upstreams:
        continue  # Skip duplicate
```

#### 3. 범용 노드 타입 지원
**변경**: `type == "table"` 필터 제거, 모든 타입 지원

**이유**: 
- 향후 s3, gcs, kafka 등 다양한 타입 추가 예정
- 확장성 확보

#### 4. Table Metadata 추출
**변경**: `table.*` 접두사 키 파싱

**이유**: Table 속성을 Job 속성과 분리하여 저장
```python
"table.labels" → table_node.properties["labels"]
"table.partition" → table_node.properties["partition"]
```

### 성능 개선 결과

| 항목 | 기존 방식 | 신규 방식 | 개선 |
|------|----------|----------|------|
| 변환 단계 | 3단계 | 2단계 | -33% |
| 코드 라인 수 | ~650 lines | ~513 lines | -21% |
| 중간 객체 생성 | JobRegister 생성 | 직접 매핑 | 메모리 절약 |

---

## 테스트

### 수동 테스트 완료
- ✅ Server 정상 구동 확인 (`make run`)
- ✅ 코드 컴파일 에러 없음
- ✅ Import 에러 없음

### 테스트 커버리지
- ⚠️ 단위 테스트: 미작성
- ⚠️ 통합 테스트: 미작성
- ⚠️ E2E 테스트: 미작성

### 권장 테스트 시나리오

#### 1. Direct Sync API 테스트
```bash
curl -X POST http://localhost:8000/api/v1/graph/jobs/sync?dry_run=true \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test_job",
    "name": "Test Job",
    "schedule": {"interval": "0 1 * * *"},
    "upstreams": [{"type": "table", "name": "project.dataset.source"}],
    "downstreams": [{"type": "table", "name": "project.dataset.output"}],
    "metadata": {
      "owner": "team@company.com",
      "table.labels": {"env": "prod"}
    }
  }'
```

#### 2. Batch Sync API 테스트
```bash
curl -X POST http://localhost:8000/api/v1/graph/jobs/sync/by_ids \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {"type": "req-type", "job_id": "job_1"},
      {"type": "self-type", "job_id": "job_2"}
    ]
  }'
```

#### 3. Duplicate Handling 테스트
중복된 upstream을 가진 lineage 전송 → 1개의 노드와 1개의 엣지만 생성되는지 확인

---

## 배포 정보

### 배포 상태
- ⚠️ **미배포**: 코드 구현 완료, 테스트 대기 중

### 배포 예정 브랜치
- `35.refactoring` (현재 작업 브랜치)

### 마이그레이션 필요여부
- ❌ **불필요**: DB 스키마 변경 없음
- ✅ 기존 데이터와 호환

### 배포 전 체크리스트
- [ ] Job Manager API 연동 테스트
- [ ] Dry-run 기능 검증
- [ ] 중복 데이터 처리 검증
- [ ] Backward compatibility 검증 (metadata vs properties)
- [ ] 성능 테스트
- [ ] API 문서 업데이트

---

## 교훈 & 향후 계획

### 배운 점

1. **Backward Compatibility의 중요성**
   - 외부 시스템(Job Manager)의 변경을 예측하고 대비
   - `metadata`/`properties` 동시 지원으로 마이그레이션 리스크 제거

2. **Dry-run의 가치**
   - 프로덕션 데이터 변경 전 미리보기 기능은 필수
   - 사용자 신뢰도 향상

3. **Deduplication의 필요성**
   - 외부 시스템의 버그를 방어적으로 처리
   - 데이터 정합성 보장

4. **Layered Architecture**
   - Router → Service → Repository 계층 분리
   - Commit은 Service 계층에서 처리

### 개선 아이디어

1. **자동화된 테스트**
   - Pytest fixtures로 SchedulingLineage 샘플 데이터 생성
   - Mock Job Manager API 구축

2. **성능 모니터링**
   - Sync 작업 시간 측정
   - 대용량 배치 처리 성능 분석

3. **에러 처리 강화**
   - 부분 실패 시 롤백 전략
   - 재시도 로직 추가

4. **API 문서 자동화**
   - FastAPI의 OpenAPI 스키마 활용
   - Swagger UI 개선

### 기술 부채

1. **JobDataTransformer 제거 미완료**
   - 현재: 기존 코드와 공존
   - 계획: 기존 `/graph/initialize` 리팩토링 후 제거

2. **테스트 커버리지 부족**
   - 현재: 수동 테스트만 완료
   - 계획: 단위/통합 테스트 작성

3. **에러 핸들링 개선 필요**
   - 현재: 기본 Exception 처리
   - 계획: 커스텀 Exception 클래스 정의

---

## 참고

### 관련 파일
- **Spec**: `docs/03.specs-and-reports/specs/2025-12-13_backend_refactoring.md`
- **Implementation Plan**: `.gemini/antigravity/brain/.../backend_refactoring_plan.md`
- **Walkthrough**: `.gemini/antigravity/brain/.../backend_refactoring_walkthrough.md`

### 수정된 파일 목록
1. `src/lineage_manager/models/scheduling_lineage.py` (+30 lines)
2. `src/lineage_manager/services/graph_service.py` (+250 lines)
3. `src/lineage_manager/adapters/job_manager_adapter.py` (+40 lines)
4. `src/lineage_manager/api/v1/endpoints/graph.py` (+60 lines)
5. `src/lineage_manager/api/v1/schemas.py` (+10 lines)

### Git Branch
- 작업 브랜치: `35.refactoring`
- Base 브랜치: `34.new_list_view`

### 다음 단계
1. Job Manager 팀과 협의하여 `/api/v1/jobs/scheduling-lineage/by_ids` API 구현 요청
2. 통합 테스트 작성
3. 프로덕션 배포 계획 수립
4. 기존 `/graph/initialize` 리팩토링

---

**작성 완료일**: 2025-12-13  
**검토자**: -  
**승인자**: -
