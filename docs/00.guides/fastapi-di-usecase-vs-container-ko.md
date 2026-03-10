# FastAPI 의존성 주입(DI): UseCase & Depends vs Container

FastAPI 생태계에서 의존성 주입(Dependency Injection, DI) 트렌드는 점차 서드파티 라이브러리(`dependency_injector` 등)의 Container 패턴에서 **FastAPI 내장 `Depends`와 UseCase 패턴을 조합하는 순수 파이썬 방식**으로 이동하고 있습니다.

이 문서는 모던 4계층 Clean Architecture/DDD에서 왜 Container보다 순수한 UseCase 팩토리 + `Depends` 패턴이 더 선호되는지, 그리고 실제 코드 상에서 어떤 차이가 발생하게 되는지 예시를 추가하여 상세히 분석합니다.

---

## 1. Native 프레임워크와의 통합성 (No Magic)

### ❌ Container 패턴 (`dependency_injector`)
* **원리:** 외부의 의존성 관리 라이브러리를 통해 미리 정의된 형태의 거대한 중앙 `Container`에 모든 클래스와 인스턴스를 조립해 둡니다. 그리고 FastAPI 라우터나 서비스 메서드에 도달하기 전, 프레임워크의 제어권 밖에서 모듈을 스캐닝하고 강제로 주입을 수행(`wire(modules=[...])`)해야 합니다.
* **단점:** `Provide[Container.service]` 같이 부자연스러운 매직(Magic) 코드가 추가되며 API 라우팅과 무관한 파일에 의존성이 묶이게 됩니다.

**[AS-IS 구형 예시] 거대한 Container 선언 및 @inject 사용**
```python
# container.py
from dependency_injector import containers, providers
from app.services import AnalyticsService

class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(modules=["app.api.endpoints"])
    redis_client = providers.Resource(init_redis)
    analytics_service = providers.Factory(AnalyticsService, redis=redis_client)

# api/endpoints.py
from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends

router = APIRouter()

@router.post("/track")
@inject  # 🚨 프레임워크 외적인 Magic Decorator 필요
async def track_event(
    event: dict,
    service: AnalyticsService = Depends(Provide[Container.analytics_service])
):
    return await service.track(event)
```

### ✅ UseCase + `Depends` 패턴 (권장)
* **원리:** 파이썬 기본 함수를 팩토리로 사용하고, FastAPI의 가장 강력한 기능인 `Depends`를 그대로 사용합니다.
* **장점:** 파이썬 제너레이터(`yield`)를 통한 리소스(커넥션 풀) 관리가 프레임워크 LifeCycle 안에서 완벽하게 제어되며 코드가 훨씬 직관적입니다.

**[TO-BE 모던 예시] 순수 FastAPI 팩토리 함수 사용**
```python
# factory/usecase.py
from fastapi import Depends
from app.infrastructure.di.providers import get_redis
from app.application.usecase.track_event import TrackEventUseCase

def get_track_event_usecase(redis = Depends(get_redis)):
    return TrackEventUseCase(redis=redis)

# api/endpoints.py
from fastapi import APIRouter, Depends

router = APIRouter()

@router.post("/track")
async def track_event(
    event: dict,
    uc: TrackEventUseCase = Depends(get_track_event_usecase) # ✨ 순수 FastAPI 내장 기능
):
    return await uc.execute(event)
```

---

## 2. 응집도와 단일 책임 원칙 (SRP)

### ❌ Container 기반의 비대한 Service
기존 Container 방식을 사용하는 프로젝트는 `AnalyticsService` 와 같은 서비스를 만들게 됩니다. 이는 스프링이나 장고 같은 프레임워크처럼 서비스 객체 안에 조회, 수정, 외부 API 통신 등 온갖 비즈니스 로직을 하나로 뭉쳐 넣는 **God Object** 방식이 되기 쉽습니다. 컨테이너에 서비스가 거대하게 등록되어 있으면, 이 안에 메서드가 50개가 넘어가도 계속 기능을 쑤셔 넣게 됩니다.

