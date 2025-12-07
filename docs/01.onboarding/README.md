# 01.onboarding – 신규 팀원 환영

**처음 Lineage Manager 프로젝트에 참여하는 팀원을 위한 단계별 가이드입니다.**

온보딩을 완료하려면 아래 체크리스트를 차례대로 따르세요.

---

## ✅ 온보딩 체크리스트

### Phase 1: 환경 설정 (1-2시간)
- [ ] `1.environment-setup.md` 읽고 개발 환경 설정 완료
- [ ] `make venv && make install-dev` 실행 성공
- [ ] `make run` 으로 서버 실행 확인 (http://localhost:5003)
- [ ] 데이터베이스 연결 확인

### Phase 2: 프로젝트 이해 (2-3시간)
- [ ] `architecture-overview.md` 읽기 (프로젝트 전체 구조)
- [ ] `domain-concepts.md` 읽기 (주요 개념: Job, Table, Graph 등)
- [ ] 소스 코드 디렉토리 구조 확인 (`src/lineage_manager/`)

### Phase 3: 첫 기여 (1-2시간)
- [ ] `2.first-contribution.md` 읽기
- [ ] 작은 버그 수정 또는 문서 업데이트로 PR 제출
- [ ] 코드 리뷰 받고 병합

### Phase 4: 개발 표준 학습 (1시간)
- [ ] `00.guides/coding-standards.md` 읽기
- [ ] `00.guides/git-workflow.md` 읽기

### Phase 5: 심화 학습 (자유시간)
- [ ] `02.architecture/` 의 세부 아키텍처 문서 읽기
- [ ] 기존 엔드포인트 코드 분석 및 이해
- [ ] 테스트 작성 및 실행

---

## 📄 문서 목록

### `1.environment-setup.md`
**개발 환경 설정 가이드**
- 필수 소프트웨어 설치 (Python, Node.js 등)
- 저장소 클론 및 의존성 설치
- 데이터베이스 초기화
- 환경 변수 설정
- 첫 실행 확인

### `2.first-contribution.md`
**첫 PR 만들기 가이드**
- 작은 변경 선택 방법
- 브랜치 생성 및 변경
- PR 작성 및 제출 절차
- 코드 리뷰 받기
- 병합까지의 과정

### `architecture-overview.md`
**프로젝트 아키텍처 개요 (신규팀원용)**
- 전체 시스템 구조 (30초 설명)
- 백엔드와 프론트엔드
- 주요 기술 스택
- 디렉토리 구조 안내
- 다음 단계로 읽을 문서

### `domain-concepts.md`
**핵심 개념 설명**
- Job (작업)과 Table (테이블) 이해
- Graph (그래프) 개념
- Lineage (계보) 의미
- Closure Table (폐쇄 테이블)
- 기타 도메인 용어

---

## 🎯 팁

- **첫날**: Phase 1 + Phase 2의 아키텍처 개요만
- **첫주**: Phase 3 완료 (실제 코드 제출)
- **둘째주**: Phase 4 + 5 진행 (심화 학습)
- **셋째주**: 실제 기능 개발 시작 가능

---

## 📞 질문이 있을 때

1. 이 폴더의 관련 문서 다시 읽기
2. `00.guides/` 의 공통 FAQ 참고
3. `02.architecture/` 에서 기술 배경 이해
4. 팀원에게 질문

---

**마지막 업데이트**: 2025년 12월 7일
