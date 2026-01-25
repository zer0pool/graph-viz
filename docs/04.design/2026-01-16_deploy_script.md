# 0. 목적과 설계 범위

## 0. 목적과 설계 범위

### 0.1 목적

본 문서는 Admin Console(`shell + lineage_mfe + job-table_detail`)을

**로컬 → docker-compose → k8s**로 단계적으로 검증·배포하기 위한

**배포 스크립트 및 절차 설계**를 정의한다.

또한,

- **Shell에 embed된 MFE**
- **Standalone MFE (개발 / iframe 재사용)**

두 실행 모드를 **명확히 분리**하여 배포·운영 혼선을 방지한다.

---

### 0.2 범위

- 포함
  - Dockerfile / nginx 설정
  - docker-compose 기반 통합 검증
  - Helm chart (각 MFE 포함)
  - 배포 스크립트(Makefile or scripts)
  - Standalone MFE URL 및 배포 전략
- 제외
  - CI/CD 자동화
  - Production 운영 정책

---

## 1. 전체 배포 구조 개요

### 1.1 구성 요소

| 컴포넌트         | 역할                       | 기본 포트 |
| ---------------- | -------------------------- | --------- |
| shell            | Admin Console Host (entry) | 5100      |
| lineage_mfe      | Lineage UI                 | 5101      |
| job-table_detail | Job/Table Detail UI        | 5102      |

---

### 1.2 URL 체계 (설계 기준)

### 1) Shell 기반 통합 UI (운영자용)

```
/admin-console
/admin-console/lineage
/admin-console/job

```

- entry point = **shell**
- shell router + layout + SSO 사용

### 2) Standalone MFE (개발 / iframe)

```
/mfe-lineage
/mfe-job

```

- entry point = **각 MFE**
- shell 없음
- 개발, 디버깅, iframe 재사용 목적

> /admin-console/\* 는 항상 shell의 세계
>
> `/mfe-*` 는 **standalone MFE의 세계**

---

## 2. Task 1 — 배포 대상 및 포트 규약 고정

### 목표

- 환경이 달라도 **포트·역할·URL 의미가 변하지 않도록 고정**

### 해야 할 일

1. 포트 규약 문서화
2. 모든 Dockerfile / Helm chart에 동일 포트 적용

### 결과물

- `docs/deploy.md` 에 포트/URL 표
- 코드 내 하드코딩 제거

---

## 3. Task 2 — 각 앱 Dockerfile & nginx 설정 정리

### 목표

- 모든 앱이 **정적 서빙 + SPA fallback** 역할만 수행
- nginx 책임 최소화

---

### 3.1 Shell nginx (embedded 전용)

### 해야 할 일

- `/admin-console` 기준 SPA fallback
- 전역 `error_page 404` 제거
- rewrite 최소화

### 검증 포인트

- `/admin-console` 새로고침
- `/admin-console/없는경로` → index.html

---

### 3.2 Standalone MFE nginx

### 해야 할 일

- base path = `/mfe-lineage` (또는 `/`)
- iframe 사용 가능하도록 보안 헤더 검토
- shell 의존 코드 없음 확인

### 검증 포인트

- `/mfe-lineage` 단독 접근
- 새로고침 / deep link 정상

---

## 4. Task 3 — docker-compose 기반 통합 검증

### 목표

k8s 이전에 **nginx / 경로 / MFE 결합의 80~90% 문제 제거**

---

### 4.1 docker-compose 구성

### 해야 할 일

- shell + lineage_mfe + job-table_detail 포함
- 포트 5100/5101/5102 그대로 사용
- (선택) ingress-mock nginx 추가

---

### 4.2 검증 시나리오

### Embedded 검증

- `http://localhost:5100/admin-console`
- shell → lineage 화면 진입
- remoteEntry.js 200 확인

### Standalone 검증

- `http://localhost:5101/mfe-lineage`
- shell 없이 UI 정상 로딩

---

### 이 단계의 결론

> docker-compose 에서 OK 인 nginx 설정은
>
> k8s 에서도 **변경되지 않는 것을 목표로 한다**

---

## 5. Task 4 — MFE 결합(Host ↔ Remote) 확인

### 목표

- shell 이 **오직 통합 책임자**임을 보장
- MFE 간 직접 참조 방지

---

### 해야 할 일

1. shell의 Module Federation remote 설정 점검
2. lineage/job 이 shell context 없이도 실행되는지 확인
3. embedded / standalone 모드 분리 확인

---

### 검증 포인트

- shell 없이는 `/admin-console/lineage` 접근 불가
- standalone MFE는 shell 전역 상태를 가정하지 않음

---

## 6. Task 5 — Helm Chart 작성 (각 앱)

### 목표

- 각 앱을 **독립적으로 배포 가능**하게 한다

---

### 해야 할 일

- `deploy/helm/{app}` 구조 생성
- Deployment / Service 작성
- Service port = 510x 고정
- (선택) ingress는 상위에서 관리

---

### Standalone 관련 주의

- `/mfe-lineage` ingress/service 별도 정의 가능
- 운영 환경에서는 비공개 처리 가능

---

## 7. Task 6 — 배포 스크립트 작성

### 목표

- 반복 가능하고 예측 가능한 배포 절차 제공

---

### 해야 할 일

- Makefile 또는 scripts 디렉토리 작성
- 주요 명령:
  - build
  - push
  - deploy (helm)
  - verify (curl)

---

### Standalone 포함 검증

- `/mfe-lineage` 접근 확인
- iframe 사용 가능 여부 점검

---

## 8. Task 7 — k8s 배포 및 통신 검증

### 목표

- docker-compose 와 **동일한 동작 보장**

---

### 검증 포인트

- `/admin-console` → shell
- shell 내 lineage/job 정상
- (선택) `/mfe-lineage` 직접 접근

---

## 9. Task 8 — 문서화 및 운영 규약 확정

### 반드시 문서에 포함할 내용

- URL 체계 (embedded vs standalone)
- nginx / ingress 책임 분리
- standalone URL은 “비공식/개발용”임을 명시

---

## 10. 최종 설계 원칙 요약

> /admin-console/\* 는 항상 Shell entryStandalone MFE는 별도의 URL 세계docker-compose 에서 검증된 nginx 는 k8s 에서 재사용배포 스크립트는 “사람의 판단”을 최소화한다
