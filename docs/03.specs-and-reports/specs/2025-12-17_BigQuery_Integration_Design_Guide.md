# BigQuery Integration Design Guide
(BigQuery Real / Dummy Service Separation)

작성일: 2025-01-20  
수정일: 2025-01-20  
작성자: Data Platform / Lineage Manager  
문서 버전: 1.0  
상태: Draft  

---

## 1. 목적 (Purpose)

본 문서는 Lineage Manager에서 **BigQuery 연동을 구조적으로 분리**하기 위한
설계 가이드를 정의한다.

목표는 다음과 같다:

- BigQuery 실제 연동(on) / 더미 데이터(off)를 **설정 기반으로 전환**
- API / Service 계층에서 분기 로직 제거
- Dummy / Real 구현체를 DI(Container)에서 선택
- 테스트, 로컬 개발, 데모 환경에서 안정적인 더미 데이터 제공

---

## 2. 핵심 설계 원칙

1. **Service 호출자는 구현체를 알지 않는다**
2. Dummy / Real 분기는 **Container에서만 수행**
3. enable_bigquery flag는 **단일 위치에서만 사용**
4. API / Query / Graph Service는 항상 동일한 Interface 호출
5. Dummy Service는 fallback이 아니라 **정식 구현체**다

---

## 3. 전체 구조 개요

```
API / GraphQueryService / JobService
        |
        v
BigQueryService (Interface)
   ├─ RealBigQueryService   (실제 GCP BigQuery 연동)
   └─ DummyBigQueryService  (고정 더미 데이터)
        ^
        |
BigQueryContainer (Selector)
```

---

## 4. Service Interface 정의

모든 BigQuery Service 구현체는 동일한 계약을 따른다.

```python
from typing import Protocol

class BigQueryServiceProtocol(Protocol):
    def get_table_schema(self, full_name: str) -> list[dict]: ...
    def get_table_detail(self, full_name: str) -> dict: ...
    def get_table_timelines_for_table(
        self, table_name: str, days: int = 7
    ) -> dict: ...
    def get_table_load_history(
        self, table_name: str, limit: int = 50
    ) -> list[dict]: ...
```

---

## 5. RealBigQueryService 설계

### 책임
- google-cloud-bigquery SDK 사용
- 실제 메타데이터 / 로드 히스토리 조회
- GCP 인증은 환경 변수(ADC)에 위임

### 금지 사항
- Dummy 데이터
- random / debug redirect
- try/except fallback 로직

```python
class RealBigQueryService(BigQueryServiceProtocol):
    ...
```

---

## 6. DummyBigQueryService 설계

### 책임
- 로컬 / 테스트 / 데모 환경 지원
- deterministic한 고정 응답 반환
- API 계약을 Real과 동일하게 유지

```python
class DummyBigQueryService(BigQueryServiceProtocol):

    def get_table_detail(self, full_name: str) -> dict:
        return {
            "full_name": full_name,
            "table_type": "TABLE",
            "location": "US",
            "storage": {
                "num_rows": 100,
                "num_bytes": 10240
            }
        }
```

### 주의
- Dummy는 fallback이 아니다
- enable_bigquery=False 일 때의 **정식 동작 경로**

---

## 7. Container 설계 (가장 중요)

### BigQueryContainer

```python
from dependency_injector import containers, providers

class BigQueryContainer(containers.DeclarativeContainer):

    settings = providers.Dependency()

    bigquery_service = providers.Selector(
        lambda s: "real" if s.feature_flags.enable_bigquery else "dummy",
        real=providers.Factory(RealBigQueryService),
        dummy=providers.Factory(DummyBigQueryService),
    )
```

### 특징
- enable_bigquery flag는 **여기서만 사용**
- API / Service는 조건 분기 없음

---

## 8. API / Service Layer 사용 예시

### BEFORE (금지 패턴)

```python
if settings.enable_bigquery:
    try:
        return bq.get_table_detail(name)
    except:
        return dummy
```

### AFTER (권장 패턴)

```python
detail = bigquery_service.get_table_detail(name)
return {"status": "success", "result": detail}
```

---

## 9. 테스트 전략

- Unit Test:
  - DummyBigQueryService 직접 주입
- Integration Test:
  - RealBigQueryService + mock GCP
- E2E:
  - Container Selector 기반 전환 검증

---

## 10. 확장 전략

- Snowflake / Athena 연동 시
  - 새로운 Service 구현 추가
  - Container Selector 확장

```text
BigQueryServiceProtocol
 ├─ RealBigQueryService
 ├─ DummyBigQueryService
 └─ AthenaMetadataService (future)
```

---

## 11. 흔한 실수 (Anti-pattern)

- API에서 enable_bigquery 분기
- Service 내부에 dummy/real 혼합
- try/except로 dummy fallback 처리
- 테스트 코드에서 production service 직접 사용

---

## 12. 구현 계획 (Implementation Plan)

### Phase 1: Protocol and Service Implementation

1. **Create Protocol Interface**
   - File: `services/bigquery_protocol.py`
   - Define `BigQueryServiceProtocol` with all required methods
   - Document method signatures and return types

2. **Create RealBigQueryService**
   - File: `services/real_bigquery_service.py`
   - Extract real BigQuery implementation from existing service
   - Remove debug redirect logic
   - Remove try/except fallback patterns
   - Raise exceptions on errors (no fallback)

3. **Create DummyBigQueryService**
   - File: `services/dummy_bigquery_service.py`
   - Implement deterministic test data
   - Support HOURLY and DAILY patterns
   - No external dependencies

### Phase 2: Container Refactoring

1. **Update BigQueryContainer**
   - Replace `providers.Factory` with `providers.Selector`
   - Configure selector based on `enable_bigquery` flag
   - Wire both Real and Dummy implementations

### Phase 3: API Endpoint Cleanup

Remove `enable_bigquery` conditionals from:
- `/tables/{table_name}/load-history`
- `/tables/{table_name}/timelines`
- `/tables/{table_name}/schema`
- `/tables/{table_name}/detail`

All endpoints follow clean pattern:
```python
result = bigquery_svc.method(table_name)
return {"status": "success", "result": result}
```

### Phase 4: Cleanup

1. Remove old `bigquery_service.py`
2. Fix duplicate `enable_bigquery` field in config
3. Update imports across codebase

### Phase 5: Verification

1. Unit tests for DummyBigQueryService
2. Unit tests for RealBigQueryService (with mocks)
3. Container selector tests
4. Manual testing with both modes
5. Verify no conditional logic remains

---

## 13. 요약

- Dummy / Real BigQuery 분리는 **설계 문제**
- 해결책은 DI(Container) Selector
- 호출자는 항상 동일한 Interface만 사용
- 설정 플래그는 단 하나의 위치에서만 해석

---

(End of Document)
