

## 1. 목적

그래프 매니저는 백엔드에서 발생하는 작업 상태 변화, 그래프 갱신, 트리거 변경 등의 이벤트를

프론트엔드에서 실시간으로 수신하여 UI에 반영해야 한다.

그러나 브라우저 여러 개를 동시에 사용하거나 네트워크가 순간적으로 끊기는 상황에서는

기존 SSE(EventSource) 방식으로 이벤트가 부분적으로 유실되어 일부 브라우저의 UI가

최신 상태와 동기화되지 않는 문제가 발생하고 있다.

본 요구사항은 **SSE 이벤트 재전송(Event Replay) 및 정합성 보정 기능**을 도입하여

실시간 이벤트의 안정성을 확보하고 UI 상태를 지속적으로 최신 상태로 유지하는 것을 목표로 한다.

---

## 2. 기능 개요

본 기능은 다음 2가지 핵심 요소로 구성된다.

### ✔ 2.1 SSE Event Replay 기능 추가

프론트는 마지막으로 수신한 이벤트 ID를 기록하고,

백엔드에게 “마지막 ID 이후의 이벤트”를 재요청할 수 있어야 한다.

백엔드는 이벤트 로그(Replayed Event)를 저장하고 있다가

프론트가 요청한 eventID 이후의 이벤트만 재전송한다.

### ✔ 2.2 Polling 기반 정합성 보정(백업)

SSE가 일시적으로 끊기거나 누락되더라도

프론트는 주기적인 Polling(예: 10초/30초)으로

백엔드의 최신 상태를 받아 UI와 비교하여

동기화가 필요하면 UI를 자동으로 보정한다.

이 두 기능을 통해 실시간성과 신뢰성을 모두 확보한다.

---

## 3. 상세 기능 요구사항

### 3.1 프론트엔드 요구사항

### 3.1.1 SSE 연결 및 이벤트 수신

- EventSource를 이용하여 `/events` 엔드포인트와 연결한다.
- 이벤트를 수신할 때마다 `e.lastEventId` 값을 localStorage(sessionStorage) 에 저장한다.

### 3.1.2 재연결 시 EventID 전달

- SSE 연결이 끊길 경우 자동으로 재연결 수행
- 재연결 시 아래 형식으로 이벤트 ID를 전달한다:
    
    ```
    GET /events?lastEventId={LAST_ID}
    
    ```
    
- 백엔드가 리턴한 replay 이벤트를 순서대로 처리하여 UI를 최신으로 유지한다.

### 3.1.3 UI 정합성 보정(Polling)

- 지정된 주기(예: 10초)마다 백엔드에 최신 그래프/작업 상태를 조회한다.
- SSE로 처리된 상태와 polling 결과가 일치하지 않을 경우
    
    → polling 데이터를 기준으로 UI를 보정한다.
    
- polling 타이밍은 환경변수 또는 설정값으로 조정 가능하도록 한다.

---

### 3.2 백엔드 요구사항

### 3.2.1 이벤트 로그 저장(Event Replay Buffer)

- 백엔드는 발생하는 모든 이벤트에 고유한 증가형 ID(eventId)를 부여한다.
- Redis Streams 또는 인메모리/DB 기반 버퍼에 최근 N개의 이벤트를 저장한다 (예: 500~1000개).
- eventId는 고유하며 시간순 정렬이 가능해야 한다.

### 3.2.2 SSE 엔드포인트 개선

- SSE 엔드포인트(`/events`)는 아래 로직을 수행해야 한다:
    1. 연결 시 lastEventId 파라미터 확인
    2. lastEventId 이후의 이벤트가 버퍼에 존재하면 즉시 replay
    3. replay 후 실시간 이벤트 스트림을 계속 전송
    4. 전송 실패 시 커넥션 종료 → 재연결 대기

### 3.2.3 다중 브라우저/다중 연결 지원

- 동일 사용자가 여러 브라우저 또는 여러 탭을 열어도
    
    모든 SSE 연결에 정확하게 이벤트가 broadcast 되어야 한다.
    

### 3.2.4 polling API 제공

- `/sync-status` 또는 `/state/hash` 형태의 API 제공
- 현재 전체 상태(hash 또는 최신 timestamp)를 제공하여
    
    프론트가 SSE 반영 상태와 비교할 수 있게 한다.
    

---

## 4. 예외 처리 요구사항

