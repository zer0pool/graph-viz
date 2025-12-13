# Service Layer Refactoring - 기능 명세서

작성일: 2025-12-13  
작성자: Lineage Manager Team  
문서 버전: 1.0  
상태: Approved  

---

## 목표

### 해결하는 문제
- **불필요한 Facade 계층**: `GraphBuildService`가 단순 delegation만 수행하여 코드 복잡도만 증가
- **DI Container 우회**: `GraphInitializerService`가 직접 생성되어 테스트 어려움
- **God Object**: `GraphService`가 너무 많은 책임 (1400+ lines, 50+ methods)

### 사용자가 얻는 이점
- 코드 가독성 향상
- 유지보수 용이성 증가
- 테스트 용이성 개선
- 표준 아키텍처 패턴 준수

---

## 범위

### 영향받는 시스템
- **백엔드**: Service Layer, DI Container
- **API Endpoints**: `/api/v1/graph/*`, `/api/v1/graph/sync/*`
- **프론트엔드**: 영향 없음
- **DB**: 영향 없음

### 통합 지점
- `GraphService` ← 모든 API 엔드포인트
- `GraphContainer` ← DI 설정

---

## 기술 설계

### Phase 1: GraphBuildService 제거

#### Before
```python
# Container
graph_build_service = providers.Factory(GraphBuildService, core=graph_service)

# API Endpoint
@router.post("/jobs")
def register_job(
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_build_service])
):
    return graph_service.register_job(...)  # GraphBuildService가 단순 전달
```

#### After
```python
# Container
# graph_build_service 제거

# API Endpoint
@router.post("/jobs")
def register_job(
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service])
):
    return graph_service.register_job(...)  # 직접 호출
```

#### 변경 사항
1. `GraphBuildService` 클래스 삭제
2. 모든 API 엔드포인트에서 `graph_build_service` → `graph_service` 변경
3. `sync_from_payload()`, `sync_from_job_manager()`, `last_sync_status()` 메서드를 `GraphService`로 이동
4. Container에서 `graph_build_service` provider 제거

---

### Phase 2: GraphInitializerService DI 개선 (향후)

#### Before
```python
# GraphService 내부에서 직접 생성
async def initialize_graph(self):
    from lineage_manager.services.graph_initializer import GraphInitializerService
    initializer = GraphInitializerService(self.job_manager, self)
    return await initializer.initialize()
```

#### After
```python
# Container에 등록
graph_initializer = providers.Factory(
    GraphInitializerService,
    job_manager=job_manager,
    graph_service=graph_service
)

# API Endpoint에서 직접 주입
@router.post("/initialize")
async def initialize_graph(
    initializer: GraphInitializerService = Depends(...)
):
    return await initializer.initialize()
```

---

## 구현 체크리스트

### Phase 1: GraphBuildService 제거
- [x] `sync_from_payload()` 메서드를 GraphService로 이동
- [x] `sync_from_job_manager()` 메서드를 GraphService로 이동
- [x] `last_sync_status()` 메서드를 GraphService로 이동
- [x] `graph.py` 엔드포인트 업데이트 (6개)
- [x] `sync.py` 엔드포인트 업데이트 (2개)
- [x] Container에서 GraphBuildService import 제거
- [x] Container에서 graph_build_service provider 제거
- [x] `graph_build_service.py` 파일 삭제
- [x] 서버 정상 작동 확인

### Phase 2: GraphInitializerService DI (향후)
- [ ] Container에 graph_initializer 등록 (이미 존재)
- [ ] `/initialize` 엔드포인트에서 직접 주입
- [ ] GraphService에서 수동 생성 코드 제거
- [ ] 테스트 작성

### Phase 3: 문서화
- [x] Spec 문서 작성
- [ ] Completion 문서 작성
- [ ] 아키텍처 다이어그램 업데이트

---

## 아키텍처 다이어그램

### Before
```
API Endpoints
     ↓
GraphBuildService (Facade) ← 불필요한 계층
     ↓
GraphService (Core)
     ↓
Repositories
```

### After
```
API Endpoints
     ↓
GraphService (Core) ← 직접 호출
     ↓
Repositories
```

---

## 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| API 호환성 깨짐 | Low | 내부 구조 변경만, API 스펙 동일 |
| 서버 재시작 실패 | Medium | 단계별 테스트, 롤백 준비 |
| 누락된 의존성 | Low | grep으로 모든 사용처 확인 완료 |

---

## 테스트 계획

### 단위 테스트
- [ ] GraphService 메서드 테스트
- [ ] sync_from_payload() 테스트
- [ ] sync_from_job_manager() 테스트

### 통합 테스트
- [x] 서버 정상 구동 확인
- [ ] API 엔드포인트 호출 테스트
- [ ] DI Container 정상 작동 확인

---

## 리뷰 완료자

- 아키텍트: @darkwing (2025-12-13)
- 리드: - (대기 중)

---

**마지막 업데이트**: 2025-12-13
