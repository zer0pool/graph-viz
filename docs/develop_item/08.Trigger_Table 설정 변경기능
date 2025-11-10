



데이터 파이프라인 그래프(의존성 DAG)에서 사용자가 특정 **테이블의 trigger 설정을 변경**할 수 있는 기능.
운영자는 이 기능을 통해 **특정 테이블을 읽는 작업(Job)들의 자동 트리거 여부를 실시간으로 제어**하고,
상태 변화는 SSE(Server-Sent Events)를 통해 프론트엔드에 즉시 반영된다.

---

## 🧭 1. 운영자 사용 시나리오

### 🎯 목표

- 특정 테이블을 읽는 작업들 중 일부의 trigger 기능을 **일시적으로 비활성화(OFF)**
- 변경 결과를 **그래프에서 실시간으로 확인**

### 🪜 단계별 시나리오

1. **그래프 뷰에서 테이블 선택**
    - 그래프 상의 테이블 노드를 클릭한다.
    - 오른쪽 상세 패널이 열리며 이 테이블을 읽는 모든 Job 목록이 표시된다.
2. **Trigger Table 설정 확인**
    - 각 Job별 `Trigger ON/OFF` 상태가 표시된 토글 UI가 보인다.
    - 상태 컬러 예시:
        - ✅ ON: 활성 (초록색)
        - ⚪ OFF: 비활성 (회색)
        - ⏳ 변경 중: 회색+스피너 표시
3. **Trigger 상태 변경**
    - 특정 Job의 토글을 `ON → OFF` 로 바꾸면 확인 팝업 표시
        
        ```
        이 작업(job_sales_load)의 Trigger Table 설정을 OFF로 변경하시겠습니까?
        [취소] [확인]
        
        ```
        
    - "확인" 선택 시 즉시 변경 요청이 전송된다.
4. **상태 모니터링 및 반영**
    - 변경 요청 후, Job Manager에서 Celery Task가 시작되며 `"status": "pending"` 반환
    - Graph Manager는 이 상태를 Redis의 pending 목록에 등록
    - 백그라운드 Poller가 Job 상태를 3초 간격으로 확인
    - 상태가 `"updated"` 되면 SSE 이벤트로 Frontend에 반영되어 즉시 그래프가 갱신된다.
5. **변경 실패 처리**
    - 5분 이상 `"updated"` 상태가 되지 않으면 `"failed"` 로 간주
    - SSE로 실패 이벤트 전송, 그래프에 실패 표시
    - 운영자는 Makefile을 통해 Redis CLI에서 pending 상태 확인 가능


### 전체 시퀀스 요약

1️⃣ **사용자 조작**

> Frontend → PATCH /jobs/{id}/trigger-tables 요청
> 

2️⃣ **Graph Manager → Job Manager 전달**

> 변경 요청 전달 → Job Manager는 Celery Task 시작
> 
> 
> 응답: `{ "status": "pending" }`
> 

3️⃣ **Graph Manager: Redis 등록**

> "pending_jobs" 해시 구조에 등록
> 

```json
{
  "job_id": "job_sales_load",
  "table_name": "sales_daily_summary",
  "requested_at": "2025-11-10T13:50:00Z",
  "expires_at": "2025-11-10T13:55:00Z"
}

```

4️⃣ **Polling Loop (3초 주기)**

> Job Manager의 /jobs/{id}/status API를 3초 간격으로 조회
> 
> 
> 상태가 `"updated"` 되면 SSE 발행
> 
> 5분 이상 미갱신 시 `"failed"` 로 처리
> 

5️⃣ **SSE 이벤트 발행**

```json
event: trigger_update
data: {
  "job_id": "job_sales_load",
  "table_name": "sales_daily_summary",
  "previous_state": true,
  "new_state": false,
  "status": "updated",
  "timestamp": "2025-11-10T13:52:10Z"
}

```

6️⃣ **Frontend 실시간 반영**

> EventSource(/events/trigger-status) 구독 중인 클라이언트에서 즉시 반영
> 

```jsx
eventSource.addEventListener("trigger_update", (e) => {
  const data = JSON.parse(e.data);
  updateGraphNode(data.job_id, data.new_state);
});

```

7️⃣ **Timeout (5분 초과 시)**

> "trigger_failed" 이벤트 전송
> 
> 
> 그래프 노드에 ⚠️ 표시 및 사용자 알림
>



### 🔹 주요 컴포넌트 요약

| 컴포넌트 | 역할 |
| --- | --- |
| **Frontend (Graph UI)** | Trigger 설정 토글, 상태 시각화 |
| **Graph Manager API** | Job Manager API 호출, Redis 관리, SSE 발행 |
| **Job Manager API** | Trigger 설정 변경 처리 (Celery task 실행) |
| **Redis** | pending job 상태 중앙 저장 |
| **SSE Stream** | Frontend와 Graph Manager 간 실시간 상태 동기화 |
|  |  |


---

### 🔹 타임라인 요약

| 구간 | 동작 | 평균 지연 |
| --- | --- | --- |
| 사용자 토글 → Job Manager 요청 | HTTP PATCH | < 0.5초 |
| Job Manager → pending 등록 | Graph Manager 내부 | < 1초 |
| Polling 감지 주기 | 3초 간격 | 평균 1~2초 |
| SSE 반영 후 UI 갱신 | 즉시 | < 0.2초 |
| 전체 지연 예상 | 약 2–4초 내 반영 |  |


### 🔹 예외 및 복구 처리

| 상황 | 처리 방식 |
| --- | --- |
| Job Manager 응답 없음 | 다음 Poll 주기까지 재시도 |
| 5분 초과 미갱신 | `trigger_failed` 이벤트 전송 |
| Redis 연결 실패 | in-memory fallback + 경고 로그 |
| SSE 연결 끊김 | 자동 재연결 (EventSource 기본 기능) |


- **핵심 목표:**
    
    그래프 UI에서 테이블별 trigger 설정을 손쉽게 제어하고,
    
    그 결과를 실시간으로 시각화하는 안정적 운영 기능 제공.
