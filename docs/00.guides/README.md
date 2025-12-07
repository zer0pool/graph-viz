# 00.guides – 개발 표준 & 협력 규칙

**이 폴더의 문서들은 모든 개발자가 항상 참고해야 하는 필수 가이드입니다.**

## 📄 문서 목록

### 1. `how-to-write-documents.md`
**문서 작성 방법 및 규칙**
- Markdown 포맷 가이드
- 제목, 목차 작성 규칙
- 코드 예제 삽입 방법
- 문서 구조 템플릿

### 2. `agents.md`
**AI 에이전트(ChatGPT, Copilot) 협력 규칙**
- 프롬프팅 가이드라인
- 토큰 효율성 팁
- 프롬프트 템플릿
- AI와의 효과적인 협력 방법

### 3. `coding-standards.md` (작성 예정)
**코드 스타일 및 네이밍 컨벤션**
- Python 코드 스타일 (FastAPI 서비스)
- JavaScript 코드 스타일 (프론트엔드)
- 네이밍 규칙 (변수, 함수, 클래스)
- Linting & Formatting 도구

### 4. `git-workflow.md` (작성 예정)
**Git 브랜치 전략 및 커밋 규칙**
- 브랜치 명명 규칙
- 커밋 메시지 형식
- Pull Request 절차
- 리뷰 체크리스트

### 5. `common-tasks.md` (작성 예정)
**반복 작업 체크리스트**
- 새 엔드포인트 추가하기
- 새 데이터베이스 모델 추가하기
- 마이그레이션 작성하기
- 테스트 작성하기

---

## 🎯 사용 시나리오

| 상황 | 문서 |
|------|------|
| 새 개발자 입사 | `01.onboarding/` 후 이 폴더 읽기 |
| 코드 리뷰 중 스타일 논쟁 | `coding-standards.md` 참고 |
| 브랜치 생성할 때 | `git-workflow.md` 참고 |
| AI에 도움 요청할 때 | `agents.md` 참고 |
| 새로운 기능 추가 | `common-tasks.md`의 체크리스트 따르기 |

---

## 📌 중요: .github/copilot-instructions.md와의 관계

- `.github/copilot-instructions.md` – GitHub Copilot이 자동으로 로드하는 파일
- `guides/agents.md` – 상세한 AI 협력 가이드 (이 폴더)

**VS Code Copilot Chat 사용 시**: `.github/copilot-instructions.md`가 자동 참조됨
**수동 참고**: `guides/agents.md`에서 더 자세한 내용 확인 가능

---

**마지막 업데이트**: 2025년 12월 7일
