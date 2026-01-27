# Dashboard Visit History & Tracking Design

## 방문 기록 기반 개인화 및 분석 로그 시스템 설계

---

## 1. 개요 (Overview)

본 문서는 사용자의 페이지 방문 패턴을 분석하여 개인별 맞춤 정보를 제공하고, 로그 수집 파이프라인(Log Router -> BigQuery)과 실시간 랭킹 엔진(Redis)을 통해 인사이트를 추출하기 위한 시스템 설계입니다.

---

## 2. 사용자 식별 전략 (Common)

### 2.1 익명 사용자 (Anonymous ID)
- **생성**: 로그인하지 않은 최초 진입 시 브라우저 LocalStorage에 UUID 생성. (`admin_console_visitor_id`)
- **수명**: 브라우저를 닫아도 삭제되지 않도록 `localStorage`에 영구 보관.

### 2.2 로그인 사용자 (Auth ID)
- **매핑**: 로그인 세션에 포함된 `User ID`를 식별자로 사용.
- **연동**: 로그 전송 시 `visitor_id`와 `user_id`를 함께 송신하여 데이터 일관성 유지.

---

## 3. 프론트엔드 구현 사항 (Frontend Requirements)

프론트엔드(Shell/Container)는 데이터의 발생지로서 이벤트를 캡처하고 사용자에게 즉각적인 피드백을 제공합니다.

### 3.1 Navigation Interceptor 구현
- **기능**: React Router의 `useLocation` 등을 활용하여 전역적인 페이지 이동 감지 로직을 구현합니다.
- **대상**: 모든 MFE(Micro Frontend) 페이지 진입 시 동작.

### 3.2 로컬 실시간 관리 (Recently Visited)
- **핵심 로직**: 순위(Score)가 아닌 **최신성(Recency)**에 기반한 리스트 관리.
- **중복 처리**: 새로운 페이지 방문 시, 동일한 `path`가 기존 리스트에 있다면 해당 항목을 **삭제한 후 맨 위(Index 0)**에 삽입합니다. (LIFO 구조)
- **데이터 관리**: 
    *   최대 10~20개의 항목만 유지 (배열의 길이가 초과되면 가장 오래된 마지막 항목 삭제).
    *   `localStorage`에 `JSON.stringify()` 상태로 직렬화하여 저장.
- **UI 표현**: "0분 전", "3시간 전" 등 현재 시간과 `timestamp`의 차이를 계산하여 노출합니다.

### 3.3 로깅 및 트래킹 요청 전송
- **기능**: 페이지 이동 시 백엔드 `/api/v1/analytics/track` 엔드포인트로 비동기 POST 요청을 발송합니다.
- **비로그인 대응**: `localStorage`의 `visitor_id`를 반드시 포함하여 발송합니다.

---

## 4. 백엔드 구현 사항 (Backend Requirements)

백엔드(`lineage-manager`)는 수신된 데이터를 영구 로그로 전환하고, Redis를 사용하여 실시간 통계를 가공합니다.

### 4.1 분석 로그 프록시 (Log Routing)
- **기능**: 수신된 데이터를 검증하고 표준 출력(`stdout`)으로 로그를 내보냅니다.
- **포맷**: `[activity_log] {user_id}!{visitor_id}!{path}!{title}!{ip}!{timestamp}`
- **인프라 연동**: 출력된 로그는 Log Router에 의해 수집되어 **BigQuery**로 적재됩니다.

### 4.2 Redis 기반 실시간 집계 (Sliding Window)
- **데이터 구조**: 1시간 단위의 Sorted Set 버킷 사용 (Key: `visits:YYYYMMDDHH`).
- **쓰기 로직**: 방문 기록 수신 시 현재 시간 버킷의 점수를 1점 증가시킵니다. (`ZINCRBY`)
- **유지 설정**: `ANALYTICS_RETENTION_HOURS` (기본 24h) 환경변수에 따라 각 버킷 Key의 TTL을 설정합니다.

### 4.3 랭킹 계산 및 조인 API
- **기능**: 대시보드 요청 시 최근 N시간(`ANALYTICS_WINDOW_HOURS`, 기본 4h)의 버킷을 합산하여 상위 페이지를 반환합니다.
- **명령어**: `ZUNIONSTORE`를 통해 복수 버킷을 합산하고 `ZREVRANGE`로 상위 항목 추출.
- **데이터 보강**: 단순 경로(`path`)뿐만 아니라 해당 리소스의 이름(Job Name 등)을 포함하여 반환합니다.

---

## 5. 인프라 및 데이터 흐름 (Data Flow)

1.  **Event Generation**: 사용자가 페이지 방문 -> Shell이 감지.
2.  **Double-Write Strategy**:
    *   **Local**: Shell이 `localStorage` 업데이트 (Recently Visited 즉시 반영).
    *   **Remote**: Shell이 백엔드로 Track API 호출.
3.  **Backend Processing**:
    *   **Long-term**: `stdout` 로그 출력 -> Log Router -> **BigQuery** (영구 저장/분석).
    *   **Real-time**: **Redis** ZSET 가중치 업데이트 (실시간 순위용).
4.  **Presentation**: 대시보드에서 `/api/v1/recommendations/top-visited` 호출 -> Redis 데이터 기반 서빙.

---

## 6. API 규격 (API Specification)

### 6.1 [POST] /api/v1/analytics/track
프론트엔드에서 발생하는 모든 방문 이벤트를 수집합니다.

### 6.2 [GET] /api/v1/recommendations/top-visited
최근 설정된 윈도우 기간 동안 가장 활발한 페이지 목록을 반환합니다.
