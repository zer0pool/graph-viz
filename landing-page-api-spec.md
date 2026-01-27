# Landing Page Summary API Specification

본 문서는 플랫폼의 각 랜딩 페이지 상단에 표시되는 요약 카드(Summary Cards)를 위한 백엔드 API 규격을 정의합니다. 모든 서비스는 공통된 데이터 구조를 사용하여 프론트엔드의 `SummaryGrid` 컴포넌트와 즉시 연동될 수 있도록 합니다.

## 1. 공통 데이터 구조 (Metric Object)

각 메트릭 카드는 다음 객체 구조를 가집니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `type` | `string` | 메트릭의 식별자. 프론트엔드의 매핑 테이블(Icon, Label 등)과 매칭됨. |
| `value` | `number \| string` | 카드에 크게 표시될 메인 수치. |
| `subtext` | `string` | 수치 하단에 보조로 표시될 설명 문구. |
| `status` | `string` | (선택) `default`, `warning`, `critical` 중 하나. 텍스트 색상 결정. |

---

## 2. API Endpoints

### 2.1 Dashboard Summary
전체 플랫폼의 현황을 한눈에 보여주는 요약 정보입니다.
*   **Path**: `GET /api/v1/dashboard/summary`
*   **Response Sample**:
```json
{
  "metrics": [
    { "type": "total_tables", "value": 1240, "subtext": "Across all schemas" },
    { "type": "total_jobs", "value": 856, "subtext": "Active pipelines" },
    { "type": "dummy_chart", "value": "85%", "subtext": "System Health" },
    { "type": "dummy_chart", "value": 12, "subtext": "Active Alerts", "status": "warning" },
    { "type": "dummy_chart", "value": "2.4 TB", "subtext": "Daily Ingestion" }
  ]
}
```

### 2.2 Job Monitoring Summary
배치 작업 및 파이프라인의 실행 상태 요약입니다.
*   **Path**: `GET /api/v1/jobs/summary`
*   **Response Sample**:
```json
{
  "metrics": [
    { "type": "total_jobs", "value": 1250, "subtext": "+12 this week" },
    { "type": "success_execution", "value": 1180, "subtext": "Last 24 hours" },
    { "type": "failed_execution", "value": 45, "subtext": "Requires attention", "status": "critical" },
    { "type": "expiring_soon", "value": 12, "subtext": "< 7 days" },
    { "type": "sla_breach", "value": 5, "subtext": "Critical delay", "status": "critical" }
  ]
}
```

### 2.3 Tables & Datasets Summary
데이터 자산의 규모 및 건강 상태 요약입니다.
*   **Path**: `GET /api/v1/tables/summary`
*   **Response Sample**:
```json
{
  "metrics": [
    { "type": "total_tables", "value": 1240, "subtext": "+23 today" },
    { "type": "total_datasets", "value": 42, "subtext": "Across 6 schemas" },
    { "type": "total_size", "value": "15.4 TB", "subtext": "+2.4 TB/day" },
    { "type": "delayed", "value": 8, "subtext": "Refreshed > 24h ago", "status": "warning" },
    { "type": "lineage_coverage", "value": "92.5%", "subtext": "Tables with lineage" }
  ]
}
```

### 2.4 Audit & Operations Summary
시스템 운영 로그 및 명령 실행 통계 요약입니다.
*   **Path**: `GET /api/v1/audit/summary`
*   **Response Sample**:
```json
{
  "metrics": [
    { "type": "total_commands", "value": 4500, "subtext": "Total recorded" },
    { "type": "success_ops", "value": 4480, "subtext": "Last 7 days" },
    { "type": "failed_ops", "value": 20, "subtext": "Action required", "status": "critical" },
    { "type": "sla_breach", "value": 2, "subtext": "Delayed operations", "status": "warning" }
  ]
}
```

### 2.5 Users Summary
사용자 계정 및 세션 현황 요약 정보입니다.
*   **Path**: `GET /api/v1/users/summary`
*   **Response Sample**:
```json
{
  "metrics": [
    { "type": "total_users", "value": 156, "subtext": "Total registered" },
    { "type": "active_users", "value": 42, "subtext": "Currently online" },
    { "type": "privileged_users", "value": 15, "subtext": "Admin/Ops roles" },
    { "type": "inactive_users", "value": 8, "subtext": "No activity > 30d", "status": "warning" }
  ]
}
```

---

## 3. 설계 원칙
1.  **배열 기반**: UI는 고정된 필드가 아닌 `metrics` 배열을 순차적으로 렌더링하므로, 백엔드에서 배열의 순서를 조정하여 카드 노출 순서를 제어할 수 있습니다.
2.  **타입 식별자**: `type` 값은 프론트엔드의 `RESOURCE_MAP`에 정의된 키와 일치해야 합니다. 신규 `type` 추가 시 프론트엔드 설정에 아이콘과 레이블만 등록하면 즉시 적용됩니다.
3.  **동적 상태**: `status` 필드를 통해 백엔드에서 특정 수치가 위험 수준인지 판단하여 UI에 경고 색상을 입힐 수 있습니다.