### 4.1 네트워크 끊김 시

- 프론트는 자동으로 lastEventId 포함해 재연결
- 백엔드는 해당 ID 이후 모든 이벤트를 재전송
- 이벤트 버퍼에 없는 경우 → 전체 상태를 polling API로 요청하여 UI 복구

### 4.2 백엔드 재시작 또는 이벤트 유실 시

- 프론트의 polling 결과를 기준으로 UI 재정합
- 백엔드는 재시작 시 이벤트 버퍼를 초기화하지만
    
    polling 기반 UI 보정으로 정합성 유지 가능
    

---

## 5. 비기능 요구사항

- SSE 응답은 최소 1초 이내 latency 유지
- 이벤트 버퍼는 메모리·Redis 기반으로 구현 (성능 필수)
- polling 주기와 SSE 연결 재시도 간격은 환경변수로 조정 가능
- 백엔드 장애·재시작 시에도 UI가 30초 이내 정상 상태로 복구

---

## 6. 기대 효과

- 다중 브라우저/탭 환경에서 이벤트 유실 문제 해결
- UI 상태 불일치 문제 해결
- 실시간(SSE) + 안정성(Polling) 조합으로 신뢰성 강화
- 운영자 화면 동기화 정확도 향상
- GKE 등 멀티 인스턴스 환경에서도 일관성 유지

# 🎯 **1. Sequence Diagram – SSE + Event Replay + Polling**

(PlantUML)

```
@startuml
autonumber

actor User as U
participant Browser as FE
participant "Graph Manager API" as BE
database "Event Buffer\n(Redis/Memory)" as BUF

== Initial SSE Connection ==

U -> FE: Open Web App
FE -> BE: GET /events (no lastEventId)
BE -> BUF: Load recent events
BUF --> BE: [none]
BE -> FE: Open SSE Stream

== Real-time Event Broadcast ==

BE -> BUF: Store(EventId=1001)
BE -> FE: SSE(EventId=1001)
FE -> FE: Update UI

== Brief Network Interrupt ==

FE <-x- BE: SSE stream lost
FE -> FE: Store lastEventId=1001
FE -> BE: Reconnect /events?lastEventId=1001

== Replay Missing Events ==

BE -> BUF: Query events after 1001
BUF --> BE: Events[1002,1003]
BE -> FE: Replay Events[1002,1003]
FE -> FE: Update UI

== Continue Streaming ==

BE -> FE: SSE(EventId=1004)
FE -> FE: Update UI

== Polling Sync (Backup) ==

loop Every 10 seconds
  FE -> BE: GET /sync-status
  BE -> FE: Return {stateHash: X123}
  FE -> FE: Compare with local hash
  alt mismatch detected
    FE -> BE: GET /full-state
    BE -> FE: Send full graph/job state
    FE -> FE: Refresh UI with authoritative data
  end
end

@enduml
```

---

# 🏗 **2. 전체 아키텍처 다이어그램 (PlantUML C4 Model)**

아키텍처는 **실시간 이벤트 처리 + 상태 보정** 구조를 포함한다.

```
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

LAYOUT_TOP_DOWN()

Person(admin, "운영자", "그래프 매니저 UI를 사용하는 관리자")

System_Boundary(graphmgr, "Graph Manager System") {

    Container(fe, "Frontend (React + Cytoscape)", "SPA",
        "SSE 수신, 이벤트 ID 저장, Polling 기반 정합성 보정, UI 렌더링"
    )

    Container(be, "Backend API (FastAPI)", "Python",
        "그래프 상태 조회, SSE 스트리밍 제공, 이벤트 브로드캐스트"
    )

    ContainerDb(redis, "Redis Streams / In-Memory Buffer", "Redis",
        "최근 이벤트 로그 저장 (Event Replay Buffer)"
    )

    ContainerDb(db, "MySQL/Neo4j Graph Storage", "DB",
        "Graph 노드·작업·의존성 상태 저장"
    )
}

Rel(admin, fe, "Web UI 접속\n브라우저에서 실시간 UI 확인")
Rel(fe, be, "SSE (/events)\n+ Polling (/sync-status)", "HTTP")
Rel(be, redis, "이벤트 로그 저장/조회", "Redis Streams")
Rel(be, db, "Graph/Job 상태 읽기/쓰기", "SQL/Cypher")
Rel(be, fe, "실시간 이벤트 스트림 전송")

@enduml
```