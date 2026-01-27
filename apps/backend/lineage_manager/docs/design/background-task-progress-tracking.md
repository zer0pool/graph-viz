# Background Task 진행 상황 추적 전략

## 1. 문제 정의

### 요구사항
- ✅ Celery 없이 FastAPI BackgroundTasks 사용
- ✅ 진행 상황 실시간 조회 (전체 N개 중 M개 완료)
- ✅ 여러 클라이언트가 동시에 조회 가능
- ✅ 서버 재시작 시에도 상태 유지 (선택)

### 고려사항
- 파일 기반 vs DB 기반
- 동시성 처리
- 성능 영향

---

## 2. 추천 방식: Redis + DB 하이브리드

### 2.1 왜 Redis?

✅ **빠른 읽기/쓰기**: 진행 상황 업데이트 빈번
✅ **TTL 지원**: 완료 후 자동 삭제
✅ **Pub/Sub 지원**: 실시간 알림 가능
✅ **이미 사용 중**: 기존 인프라 활용

### 2.2 왜 DB도 필요?

✅ **영구 기록**: 작업 히스토리 보관
✅ **서버 재시작 대응**: Redis 휘발성 보완
✅ **감사 로그**: 누가 언제 초기화했는지

---

## 3. 스키마 설계

### 3.1 DB 테이블 (영구 기록)

```sql
CREATE TABLE background_task (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  task_type VARCHAR(50) NOT NULL,       -- 'graph_init' | 'closure_rebuild'
  status VARCHAR(20) NOT NULL,          -- 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  total_items INT,
  processed_items INT DEFAULT 0,
  progress_percent DECIMAL(5,2),        -- 0.00 ~ 100.00
  result JSON,                          -- 결과 데이터
  error_message TEXT,
  started_by VARCHAR(100),              -- user_id
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  
  INDEX idx_status (status),
  INDEX idx_task_type (task_type),
  INDEX idx_started_at (started_at)
);
```

### 3.2 Redis 키 구조 (실시간 진행)

```
task:{task_id}:status       → "RUNNING"
task:{task_id}:total        → "1000"
task:{task_id}:processed    → "350"
task:{task_id}:progress     → "35.0"
task:{task_id}:current_item → "job_123"
task:{task_id}:started_at   → "2026-01-27T11:00:00Z"

TTL: 1시간 (완료 후)
```

---

## 4. 구현 방법

### 4.1 Task Manager 클래스

```python
# core/background_task_manager.py

import uuid
from datetime import datetime
from typing import Optional
import redis
import json

class BackgroundTaskManager:
    """백그라운드 작업 진행 상황 관리"""
    
    def __init__(self, redis_client: redis.Redis, db_session):
        self.redis = redis_client
        self.db = db_session
    
    def create_task(
        self, 
        task_type: str, 
        total_items: int,
        started_by: str
    ) -> str:
        """새 작업 생성"""
        task_id = str(uuid.uuid4())
        
        # 1. DB에 기록
        task = BackgroundTask(
            id=task_id,
            task_type=task_type,
            status="PENDING",
            total_items=total_items,
            processed_items=0,
            progress_percent=0.0,
            started_by=started_by,
            started_at=datetime.utcnow()
        )
        self.db.add(task)
        self.db.commit()
        
        # 2. Redis에 초기화
        self.redis.setex(f"task:{task_id}:status", 3600, "PENDING")
        self.redis.setex(f"task:{task_id}:total", 3600, str(total_items))
        self.redis.setex(f"task:{task_id}:processed", 3600, "0")
        self.redis.setex(f"task:{task_id}:progress", 3600, "0.0")
        
        return task_id
    
    def start_task(self, task_id: str):
        """작업 시작"""
        # Redis 업데이트
        self.redis.set(f"task:{task_id}:status", "RUNNING")
        self.redis.set(f"task:{task_id}:started_at", datetime.utcnow().isoformat())
        
        # DB 업데이트
        task = self.db.query(BackgroundTask).get(task_id)
        if task:
            task.status = "RUNNING"
            self.db.commit()
    
    def update_progress(
        self, 
        task_id: str, 
        processed: int,
        current_item: Optional[str] = None
    ):
        """진행 상황 업데이트"""
        # Redis 업데이트 (빠름)
        total = int(self.redis.get(f"task:{task_id}:total") or 0)
        progress = (processed / total * 100) if total > 0 else 0
        
        self.redis.set(f"task:{task_id}:processed", str(processed))
        self.redis.set(f"task:{task_id}:progress", f"{progress:.2f}")
        
        if current_item:
            self.redis.setex(f"task:{task_id}:current_item", 60, current_item)
        
        # DB 업데이트 (주기적으로만)
        if processed % 100 == 0 or processed == total:
            task = self.db.query(BackgroundTask).get(task_id)
            if task:
                task.processed_items = processed
                task.progress_percent = progress
                self.db.commit()
    
    def complete_task(
        self, 
        task_id: str, 
        result: dict,
        error: Optional[str] = None
    ):
        """작업 완료"""
        status = "FAILED" if error else "COMPLETED"
        
        # Redis 업데이트
        self.redis.set(f"task:{task_id}:status", status)
        
        # DB 업데이트
        task = self.db.query(BackgroundTask).get(task_id)
        if task:
            task.status = status
            task.result = result
            task.error_message = error
            task.completed_at = datetime.utcnow()
            self.db.commit()
        
        # Redis 키 TTL 설정 (1시간 후 삭제)
        for key in self.redis.keys(f"task:{task_id}:*"):
            self.redis.expire(key, 3600)
    
    def get_status(self, task_id: str) -> dict:
        """진행 상황 조회 (Redis 우선)"""
        # 1. Redis에서 조회 (빠름)
        status = self.redis.get(f"task:{task_id}:status")
        
        if status:
            return {
                "task_id": task_id,
                "status": status.decode(),
                "total": int(self.redis.get(f"task:{task_id}:total") or 0),
                "processed": int(self.redis.get(f"task:{task_id}:processed") or 0),
                "progress": float(self.redis.get(f"task:{task_id}:progress") or 0),
                "current_item": self.redis.get(f"task:{task_id}:current_item"),
                "started_at": self.redis.get(f"task:{task_id}:started_at")
            }
        
        # 2. Redis에 없으면 DB에서 조회
        task = self.db.query(BackgroundTask).get(task_id)
        if task:
            return {
                "task_id": task.id,
                "status": task.status,
                "total": task.total_items,
                "processed": task.processed_items,
                "progress": float(task.progress_percent),
                "result": task.result,
                "error": task.error_message,
                "started_at": task.started_at.isoformat()
            }
        
        return None
```

