# 05.playbook-and-refs – 운영 매뉴얼 & 참고자료

**배포, 장애 대응, 데이터 마이그레이션 등 운영 관련 매뉴얼과 기술 참고자료를 모아둔 폴더입니다.**

---

## 📚 구조

```
05.playbook-and-refs/
├─ playbooks/               # 운영 매뉴얼
│  ├─ deployment.md         # 배포 절차
│  ├─ incident-response.md  # 장애 대응
│  ├─ data-migration.md     # 데이터 마이그레이션
│  ├─ database-backup.md    # DB 백업/복구
│  └─ performance-tuning.md # 성능 최적화
├─ references/              # 참고자료
│  ├─ external-docs.md      # 외부 문서 링크
│  ├─ glossary.md           # 용어 정의
│  └─ research-notes/       # 기술 조사 노트
└─ README.md
```

---

## 📖 playbooks/ – 운영 매뉴얼

**반복되는 운영 작업을 단계별로 기록한 매뉴얼입니다.**

### `deployment.md`
**배포 절차 (스테이징 & 프로덕션)**
- 배포 전 체크리스트
- 배포 단계별 명령어
- 배포 후 검증
- 롤백 절차
- 모니터링 체크포인트

### `incident-response.md`
**장애 대응 매뉴얼**
- 장애 인식 (Alert)
- 초기 진단 명령어
- 로깅 & 로그 분석
- 임시 해결책 (Workaround)
- 근본 원인 분석
- 영구 해결책
- 사후 분석 (Post-mortem)

### `data-migration.md`
**데이터 마이그레이션 매뉴얼**
- 마이그레이션 계획 수립
- 데이터 검증
- 마이그레이션 명령어
- 롤백 계획
- 검증 쿼리

### `database-backup.md`
**데이터베이스 백업 & 복구**
- 백업 전략 (Full, Incremental)
- 백업 명령어
- 백업 검증 방법
- 복구 절차
- 재해 복구 계획 (DRP)

### `performance-tuning.md`
**성능 최적화 가이드**
- 성능 병목 찾기
- 데이터베이스 쿼리 최적화
- 캐시 전략 (Redis)
- API 응답시간 개선
- 프론트엔드 성능 최적화

---

## 📚 references/ – 참고자료

**프로젝트 관련 기술 자료, 링크, 용어 정의를 모아둔 폴더입니다.**

### `external-docs.md`
**외부 라이브러리 공식 문서 링크**
- FastAPI 공식 문서
- SQLAlchemy ORM 문서
- Cytoscape.js API 문서
- Redis 클라이언트 문서
- 기타 의존성

### `glossary.md`
**도메인 용어 정의**
- DAG (Directed Acyclic Graph)
- Lineage (데이터 계보)
- Closure Table (폐쇄 테이블)
- Job (작업)
- Table (데이터 테이블)
- Graph Expansion
- 기타 도메인 용어

### `research-notes/` (폴더)
**기술 조사 및 실험 기록**
```
references/research-notes/
├─ redis-caching-strategy.md      # Redis 캐싱 전략 조사
├─ cytoscape-performance.md        # Cytoscape.js 성능 분석
├─ database-optimization.md        # DB 최적화 연구
└─ frontend-state-management.md    # 상태 관리 패턴 연구
```

---

## 🚀 자주 사용하는 매뉴얼

| 상황 | 매뉴얼 |
|------|--------|
| 프로덕션에 배포하려고 함 | `playbooks/deployment.md` |
| 서버 장애 발생 | `playbooks/incident-response.md` |
| DB 마이그레이션 진행 | `playbooks/data-migration.md` |
| 성능이 느린 문제 | `playbooks/performance-tuning.md` |
| 용어 이해 안 됨 | `references/glossary.md` |
| 외부 문서 찾는 중 | `references/external-docs.md` |

---

## ✅ 플레이북 템플릿

### 표준 플레이북 구조
```markdown
# [작업명] 플레이북

## 개요
- 작업 목표
- 예상 시간
- 위험도 (Low/Medium/High)

## 사전 요구사항
- [ ] 필요한 권한
- [ ] 필요한 소프트웨어
- [ ] 필요한 정보 수집

## 단계별 절차
### Step 1: [첫 번째 단계]
```bash
# 실행할 명령어
```
- 예상 결과
- 문제 발생 시 조치

### Step 2: [두 번째 단계]
...

## 검증
- [ ] 검증 항목 1
- [ ] 검증 항목 2
- [ ] 검증 항목 3

## 롤백 절차
- Step 1 롤백
- Step 2 롤백

## 사후 조치
- 모니터링 포인트
- 로그 확인
- 알림 설정

## FAQ & 문제 해결
**Q: 문제 상황?**
A: 해결 방법

## 참고
- 관련 문서: [링크]
- 관련 코드: [링크]
```

---

## 💾 작성 & 유지보수 가이드

### 새 플레이북 추가할 때
1. `playbooks/` 폴더에 파일 생성 (파일명: `action-name.md`)
2. 위 템플릿 사용하여 작성
3. 실제로 따라해서 검증
4. 팀원 리뷰

### 플레이북 업데이트
- 실행할 때마다 최신 정보로 업데이트
- 변경사항 날짜 기록
- 버전 관리 (v1.0, v1.1 등)

### 외부 참고자료 관리
- 분기별로 링크 유효성 확인
- 변경된 링크 업데이트
- 더 이상 필요 없는 자료 정리

---

## 📌 팁

- **플레이북은 자동화의 첫 단계**: 나중에 스크립트로 자동화 가능
- **실제 경험 기반으로 작성**: 이론이 아닌 경험한 절차 기록
- **스크린샷/예시 포함**: 텍스트만으로 부족할 때 시각 자료 추가
- **정기 리뷰**: 분기별로 플레이북 유효성 확인
- **팀 공유**: 새 플레이북 완성 후 팀에 공유

---

## 📚 관련 문서

- **배포 자동화**: CI/CD 파이프라인 설정 (`.github/workflows/`)
- **모니터링**: 로그 및 알림 설정 (시스템 관리팀)
- **운영 일지**: 월간 운영 보고서 (별도 문서)

---

**마지막 업데이트**: 2025년 12월 7일
