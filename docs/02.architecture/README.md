# 02.architecture – 시스템 설계

**전체 시스템 구조와 기술적 결정을 깊이 있게 문서화한 폴더입니다.**

---

## 📄 문서 목록

### 1. `design.md`
**전체 시스템 설계 및 아키텍처 개요**
- 시스템 다이어그램
- 주요 컴포넌트
- 데이터 흐름
- 설계 원칙

### 2. `api-reference.md` (또는 `endpoints.md`)
**전체 API 명세서**
- 모든 엔드포인트 목록
- 요청/응답 스키마
- 인증 방식
- 에러 처리
- API 버전 관리

### 3. `improvements.md`
**API 개선 제안 및 향후 계획**
- 기존 API의 개선사항
- 새로운 엔드포인트 계획
- 성능 최적화 아이디어
- 리팩토링 계획

---

## 🏗️ 아키텍처 심화 가이드 (작성 예정)

다음 문서들이 추가될 예정입니다:

### `backend-architecture.md`
- FastAPI 프레임워크 구조
- 의존성 주입(DI) 패턴
- 서비스 계층 설계 (GraphService, GraphQueryService)
- Repository 패턴
- 미들웨어 및 인터셉터

### `frontend-architecture.md`
- Cytoscape.js 그래프 엔진
- 상태 관리 (FilterState, SearchState 등)
- 컴포넌트 구조
- 이벤트 처리 및 통신
- UI 패널 및 컨트롤러

### `database-schema.md`
- ERD (Entity Relationship Diagram)
- 주요 테이블 설명
- 폐쇄 테이블(Closure Table) 패턴
- 인덱싱 전략
- 마이그레이션 관리

### `design-decisions.md` (ADR - Architecture Decision Records)
- 주요 기술 선택 이유
- 트레이드오프 분석
- 이전 결정과의 관계
- 변경 이력

---

## 🎯 사용 시나리오

| 상황 | 문서 |
|------|------|
| 프로젝트 구조 이해 | `design.md` |
| 특정 API 사용 | `api-reference.md` |
| 백엔드 코드 분석 | `backend-architecture.md` (작성 예정) |
| 프론트엔드 코드 분석 | `frontend-architecture.md` (작성 예정) |
| DB 스키마 이해 | `database-schema.md` (작성 예정) |
| 설계 의사결정 이해 | `design-decisions.md` (작성 예정) |

---

## 📚 관련 문서

- **신규팀원 입문용**: `01.onboarding/architecture-overview.md`
- **API 클라이언트 개발**: `api-reference.md`
- **개발 표준**: `00.guides/coding-standards.md`
- **기술 조사 자료**: `05.playbook-and-refs/references/`

---

**마지막 업데이트**: 2025년 12월 7일
