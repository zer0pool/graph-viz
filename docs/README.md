# 📚 Lineage Manager 개발 가이드

프로젝트 문서는 아래 6개 섹션으로 구성되어 있습니다. **항상 00.guides부터 시작하세요!**

## 🔴 [00.guides](./00.guides/) – 개발 표준 & 협력 규칙
**개발자가 항상 참고해야 하는 필수 문서**
- 코드 스타일 가이드
- AI 에이전트 협력 규칙
- Git 워크플로우
- 공통 작업 체크리스트

👉 **새 개발자는 여기서 시작하세요!**

---

## 🟠 [01.onboarding](./01.onboarding/) – 신규 팀원 환영
**처음 프로젝트에 참여하는 팀원을 위한 단계별 가이드**
- 개발 환경 설정
- 첫 번째 기여(Pull Request) 만들기
- 아키텍처 개요 (간단한 버전)
- 완료 체크리스트

👉 **입사 첫날에 이 폴더의 체크리스트를 따르세요!**

---

## 🟡 [02.architecture](./02.architecture/) – 시스템 설계
**전체 시스템 구조와 기술 결정을 깊이 있게 이해**
- 백엔드 아키텍처 (FastAPI, DI, 서비스 분리)
- 프론트엔드 아키텍처 (Cytoscape, 상태 관리)
- 데이터베이스 설계 (ERD, 폐쇄 테이블)
- **API 명세** (전체 엔드포인트 문서)
- 설계 결정 기록 (ADR)

👉 **기술 구조를 이해하려면 여기를 읽으세요!**

---

## 🟢 [03.specs-and-reports](./03.specs-and-reports/) – 기능 명세 & 완성 보고서
**계획→개발→검증 사이클의 핵심 문서**

### 📋 **specs/** – 구현 전 작성하는 기능 명세
- 새 기능을 개발하기 전에 설계 문서 작성
- 파일명: `2025-01-feature-name.md`
- 템플릿: `template.md` 참고

### 📊 **reports/** – 완성 보고서 & 버그 요약
- 기능 구현 완료 후 작성하는 결과 보고서
- 누적 버그 수정 요약 (BUG_FIXES_SUMMARY.md)
- 리팩토링 완료 보고서 (REFACTORING_FINAL_SUMMARY.md)

👉 **새 기능을 추가할 때는 spec 먼저, 완료 후 report를 작성하세요!**

---

## 🔵 [04.development-notes](./04.development-notes/) – 작업 노트 & 아이디어
**진행 중인 기능별 작업 노트, 실험, 아이디어**
- 기능별 구현 노트 및 진행사항
- 실험 결과 및 테스트 로그
- 해결된 문제와 교훈
- 향후 개선 아이디어

👉 **진행 중인 작업을 추적하고 나중에 참고하려면 여기 기록하세요!**

---

## 🟣 [05.playbook-and-refs](./05.playbook-and-refs/) – 운영 매뉴얼 & 참고자료

### 📖 **playbooks/** – 운영 매뉴얼
- 배포 절차 (스테이징/프로덕션)
- 장애 대응 매뉴얼 (로깅, 롤백)
- 데이터 마이그레이션
- 데이터베이스 백업/복구
- 성능 최적화 가이드

### 📚 **references/** – 참고자료
- 외부 라이브러리 공식 문서 링크
- 용어 정의 (DAG, closure table 등)
- 기술 조사 노트
- 외부 논문/자료

👉 **배포/장애/운영 관련 작업을 하려면 여기를 참고하세요!**

---

## 🗂️ 폴더 구조 한눈에 보기

```
docs/
├─ 00.guides/                    # ← 항상 먼저! 개발 표준
├─ 01.onboarding/                # ← 신규 팀원 환영
├─ 02.architecture/              # ← 시스템 구조 & API
├─ 03.specs-and-reports/         # ← 명세 & 보고서
│  ├─ specs/
│  └─ reports/
├─ 04.development-notes/         # ← 작업 노트
├─ 05.playbook-and-refs/         # ← 운영 매뉴얼
│  ├─ playbooks/
│  └─ references/
└─ assets/                        # ← 이미지, 다이어그램 등
```

---

## 🚀  빠른 시작

**상황별 참고 문서:**

| 상황 | 참고 위치 |
|------|---------|
| 프로젝트 처음 시작 | `01.onboarding/` → `02.architecture/` |
| 코드 스타일 확인 | `00.guides/coding-standards.md` |
| API 엔드포인트 확인 | `02.architecture/api-reference.md` |
| 새 기능 추가 | `03.specs-and-reports/specs/template.md` |
| 배포하려고 함 | `05.playbook-and-refs/playbooks/deployment.md` |
| 장애 발생 | `05.playbook-and-refs/playbooks/incident-response.md` |
| 기존 기능 이해 | `04.development-notes/` |

---

## 📝 문서 작성 규칙

모든 문서 작성 시 `00.guides/how-to-write-documents.md`를 참고하세요!

- Markdown 포맷 준수
- 명확한 제목과 목차
- 코드 예제 포함
- 최신 상태 유지

---

**마지막 업데이트**: 2025년 12월 7일
