---
updated: 2026-03-24
---

# OPS Console — Documentation Index

프로젝트 문서의 마스터 인덱스입니다. 필요한 내용에 따라 아래 폴더를 참고하세요.

---

## 📂 폴더 구조

```
docs/
├── 00.guides/             모든 개발자가 반드시 따라야 할 표준 & 규칙
├── 01.onboarding/         신규 팀원 온보딩 가이드
├── 02.architecture/       시스템 설계 & 아키텍처 레퍼런스
├── 03.specs-and-reports/  기능 명세(구현 전) & 완료 보고서
├── 04.design/             현재 진행 중인 기능 설계 문서
├── 05.work-history/       완료된 작업 노트 & 개발 로그
│   └── archive/           초기 개발 노트 (2025-11) — 참고 전용
└── 06.playbook-and-refs/  운영 매뉴얼 & API 설계 패턴
```

---

## 🗺️ 상황별 빠른 참고

| 상황 | 참고 문서 |
| :--- | :--- |
| 코딩 표준 확인 | [00.guides/](00.guides/README.md) |
| 로컬 환경 설정 | [00.guides/environment-guide.md](00.guides/environment-guide.md) |
| 서비스 실행 방법 | [00.guides/execution-guide.md](00.guides/execution-guide.md) |
| Docker로 전체 실행 | [00.guides/local-docker-guide.md](00.guides/local-docker-guide.md) |
| 배포/502 에러 해결 | [00.guides/troubleshooting.md](00.guides/troubleshooting.md) |
| 전체 시스템 구조 이해 | [02.architecture/system-overview.md](02.architecture/system-overview.md) |
| 진행 중인 기능 설계 | [04.design/](04.design/) |
| 완료된 기능 히스토리 | [03.specs-and-reports/reports/](03.specs-and-reports/reports/) |
| API 설계 패턴 | [06.playbook-and-refs/internal-api-design-patterns.md](06.playbook-and-refs/internal-api-design-patterns.md) |
| PR 전 체크리스트 | [00.guides/submission-checklist.md](00.guides/submission-checklist.md) |

---

## 📁 00.guides — 개발 표준 (상시 참고)

> 코드 리뷰 기준, 브랜치 전략, MFE 계약 등 팀의 공통 규칙.

| 파일 | 설명 |
| :--- | :--- |
| [submission-checklist.md](00.guides/submission-checklist.md) | 커밋/PR 전 필수 체크리스트 |
| [codebase-map.md](00.guides/codebase-map.md) | 서비스 & 컴포넌트 전체 맵 |
| [admin-console-architecture.md](00.guides/admin-console-architecture.md) | 프론트엔드 FSD 아키텍처 |
| [react-style-guide.md](00.guides/react-style-guide.md) | React/TypeScript 코딩 표준 |
| [react-refactoring-guide.md](00.guides/react-refactoring-guide.md) | React 리팩토링 가이드 |
| [fastapi-refactoring-guide.md](00.guides/fastapi-refactoring-guide.md) | 백엔드 DDD/Async 표준 |
| [fastapi-ddd-template-v2.md](00.guides/fastapi-ddd-template-v2.md) | FastAPI DDD 프로젝트 템플릿 (현행) |
| [fastapi-graphql.md](00.guides/fastapi-graphql.md) | GraphQL + FastAPI 패턴 |
| [fastapi-di-usecase-vs-container-ko.md](00.guides/fastapi-di-usecase-vs-container-ko.md) | DI: UseCase vs Container 비교 |
| [mfe-contract.md](00.guides/mfe-contract.md) | MFE 통신 인터페이스 계약 |
| [mfe-integration-guide.md](00.guides/mfe-integration-guide.md) | MFE 통합 방법 |
| [git-branching-guide.md](00.guides/git-branching-guide.md) | 브랜치 네이밍 & PR 워크플로우 |
| [local-docker-guide.md](00.guides/local-docker-guide.md) | Docker Compose 로컬 실행 |
| [environment-guide.md](00.guides/environment-guide.md) | 환경변수 & 설정 가이드 |
| [execution-guide.md](00.guides/execution-guide.md) | 각 서비스 실행 방법 |
| [testing-guide.md](00.guides/testing-guide.md) | 테스트 전략 & 실행 방법 |
| [troubleshooting.md](00.guides/troubleshooting.md) | 배포 & 502 에러 해결 |
| [agents.md](00.guides/agents.md) | AI 에이전트 협력 규칙 |
| [how-to-write-documents.md](00.guides/how-to-write-documents.md) | 문서 작성 규칙 |

