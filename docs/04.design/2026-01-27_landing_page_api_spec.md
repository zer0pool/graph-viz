# Landing Page Summary API Specification

## 랜딩 페이지 요약 정보 및 API 설계 가이드

---

## 1. 목적 (Purpose)

본 문서는 플랫폼 내 각 랜딩 페이지(Dashboard, Jobs, Tables, Audit, Users) 상단에 표시되는 **요약 카드(Summary Cards)** 섹션의 데이터 구조와 이를 제공하기 위한 백엔드 API 설계 원칙을 정의합니다.

### 주요 목표
- **일관된 UI/UX**: 모든 도메인에서 동일한 형식의 요약 정보를 제공하여 사용자 경험의 일관성을 유지합니다.
*   **유연한 확장성**: 백엔드 응답만으로 새로운 메트릭을 추가하거나 순서를 변경할 수 있는 데이터 중심(Data-driven) 구조를 지향합니다.
*   **효율적인 개발**: 프론트엔드의 `SummaryGrid` 공통 컴포넌트와 즉시 연동 가능한 표준 규격을 제시합니다.

---

## 2. API 설계 원칙 (Design Principles)

### 2.1 리소스 기반 그룹화 (Resource-based Grouping)
API 경로는 각 도메인 리소스를 중심으로 구성하며, 요약 정보는 해당 리소스 그룹 내의 `summary` 서브 경로로 정의합니다.

- **권장 방식**: `GET /api/v1/{resource}/summary`
- **이유**: 목록 조회(`.../list`)나 상세 정보(`.../{id}`)와 계층 구조를 통일하여 유지보수성을 높입니다.

### 2.2 화면 중심이 아닌 데이터 중심 (Data-centric)
프론트엔드 코드에 필드명을 하드코딩하지 않고, 의미 있는 식별자(`type`)를 포함한 배열 형태로 데이터를 제공합니다.

- **장점**: UI 수정 없이 백엔드 로직만으로 메트릭 추가/삭제/순서 변경이 가능합니다.
- **폴백(Fallback)**: 정의되지 않은 `type`이 수신되더라도 기본 아이콘과 레이블로 안전하게 표시됩니다.

---

## 3. 공통 데이터 구조 (Metric Object)

모든 요약 API는 `metrics` 배열을 포함한 JSON 객체를 반환합니다.

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `type` | `string` | Y | 메트릭 식별자. 프론트엔드 `RESOURCE_MAP`의 키와 매칭됨. |
| `value` | `number \| string` | Y | 카드에 강조되어 표시될 메인 수치. |
| `subtext` | `string` | Y | 수치 하단에 표시될 보조 설명 문구. |
| `status` | `string` | N | `default`, `warning`, `critical`. 텍스트 색상 및 상태 강조용. |

---

## 4. 도메인별 API 규격

### 4.1 Dashboard (Home)
플랫폼 전체의 자산 및 실행 현황에 대한 통찰을 제공합니다.
- **Endpoint**: `GET /api/v1/dashboard/summary`
- **주요 Metric**: `total_tables`, `total_jobs`, `system_health`, `active_alerts` 등

### 4.2 Job Monitoring
데이터 파이프라인의 실행 건수, 성공률 및 지연 현황을 관리합니다.
- **Endpoint**: `GET /api/v1/jobs/summary`
- **주요 Metric**: `total_jobs`, `success_execution`, `failed_execution`, `expiring_soon`, `sla_breach`

### 4.3 Tables & Datasets
데이터 자산의 규모, 정합성 및 리니지 커버리지를 모니터링합니다.
- **Endpoint**: `GET /api/v1/tables/summary`
- **주요 Metric**: `total_tables`, `total_datasets`, `total_size`, `delayed`, `lineage_coverage`

### 4.4 Audit & Operations
시스템 운영 이력 및 명령어 실행 결과에 대한 통계를 제공합니다.
- **Endpoint**: `GET /api/v1/audit/summary`
- **주요 Metric**: `total_commands`, `success_ops`, `failed_ops`, `sla_breach`

### 4.5 Users
사용자 계정 활성화 상태 및 권한 그룹 현황을 요약합니다.
- **Endpoint**: `GET /api/v1/users/summary`
- **주요 Metric**: `total_users`, `active_users`, `privileged_users`, `inactive_users`

---

## 5. 프론트엔드 연동 가이드

프론트엔드에서는 `SummaryGrid` 컴포넌트를 사용하여 다음과 같이 요청 데이터를 매핑합니다.

```tsx
// 구성 예시
<SummaryGrid 
  metrics={apiResponse.metrics} 
  cols={apiResponse.metrics.length} 
/>
```

신규 메트릭 타입을 추가할 경우, 프론트엔드의 `SummaryGrid.tsx` 내 `RESOURCE_MAP` 객체에 해당 `type`에 대한 **Lucide 아이콘**과 **레이블** 정의만 추가하면 연결이 완료됩니다.