---

### 4.2 초기화 서비스 수정

```python
# services/graph_initializer.py

class GraphInitializerService:
    
    def __init__(
        self,
        job_manager: JobManagerPort,
        command_service: GraphCommandService,
        task_manager: BackgroundTaskManager
    ):
        self.job_manager = job_manager
        self.command_service = command_service
        self.task_manager = task_manager
    
    async def initialize(self, user_id: str) -> str:
        """
        그래프 초기화 (백그라운드 작업)
        
        Returns:
            task_id: 진행 상황 조회용 ID
        """
        # 1. Job 데이터 가져오기
        jobs_data = await self._fetch_jobs()
        
        # 2. Task 생성
        task_id = self.task_manager.create_task(
            task_type="graph_init",
            total_items=len(jobs_data),
            started_by=user_id
        )
        
        # 3. 백그라운드 작업 시작
        # (FastAPI BackgroundTasks에서 실행)
        await self._run_initialization(task_id, jobs_data)
        
        return task_id
    
    async def _run_initialization(self, task_id: str, jobs_data: list):
        """실제 초기화 로직 (백그라운드)"""
        try:
            # 작업 시작
            self.task_manager.start_task(task_id)
            
            # 1. 기존 데이터 삭제
            self.command_service.reset_graph()
            
            # 2. Job 등록 (진행 상황 업데이트)
            for i, job_data in enumerate(jobs_data):
                self.command_service.register_lineage_job(
                    job_data, 
                    compute_closure=False
                )
                
                # 진행 상황 업데이트 (매 10개마다)
                if i % 10 == 0 or i == len(jobs_data) - 1:
                    self.task_manager.update_progress(
                        task_id, 
                        processed=i + 1,
                        current_item=job_data.job_id
                    )
            
            # 3. Closure 재계산
            logger.info("Closure 재계산 시작...")
            self.command_service.rebuild_closure()
            
            # 4. 완료
            stats = self.command_service.get_health_stats()
            self.task_manager.complete_task(
                task_id,
                result={
                    "jobs_created": len(jobs_data),
                    "stats": stats
                }
            )
            
        except Exception as e:
            logger.error(f"초기화 실패: {e}")
            self.task_manager.complete_task(
                task_id,
                result={},
                error=str(e)
            )
```

---

### 4.3 API 엔드포인트