---

## 📁 01.onboarding — 신규 팀원 가이드

| 파일 | 설명 |
| :--- | :--- |
| [environment-setup.md](01.onboarding/environment-setup.md) | 최초 개발 환경 설정 |
| [domain-concepts.md](01.onboarding/domain-concepts.md) | 핵심 도메인 용어 설명 |
| [service-architecture.md](01.onboarding/service-architecture.md) | 서비스 아키텍처 개요 |
| [first-contribution.md](01.onboarding/first-contribution.md) | 첫 PR 만들기 |

---

## 📁 02.architecture — 시스템 아키텍처

| 파일 | 설명 |
| :--- | :--- |
| [system-overview.md](02.architecture/system-overview.md) | 전체 시스템 개요 |
| [design.md](02.architecture/design.md) | 아키텍처 설계 (요약) |
| [endpoints.md](02.architecture/endpoints.md) | API 엔드포인트 맵 (요약) |
| [improvements.md](02.architecture/improvements.md) | 개선 예정 사항 |
| [transaction-rules.md](02.architecture/transaction-rules.md) | 서비스 레이어 트랜잭션 규칙 |
| [backend/design.md](02.architecture/backend/design.md) | 백엔드 아키텍처 (상세) |
| [backend/endpoints.md](02.architecture/backend/endpoints.md) | 백엔드 API 엔드포인트 (상세) |
| [backend/improvements.md](02.architecture/backend/improvements.md) | 백엔드 개선 항목 |

---

## 📁 03.specs-and-reports — 명세 & 보고서

### specs/ — 구현 전 기능 명세
구현 시작 전에 작성하는 설계 문서. 파일명 형식: `YYYY-MM-DD_feature-name.md`

### reports/ — 완료 보고서
기능/리팩토링 완료 후 작성. 최근 주요 보고서:

- [2026-01-31-fuzzy-search-completion.md](03.specs-and-reports/reports/2026-01-31-fuzzy-search-completion.md)
- [2026-01-30_bff-auth-refactoring.md](03.specs-and-reports/reports/2026-01-30_bff-auth-refactoring.md)
- [2026-01-30-dummy-job-manager-refactor-completion.md](03.specs-and-reports/reports/2026-01-30-dummy-job-manager-refactor-completion.md)
- [2026-01-10_sso_deployment_ready.md](03.specs-and-reports/reports/2026-01-10_sso_deployment_ready.md)

---

## 📁 04.design — 진행 중인 설계 문서

현재 개발/설계 중인 기능의 설계 문서. 완료 후 `03.specs-and-reports/reports/`로 이동.

최신 문서:
- [2026-03-09_frontend_api_analysis.md](04.design/2026-03-09_frontend_api_analysis.md)
- [2026-03-02_run_history_design_spec.md](04.design/2026-03-02_run_history_design_spec.md)
- [2026-03-02_job_filtering_detail_design.md](04.design/2026-03-02_job_filtering_detail_design.md)
- [2026-03-02_job_detail_analysis.md](04.design/2026-03-02_job_detail_analysis.md)
- [2026-03-02_Todo.md](04.design/2026-03-02_Todo.md)

---

## 📁 05.work-history — 완료된 작업 노트

구현 중에 작성된 개발자 노트. 역사적 맥락 파악에 유용.

- `archive/` — 초기 개발 단계 노트 (2025-11). 읽기 전용 참고용.

---

## 📁 06.playbook-and-refs — 운영 매뉴얼 & 참고자료

| 파일 | 설명 |
| :--- | :--- |
| [internal-api-design-patterns.md](06.playbook-and-refs/internal-api-design-patterns.md) | 내부 API 설계 패턴 레퍼런스 |

---

_Last updated: 2026-03-24_
