Run History Panel — Design & API Spec
작성일: 2025-12-09 · 수정일: 2025-12-09 · 버전: 1.1 · 상태: Draft

## 1) 목적
- 우측 협소 패널에서도 실행 이력을 읽기 쉽도록 정보 우선순위 재정립.
- 긴 텍스트(에러 메시지, Run ID 등)를 Drawer로 이동해 테이블 가독성 확보.
- 실행 패턴을 Timeline에서 즉시 파악.

## 2) 구성요소
1. Execution Timeline: 성공/실패/실행중 패턴을 점(Scatter)으로 표시.
2. Compact Execution Table: 핵심 컬럼(Status, Start, Duration, Details)만 노출.
3. Run Detail Drawer: 길고 세부적인 정보(Run ID, Trigger, Start/End, Duration 등)를 표시.

## 3) API 계약 (서버 구현 반영)
### Endpoint
`GET /api/v1/jobs/{job_id}/run-history`

### Response (Lineage Manager → UI)
```json
{
  "status": "success",
  "input": { "job_id": "<job_id>" },
  "result": {
    "timeline": [
      {
        "run_id": "scheduled__2025-12-01T01:00:00+00:00",
        "status": "failed",            // mapped: running/success/failed/queued/unknown
        "start_time": "2025-12-02T06:39:56",
        "end_time": "2025-12-02T07:06:06",
        "duration_sec": 1570,          // 계산됨 (end-start 없으면 null)
        "triggered_by": "scheduled"    // dag_run_id prefix
      }
    ]
  }
}
```

### Upstream (Job Manager) Response 예시
```json
[
  {
    "job_id": "demo_job",
    "data_interval_end": "2025-12-03T01:00:00",
    "dag_run_id": "scheduled__2025-12-02T01:00:00+00:00",
    "state": "RUNNING",
    "start_time": "2025-12-08T07:06:16",
    "finish_time": null,
    "delay_criteria": [],
    "notified": null
  }
]
```
- Adapter → Service에서 `state`를 소문자 매핑 후 status_map 적용.
- `duration_sec`은 `start_time`과 `finish_time` 모두 있을 때 계산.
- `triggered_by`는 `dag_run_id`의 prefix(`__` 앞부분)로 파싱.

## 4) UX 흐름
1) 그래프(메인)에서 Job 선택 → Run History 패널 로드  
2) Timeline으로 전체 실행 패턴 한눈에 확인  
3) Table에서 행 선택 후 Details 클릭 → Drawer 오픈  
4) Drawer에서 Run ID, Triggered by, Start/End, Duration 확인  
5) Close 버튼 또는 ESC로 Drawer 닫기

## 5) 정보 우선순위 및 표시 규칙
- Table 컬럼: Status, Start, Duration, Details(버튼/링크)
- Drawer 필드: Run ID, Status, Triggered by, Start, End, Duration
- 긴 텍스트(에러 메시지 등) 필요 시 Drawer 하단에 다중 라인으로 노출
- Status 색상: success(#1a8917), failed(#d93025), running(#1a73e8), 기타(#999)

## 6) UI 스케치 (ASCII)
Right Detail Panel
```
┌─────────────────────────── RUN HISTORY ────────────────────────────┐
│ Timeline: ●──●──●●────────────●────────●                          │
│                                                                     │
│ Compact Table                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ STATUS   START                 DURATION        DETAILS          │ │
│ │ success  2025-11-29 02:00      1860s           View →           │ │
│ │ failed   2025-11-28 03:00      1920s           View →           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

Run Detail Drawer
```
┌──────────────────────────── Run Detail ────────────────────────────┐
│ Run ID: scheduled__2025-11-28T03:00:00                             │
│ Status: failed                                                     │
│ Triggered by: schedule                                             │
│ Start: 2025-11-28T03:00:00                                         │
│ End:   2025-11-28T03:32:05                                         │
│ Duration: 1920s                                                    │
│ (Optional) Error Message: BigQuery timeout...                      │
└────────────────────────────────────────────────────────────────────┘
```

## 7) HTML 구조(예시)
```html
<div id="run-history">
  <h3>Run History</h3>
  <div id="timeline" style="height:60px;"></div>
  <table class="history-table">
    <thead>
      <tr>
        <th>Status</th>
        <th>Start</th>
        <th>Duration</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="run-history-body"></tbody>
  </table>
</div>

<div id="run-detail-drawer" class="drawer hidden">
  <div class="drawer-content">
    <h4>Run Details</h4>
    <div id="drawer-fields"></div>
    <button id="drawer-close">Close</button>
  </div>
</div>
```

## 8) 스타일 가이드 (요약)
- Table: 12px, `border-collapse: collapse`, row hover 시 약한 배경.
- Drawer: 우측 슬라이드, width 360px, shadow, `transition: 0.25s ease`.
- Status 뱃지: 색상 규칙 위와 동일.

## 9) JS 구조(개요)
```js
class RunHistoryPanel {
  async load(jobId) {
    const res = await api.getRunHistory(jobId); // 위 API 계약 준수
    const runs = res.result.timeline;
    renderTable(runs);
    renderTimeline(runs);
  }

  // renderTable: status/start/duration + Details 버튼 → openDrawer(run)
  // openDrawer: Run ID, Triggered by, Start/End, Duration, (optional) error text
  // renderTimeline: scatter with color by status, tooltip에 status/duration/start_time
}
```

## 10) 데이터 매핑 규칙
- status_map: running → running, success → success, failed → failed, queued → queued, 기타 → unknown
- duration_sec: `finish_time - start_time` (둘 다 없으면 null)
- triggered_by: `dag_run_id`의 prefix (`__` 앞)
- notes/error_message: 현재 Job Manager 응답에는 포함되지 않음; 필요 시 Drawer optional 필드로 확장

## 11) 에러/로딩 처리
- 패널 최초 로드 시 skeleton/placeholder 사용.
- API 실패 시 테이블 영역에 에러 메시지와 재시도 버튼 노출.
- Drawer 열림 상태에서 새로고침 시, 선택된 run을 다시 로드해 동기화.

## 12) 성능 & 페이징
- 기본 30건(또는 서버 응답 범위)만 표시; 추가 페이지는 “Load more” 또는 무한 스크롤 옵션.
- Timeline 데이터 포인트가 많아질 경우 압축 샘플링(예: 1/N) 고려.

## 13) 향후 확장
- Timeline 클릭 → Drawer 즉시 오픈.
- 에러 메시지 요약(길이 제한 + 펼치기).
- 성공률/실패률 미니 차트, Duration 히스토그램.