```python
# api/v1/endpoints/graph.py

from fastapi import BackgroundTasks

@router.post("/api/v1/graph/initialize")
@inject
async def initialize_graph(
    background_tasks: BackgroundTasks,
    ctx_user: dict = Depends(require_authenticated_user),
    initializer: GraphInitializerService = Depends(...)
):
    """
    그래프 초기화 (비동기)
    
    Returns:
        task_id: 진행 상황 조회용 ID
    """
    # 백그라운드 작업 시작
    task_id = await initializer.initialize(ctx_user["sub"])
    
    return {
        "status": "accepted",
        "task_id": task_id,
        "message": "초기화 작업이 시작되었습니다.",
        "status_url": f"/api/v1/tasks/{task_id}"
    }


@router.get("/api/v1/tasks/{task_id}")
@inject
def get_task_status(
    task_id: str,
    task_manager: BackgroundTaskManager = Depends(...)
):
    """
    작업 진행 상황 조회
    
    Returns:
        {
            "task_id": "uuid",
            "status": "RUNNING",
            "total": 1000,
            "processed": 350,
            "progress": 35.0,
            "current_item": "job_123"
        }
    """
    status = task_manager.get_status(task_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return status


@router.get("/api/v1/tasks")
@inject
def list_tasks(
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """작업 목록 조회"""
    query = db.query(BackgroundTask)
    
    if status:
        query = query.filter(BackgroundTask.status == status)
    
    tasks = query.order_by(
        BackgroundTask.started_at.desc()
    ).limit(limit).all()
    
    return {"tasks": tasks}
```

---

## 5. 프론트엔드 폴링

### 5.1 진행 상황 폴링

```javascript
// 초기화 시작
const response = await fetch('/api/v1/graph/initialize', {
  method: 'POST'
});
const { task_id } = await response.json();

// 진행 상황 폴링 (1초마다)
const pollInterval = setInterval(async () => {
  const status = await fetch(`/api/v1/tasks/${task_id}`);
  const data = await status.json();
  
  console.log(`진행: ${data.processed}/${data.total} (${data.progress}%)`);
  
  if (data.status === 'COMPLETED') {
    clearInterval(pollInterval);
    console.log('완료!', data.result);
  } else if (data.status === 'FAILED') {
    clearInterval(pollInterval);
    console.error('실패:', data.error);
  }
}, 1000);
```

---

## 6. 대안: SSE (Server-Sent Events)

### 6.1 실시간 스트리밍

```python
# api/v1/endpoints/graph.py

from fastapi.responses import StreamingResponse

@router.get("/api/v1/tasks/{task_id}/stream")
async def stream_task_progress(
    task_id: str,
    task_manager: BackgroundTaskManager = Depends(...)
):
    """
    실시간 진행 상황 스트리밍 (SSE)
    """
    async def event_generator():
        while True:
            status = task_manager.get_status(task_id)
            
            if not status:
                yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
                break
            
            yield f"data: {json.dumps(status)}\n\n"
            
            if status['status'] in ['COMPLETED', 'FAILED']:
                break
            
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

### 6.2 프론트엔드 (SSE)

```javascript
const eventSource = new EventSource(`/api/v1/tasks/${task_id}/stream`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`진행: ${data.processed}/${data.total} (${data.progress}%)`);
  
  if (data.status === 'COMPLETED') {
    eventSource.close();
  }
};
```

---

## 7. 최종 권장 구성

### 실시간 진행 추적
- **Redis**: 빠른 읽기/쓰기, TTL 자동 삭제
- **업데이트 주기**: 10개마다 또는 1초마다

### 영구 기록
- **DB**: 작업 히스토리, 감사 로그
- **업데이트 주기**: 100개마다 또는 완료 시

### API
- **POST /api/v1/graph/initialize**: 작업 시작
- **GET /api/v1/tasks/{task_id}**: 진행 상황 조회 (폴링)
- **GET /api/v1/tasks/{task_id}/stream**: 실시간 스트리밍 (SSE)

### 프론트엔드
- **폴링 방식**: 간단, 안정적 (권장)
- **SSE 방식**: 실시간, 효율적 (선택)

---

## 8. 구현 체크리스트

### Phase 1: 기본 구조
- [ ] `background_task` 테이블 생성
- [ ] `BackgroundTaskManager` 클래스 구현
- [ ] Redis 키 구조 정의

### Phase 2: 초기화 통합
- [ ] `GraphInitializerService` 수정
- [ ] 진행 상황 업데이트 로직 추가
- [ ] API 엔드포인트 구현

### Phase 3: 프론트엔드
- [ ] 진행 상황 폴링 구현
- [ ] 진행 바 UI 추가
- [ ] 에러 처리

### Phase 4: 최적화 (선택)
- [ ] SSE 스트리밍 구현
- [ ] Pub/Sub 알림 추가
- [ ] 작업 취소 기능

---

## 9. 예상 동작

```
사용자: POST /api/v1/graph/initialize
서버: → task_id 반환 (즉시)

백그라운드:
  [0%] Job 등록 시작...
  [10%] 100/1000 완료
  [20%] 200/1000 완료
  ...
  [100%] 1000/1000 완료
  [100%] Closure 재계산 중...
  [완료] 결과 저장

사용자: GET /api/v1/tasks/{task_id} (폴링)
서버: → 진행 상황 반환 (실시간)
```

**결론**: Redis + DB 하이브리드 방식으로 빠르고 안정적인 진행 상황 추적!