### ✅ UseCase 패턴의 조립성
Clean Architecture/DDD에서 `UseCase` (또는 Interactor)는 단일 시나리오 단위로 쪼개집니다. 
예를 들어 `TrackEventUseCase`, `GetMetricsUseCase`, `SearchJobsUseCase` 등 각각이 독립적인 인스턴스로 존재합니다.

* **장점:** 특정 기능을 수정할 때 오직 그 파일 하나만 열어보면 되므로 유지보수성이 극대화 됩니다. 클래스 자체가 자신이 해결해야 할 단일 목표에 대해 매우 높은 응집도를 가집니다.

---

## 3. 테스트 용이성 (Testability)

가장 큰 차이가 여기서 발생합니다. 단위 테스트를 수행할 때 외부의 Container를 모킹하는 것은 매우 까다로우며 실수하기 쉽습니다. 하지만 생(生) Python Object인 UseCase를 테스트하는 것은 너무나도 쉽습니다.

### ❌ Container 방식을 사용한 통합/단위 테스트
의존성을 교체하려면 전역 환경의 컨테이너를 부르고 오버라이드해야 합니다.
```python
# 기존 테스트의 고통
def test_analytics_service():
    container = Container()
    # 1. 엉뚱한 의존성이 덮어씌워지지 않도록 관리해야 함
    # 2. Mock 객체를 만들어서 전역 상태에 찔러넣어야 함
    with container.redis_client.override(mock_redis):
        service = container.analytics_service()
        assert service.track({"type": "click"}) == True
```

### ✅ 순수 파이썬 생성자 주입을 통한 단위 테스트
UseCase 클래스는 평범한 파이썬 객체이므로 그 어떤 프레임워크나 Container의 도움이 필요 없습니다.
```python
# 모던 UseCase 패턴의 단위 테스트
async def test_track_event_usecase_success():
    # 1. 프레임워크나 전역 환경 설정 제로! 
    # 2. 순수하게 모킹된 객체를 생성자의 인자로 건네주기만 하면 끝
    mock_redis = AsyncMock()
    uc = TrackEventUseCase(redis=mock_redis)
    
    result = await uc.execute(TrackEvent(path="/dashboard"))
    assert result is True
```

* 통합 테스트(Endpoint Testing) 시에는 FastAPI 공식 가이드에 나오는 `app.dependency_overrides`를 사용하면 아주 깔끔하게 외부 어댑터를 교체할 수 있습니다.
```python
app.dependency_overrides[get_track_event_usecase] = lambda: mock_usecase
```

---

## 4. 타입 힌팅과 정적 분석 (MyPy 호환성)

### ❌ Container 동적 주입의 타입 에러
`dependency_injector`는 런타임에 동적으로 객체를 갈아 끼우기 때문에, 코드를 작성할 때 VSCode 같은 IDE가 변수 타입을 제대로 추론하지 못합니다. **MyPy** 같은 정적 타입 분석 도구에서는 `Unknown argument` 또는 `Incompatible return type` 같은 무수한 에러를 발생시킵니다. 이를 지우기 위한 `# type: ignore` 주석이 코드베이스 전역에 퍼지게 됩니다.

### ✅ Type-Safe한 Depends
```python
def get_metrics_usecase(
    bq_client: BigQueryClient = Depends(get_bq_client)
) -> GetMetricsUseCase:
    ...
```
위와 같이 매개변수와 리턴 타입에 파이썬 기본 Type Hinting을 적어주기만 하면 IDE의 자동 완성 능력을 100% 이끌어 낼 수 있으며, 에러 확률을 컴파일/실행 전에 정확하게 잡아낼 수 있습니다.

---

## 🎓 결론

과거에는 구조적 은닉이나 의존성 교체를 위해 전용 라이브러리인 전역 Container를 쓰는 것이 유행이었으나, **현재 FastAPI 기반의 모던 시스템 설계는 "프레임워크 본연의 타입 세이프 DI(`Depends`) + 순수 파이썬 도메인 객체 단위의 팩토리(`UseCase` & 생성자 주입)" 체제로 표준화** 되었습니다.

앞으로 작성되거나 리팩토링되는 모든 백엔드 애플리케이션에서는 억지로 매직 패턴을 도입하기보다 **내장 기능에 가장 충실한 팩토리 + UseCase 아키텍처** 구조를 따라주시기 바랍니다.
