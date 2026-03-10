# FastAPI Dependency Injection: UseCase & Depends vs. Container

In the FastAPI ecosystem, the trend for Dependency Injection (DI) is shifting away from third-party libraries using the Container pattern (e.g., `dependency_injector`) towards **a pure Python approach combining FastAPI's built-in `Depends` with the UseCase pattern**.

This document analyzes why pure UseCase factories + `Depends` patterns are preferred over Containers in modern 4-tier Clean Architecture/DDD, and provides detailed examples of the differences in actual code.

---

## 1. Native Framework Integration (No Magic)

### ❌ Container Pattern (`dependency_injector`)
* **Mechanism:** All classes and instances are pre-assembled into a massive specialized central `Container` via an external dependency management library. Before reaching FastAPI routers or service methods, you must step outside the framework's control to scan modules and forcefully execute injection (`wire(modules=[...])`).
* **Drawbacks:** Unnatural "Magic" code like `Provide[Container.service]` is added, and dependencies are unnecessarily tied to files completely unrelated to API routing.

**[AS-IS Legacy Example] Massive Container Declaration & @inject Usage**
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
@inject  # 🚨 Magic Decorator required outside the framework
async def track_event(
    event: dict,
    service: AnalyticsService = Depends(Provide[Container.analytics_service])
):
    return await service.track(event)
```

### ✅ UseCase + `Depends` Pattern (Recommended)
* **Mechanism:** Uses standard Python functions as factories and natively leverages FastAPI's most powerful feature, `Depends`.
* **Advantages:** Resource management (e.g., connection pools) using Python generators (`yield`) is perfectly controlled within the framework's LifeCycle, and the code is much more intuitive.

**[TO-BE Modern Example] Pure FastAPI Factory Function Usage**
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
    uc: TrackEventUseCase = Depends(get_track_event_usecase) # ✨ Pure FastAPI built-in feature
):
    return await uc.execute(event)
```

---

## 2. Cohesion and Single Responsibility Principle (SRP)

### ❌ Bloated Services based on Containers
Legacy projects using the Container approach tend to create services like `AnalyticsService`. Similar to habits carried over from frameworks like Spring or Django, this easily leads to **God Objects** where retrieving, modifying, and external API communication logic are all lumped into a single service object. Once a massive service is registered in a container, developers tend to keep cramming functionality into it even when it exceeds 50 methods.

### ✅ Modularity of the UseCase Pattern
In Clean Architecture/DDD, a `UseCase` (or Interactor) is split up into single scenario units.
For example, `TrackEventUseCase`, `GetMetricsUseCase`, and `SearchJobsUseCase` exist as independent instances.

* **Advantages:** When modifying a specific feature, you only need to open that single file, maximizing maintainability. The class itself has extremely high cohesion regarding the single goal it must solve.

---

## 3. Testability

This is where the biggest difference lies. When performing unit tests, mocking an external Container is very tricky and prone to mistakes. However, testing a pure Python Object UseCase is incredibly simple.

### ❌ Integration/Unit Testing using the Container Approach
To swap dependencies, you must import the container in the global environment and override it.
```python
# The pain of legacy testing
def test_analytics_service():
    container = Container()
    # 1. Must carefully manage so unrelated dependencies aren't overwritten
    # 2. Must create Mock objects and inject them into the global state
    with container.redis_client.override(mock_redis):
        service = container.analytics_service()
        assert service.track({"type": "click"}) == True
```

### ✅ Unit Testing via Pure Python Constructor Injection
A UseCase class is a plain Python object, so it doesn't need any framework or Container assistance.
```python
# Unit testing the modern UseCase pattern
async def test_track_event_usecase_success():
    # 1. Zero framework or global environment setup!
    # 2. Simply pass purely mocked objects as constructor arguments, and you're done.
    mock_redis = AsyncMock()
    uc = TrackEventUseCase(redis=mock_redis)
    
    result = await uc.execute(TrackEvent(path="/dashboard"))
    assert result is True
```

* For Integration Testing (Endpoint Testing), using FastAPI's official `app.dependency_overrides` provides an extremely clean way to swap out external adapters.
```python
app.dependency_overrides[get_track_event_usecase] = lambda: mock_usecase
```

---

## 4. Type Hinting and Static Analysis (MyPy Compatibility)

### ❌ Type Errors in Container Dynamic Injection
Because `dependency_injector` dynamically swaps objects at runtime, IDEs like VSCode struggle to properly infer variable types during development. Static type analysis tools like **MyPy** throw countless errors such as `Unknown argument` or `Incompatible return type`. You end up littering the entire codebase with `# type: ignore` comments just to bypass these issues.

### ✅ Type-Safe Depends
```python
def get_metrics_usecase(
    bq_client: BigQueryClient = Depends(get_bq_client)
) -> GetMetricsUseCase:
    ...
```
By simply providing standard Python Type Hinting for parameters and return types as shown above, you unlock 100% of your IDE's auto-completion capabilities and can accurately catch error risks before compilation/execution.

---

## 🎓 Conclusion

While it used to be trendy to use a global Container via dedicated libraries for structural hiding or dependency swapping, **modern system design on FastAPI has standardized around the "Framework-native Type-Safe DI (`Depends`) + Pure Python Domain Object factories (`UseCase` & Constructor Injection)" architecture.**

For all backend applications currently being written or refactored, please avoid introducing forced magic patterns and strictly follow the **Factory + UseCase architecture**, which faithfully leverages the framework's built-in capabilities.
