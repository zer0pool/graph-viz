# Table Detail Page 구현 설계서
- 버전: 1.0 (2026-01-27)
- 상태: **구현 완료**

## 1. 개요

본 문서는 Frontend 내 `mfe-catalog` 마이크로 프론트엔드에서 구현된 **Table 상세 페이지**의 디자인 및 기능 사양을 정의합니다. Google Cloud Platform (GCP) 콘솔의 미학을 벤치마킹하여 사용자 친화적이고 전문적인 데이터 관리 환경을 제공하는 것을 목표로 합니다.

## 2. 디자인 가이드라인 (GCP Look & Feel)

### 2.1 테마 및 컬러 시스템
- **Light Theme**: 전체적으로 밝고 깨끗한 배경(`#f1f3f4`, `#ffffff`)을 사용합니다.
- **Brand Colors**:
  - 주조색: GCP Blue (`#1a73e8`) - 버튼, 활성 탭 인디케이터, 주요 링크.
  - 노드 컬러 (Relation):
    - **Table**: Light Green (`#e6f4ea`) 배경 + Dark Green (`#137333`) 텍스트.
    - **Job**: Light Blue (`#e8f0fe`) 배경 + Dark Blue (`#174ea6`) 텍스트.
- **Typography**: Roboto/Open Sans 계열의 산세리프 폰트를 사용하여 가독성을 높였습니다.

### 2.2 레이아웃 (`DetailLayout.tsx`)
- **Header**: 상단에 테이블 명칭, 소유자(Owner), 라이프사이클 배지를 배치하여 핵심 정보를 즉시 파악할 수 있도록 설계했습니다.
- **Tab Navigation**: Overview, Lineage, Schema, Timeliness의 4개 탭으로 구성되며, 하단에는 내용 영역이 위치합니다.

## 3. 주요 기능 구현 상세

### 3.1 Overview (개요) 탭
- **Metric Cards**: 상단에 4개의 주요 지표 카드를 배치합니다. (Writers, Readers, Rows, Storage Size)
  - Writers/Readers 카운트는 `lineage-summary` API의 메트릭 데이터를 실시간으로 반영합니다.
- **About Section**: 테이블 설명, 오너, 시스템 타입, 데이터 포맷, 생성 일자 등 BigQuery 메타데이터를 정형화하여 상술합니다.

### 3.2 Lineage (리니지 요약) 탭
- **Summary Metrics**: 복잡한 그래프 대신, 업스트림(Producer)과 다운스트림(Consumer)의 통계치를 수치화하여 보여줍니다.
  - 관련 테이블 수, 작업(Job) 수, 최대 깊이(Max Depth), 루트/리프 노드 수 등을 대조하여 표시합니다.
- **Explorer Link**: 페이지 하단에 "View Full Graph" 버튼을 제공하여 전용 리니지 탐색기(`mfe-lineage`)로 즉시 이동할 수 있는 경로를 제공합니다.

### 3.3 Schema (스키마) 탭
- **Hierarchical Table**: BigQuery의 스키마 구조를 테이블 형태로 시각화합니다.
- **Nested RECORD Support**: `RECORD`(또는 `STRUCT`) 타입의 경우, 내부 필드를 재귀적으로 렌더링하며 `⌞` 기호와 인덴트를 사용하여 계층 구조를 명확히 표현합니다.

### 3.4 Timeliness (적시성) 탭
- **Daily Summary Chart**: 최근 7일(또는 30일)간의 데이터 로드 성공/실패 여부를 바 형태의 타임라인으로 표시합니다.
- **Hourly Breakdown**: 특정 날짜를 클릭하면 해당 일자의 24시간 상세 로드 현황(Loaded, Missing, Warning, Failed)을 그리드 형태로 하단에 전개합니다.
- **Color Logic**: Success(초록), Warning(노랑/주황), Failed(빨강), Missing(회색)의 직관적인 색상 체계를 적용했습니다.

## 4. 기술 사양 및 API 연동

### 4.1 Frontend Architecture
- **Micro-Frontend**: `mfe-catalog` 독립 빌드 및 배포 단위.
- **State Management**: React Hooks (`useTableOverview`, `useTableLineage` 등)를 이용한 선언적 데이터 처리.
- **Data Visualization**: ECharts (`echarts-for-react`)를 사용한 고성능 차트 구현.

### 4.2 API 연동 규격
- **Request Consistency**: `ApiClient`에서 백엔드 응답의 `result` 필드를 자동으로 언래핑(Unwrap)하도록 통합하여 훅 코드의 복잡도를 낮췄습니다.
- **Endpoints**:
  - `GET /api/v1/tables/{name}/detail`: 기본 메타데이터
  - `GET /api/v1/tables/{name}/lineage-summary`: 리니지 통계 및 메트릭
  - `GET /api/v1/tables/{name}/schema`: 컬럼 상세 정보
  - `GET /api/v1/tables/{name}/timelines`: 적시성 차트 데이터

## 5. 변경 내역
- 2026.01.27: 1-Depth 그래프 뷰를 메트릭 요약(Summary) 뷰로 전환.
- 2026.01.27: Timeliness 탭의 화이트 스크린 이슈 해결 및 데이터 매핑 로직 수정.
- 2026.01.27: Schema 탭의 RECORD 타입 재귀 렌더링 스타일 개선.
- 2026.01.27: 초기 구현 및 상세 페이지 통합 완료.
