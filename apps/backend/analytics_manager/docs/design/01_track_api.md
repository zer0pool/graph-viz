# Design Document: Track API

## 1. 개요
프론트엔드에서 발생하는 사용자 방문 및 활동 로그를 수집하고, 이를 실시간으로 집계하여 인기 항목(Top Visited) 등의 통계 정보를 제공하기 위한 시스템 설계입니다.

## 2. 요구사항
- 실시간 방문 로그 수집 (`POST /track`)
- 방문 경로(Path)별 누적 방문 횟수 관리
- 수집된 데이터를 기반으로 실시간 인기 항목 조회 지원
- 대량 요청에 대비한 효율적인 저장 방식 (Redis 활용)

## 3. 데이터 구조 설계
### 3.1 Redis 기반 실시간 집계
- **방문 횟수 저장 (Sorted Set)**: `analytics:path_visits`
  - Member: `path` (예: `/tables/prod.users`)
  - Score: 방문 횟수 (Increment by 1)
- **경로 제목 매핑 (Hash)**: `analytics:path_titles`
  - Field: `path`
  - Value: `title` (페이지 제목)

### 3.2 API 명세
#### POST `/api/v1/analytics/track`
- **목적**: 방문 이벤트 기록
- **Payload**:
  - `event_type`: 이벤트 종류 (기본값: `page_view`)
  - `path`: 방문 경로 (필수)
  - `title`: 페이지 제목 (선택)
  - `visitor_id`: 사용자 식별자 (선택)
  - `timestamp`: 이벤트 발생 시각 (선택)

## 4. 확장 계획 (Phase 2)
- **비동기 영구 저장**: Celery를 사용하여 Redis 데이터를 BigQuery로 배치 전송
- **세션 분석**: `visitor_id`를 기반으로 사용자 체류 시간 및 여정 분석 추가
- **필터링**: 특정 시간 범위(예: 최근 1시간, 7일 등)별 통계 제공
