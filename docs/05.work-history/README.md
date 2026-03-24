# 04.development-notes – 작업 노트 & 아이디어

**진행 중인 기능별 작업 노트, 실험, 아이디어를 추적하는 폴더입니다.**

---

## 📄 포함 내용

### 기능별 작업 노트
- 구현 중인 기능의 진행사항
- 발생한 문제 및 해결 방법
- 코드 스니펫 및 샘플
- 성능 테스트 결과

### 실험 로그
- 새로운 기술 시도 기록
- A/B 테스트 결과
- 성능 개선 실험

### 아이디어 & 개선안
- 앞으로 할 수 있는 개선사항
- 기술 부채 추적
- 리팩토링 제안

### 문제 해결 (Troubleshooting)
- 디버깅 경험
- 특정 버그의 원인 분석
- 해결책과 교훈

---

## 📝 파일 명명 규칙

```
topic-description.md
또는
YYYY-MM-DD-topic.md

예:
- frontend-graph-performance.md
- 2025-01-08-database-query-optimization.md
- redis-cache-strategy.md
- bug-analysis-session-leak.md
```

---

## 🗂️ 추천 구조

```
04.development-notes/
├─ feature-notes/              # 기능별 노트
│  ├─ job-detail-panel.md
│  ├─ graph-expand-api.md
│  └─ search-autocomplete.md
├─ experiment-logs/            # 실험 기록
│  ├─ redis-performance-test.md
│  ├─ frontend-rendering-optimization.md
│  └─ database-query-analysis.md
├─ ideas-and-improvements.md   # 아이디어 모음
├─ troubleshooting.md          # 문제 해결 기록
└─ README.md                   # 이 파일
```

---

## 📋 기본 템플릿

### 기능 작업 노트
```markdown
# [기능명] - 작업 노트

## 상태
- ⏳ 진행중 / ✅ 완료 / 🔴 블로킹 / ⚠️ 문제 발생

## 진행사항
- [날짜] 작업 내용
- [날짜] 만난 문제
- [날짜] 해결책 적용

## 코드 샘플
```python
# 작동하는 코드 스니펫
```

## 성능 결과
- 개선 전: 
- 개선 후: 
- 개선율: 

## 다음 단계
- [ ] 할일 1
- [ ] 할일 2

## 참고
- 관련 PR: #123
- 관련 이슈: #456
```

### 실험 로그
```markdown
# [실험제목]

## 가설
- 예상 결과

## 실험 방법
- 테스트 환경
- 테스트 케이스
- 측정 지표

## 결과
- 실제 결과
- 예상과의 차이

## 결론
- 다음 단계
- 기술 적용 가능성
```

---

## 🎯 사용 시나리오

| 상황 | 문서 |
|------|------|
| 새 기능 개발 시작 | `feature-notes/feature-name.md` 생성 |
| 새로운 기술 시도 | `experiment-logs/` 에 기록 |
| 버그 디버깅 | `troubleshooting.md` 에 기록 |
| 개선 아이디어 | `ideas-and-improvements.md` 에 추가 |
| 이전 문제 재현 | `troubleshooting.md` 검색 |

---

## 💡 팁

- **자주 기록하기**: 기억이 흐릿해지기 전에 즉시 기록
- **코드 샘플 포함**: 나중에 copy-paste 가능하게
- **시간 기록**: 성능 개선 시 before/after 명확히
- **링크 추가**: 관련 PR, 이슈, 다른 문서 링크
- **정기 정리**: 월 1회 필요 없는 노트 삭제 또는 아카이브

---

## 📚 관련 문서

- **기능 설계**: `03.specs-and-reports/specs/`
- **완성 보고서**: `03.specs-and-reports/reports/`
- **기술 조사**: `05.playbook-and-refs/references/research-notes/`

---

**마지막 업데이트**: 2025년 12월 7일
