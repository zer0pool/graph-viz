# Docker Compose를 이용한 로컬 통합 실행 가이드

이 문서는 Docker Compose를 사용하여 전체 프로젝트(Backend 및 Frontend)를 로컬에서 가장 쉽고 빠르게 실행하는 방법을 설명합니다.

---

## 🏗️ 전체 시스템 구조

현재 프로젝트는 관리 효율성과 포트 충돌 방지를 위해 두 개의 독립적인 Docker Compose 스택으로 나누어져 있습니다.

### 1. Backend Stack (`apps/backend`)

백엔드 로직과 데이터 저장소 계층을 포함합니다.

- **lineage-manager**: 메인 API 서버 (FastAPI) - Port 5003
- **db-mysql**: 데이터베이스 (MySQL 8) - Port 33306 (External)
- **cache-redis**: 캐시 저장소 (Redis)
- **app-job-dummy**: 가상 데이터 생성을 위한 워커

### 2. Frontend Stack (`apps/frontend`)

사용자 인터페이스와 마이크로 프론트엔드(MFE) 계층을 포함합니다.

- **web-shell**: 서비스 진입점 및 컨테이너 오케스트레이션 - Port 5100
- **web-lineage**: Lineage 그래프 MFE - Port 5101
- **web-table-viewer**: 테이블 상세 정보 MFE - Port 5102

---

## 🚀 빠른 시작 (Quick Start)

### 1. 사전 준비 (Prerequisites)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 또는 Docker 엔진이 설치되어 있어야 합니다.
- 프로젝트 루트에 있는 `.env` 파일의 설정을 확인하십시오.

### 2. 실행 순서

가장 안정적인 실행을 위해 다음 순서를 권장합니다.

#### Step 1: Backend 실행

```bash
# 루트 디렉토리에서 실행
make backend-up
```

또는 직접 실행:

```bash
cd apps/backend
docker-compose -p backend up -d
```

_백엔드가 DB에 연결되고 초기화될 때까지 약 10~20초 정도 기다려 주십시오._

#### Step 2: Frontend 실행

```bash
make admin-up
```

### 3. 접속 확인

브라우저에서 다음 주소로 접속합니다:
👉 **[http://localhost:5100/admin-console](http://localhost:5100/admin-console)**

---

## 🔍 모니터링 및 관리

### 서비스 상태 확인

```bash
docker ps --filter "name=app-" --filter "name=web-" --filter "name=db-" --filter "name=cache-"
```

### 로그 확인 (실시간)

- **전체 로그**: `make logs`
- **백엔드 로그**: `make backend-logs`
- **어드민 로그**: `make admin-logs`

### 스택 중지

```bash
# 전체 스택 중지
make down

# 개별 스택 중지
make backend-down
make admin-down
```

---

## 🛠️ 주요 설정 참고 (Troubleshooting)

### CORS 설정

백엔드(`lineage-manager`)는 기본적으로 `localhost:5100~5102` 포트의 요청만 허용합니다. 만약 다른 포트를 사용하시려면 `apps/backend/lineage_manager/.env` 파일의 `CORS_ALLOWED_ORIGINS`를 수정해야 합니다.

### 네트워크 구조

`web-shell`은 백엔드 API를 프록시하기 위해 `backend_backend-network`라는 외부 네트워크에 연결되어 있습니다. 만약 백엔드 스택이 실행되지 않은 상태에서 어드민 스택을 띄우면 네트워크 오류가 발생할 수 있으니, **항상 백엔드를 먼저 실행**해 주세요.

### 데이터 초기화

DB의 모든 데이터를 삭제하고 처음부터 다시 시작하고 싶다면:

```bash
cd apps/backend
docker-compose -p backend down -v  # -v 옵션으로 볼륨(데이터) 삭제
docker-compose -p backend up -d
```
