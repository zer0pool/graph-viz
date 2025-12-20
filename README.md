# Lineage Manager

FastAPI와 Cytoscape.js를 사용한 그래프 시각화 프로젝트입니다.

## 프로젝트 구조

```
graph-viz/
├── src/                    # 소스 코드
├── tests/                  # 테스트 코드
├── deploy/                 # 배포 관련 파일
├── scripts/               # 유틸리티 스크립트
├── docs/                  # 문서
```

## 개발 환경 설정

### Python 가상환경 사용

```bash
# 가상환경 생성 및 의존성 설치
make venv

# 개발 도구 설치
make install-dev

# 서버 실행
make run
```

### Docker 사용

```bash
# Docker 이미지 빌드
make docker-build

# Docker 컨테이너 실행
make docker-run

# Docker Compose로 실행 (개발환경)
make compose-up

# 로그 확인
make compose-logs
```

## 테스트

```bash
# 전체 테스트 실행
make test

# 코드 린팅
make lint

# 코드 포맷팅
make format
```

## 로컬에서 변경 사항 확인하기 (PR 전 셀프 테스트)

### 1) 사전 요구 사항
- Python 3.11+ (로컬 실행 시)
- MySQL 8.0 이상

### 2) DB 준비
- 로컬 MySQL이 없다면 Docker로 임시 컨테이너를 띄우세요.
  ```bash
  docker run --name lineage-mysql -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=lineage_manager -p 3306:3306 -d mysql:8.0
  ```
- 이미 MySQL이 있다면 `.env`에 다음 값을 맞춰 적어두세요.
  ```env
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=root123
  DB_NAME=lineage_manager
  ```

### 3) 애플리케이션 실행
```bash
make venv          # 가상환경 생성
make install-dev   # 의존성 설치
make run           # 서버 실행 (기본 포트 5003)
```

### 4) 브라우저에서 확인
- `http://localhost:5003/lineage-manager/` 접속 후 수정한 정적 리소스를 확인합니다.
- 로그인 플로우까지 검증하려면 OIDC 값을 채우고 서버를 재시작하세요.
  ```env
  APP_OIDC_CLIENT_ID=...
  APP_OIDC_CLIENT_SECRET=...
  APP_OIDC_REDIRECT_URI=http://localhost:5003/oidc/callback
  ```

### 5) 종료 및 정리
- 서버 중단: 실행 중인 터미널에서 `Ctrl+C`
- 임시 MySQL 종료: `docker stop lineage-mysql && docker rm lineage-mysql`

## 배포

### Docker 이미지 사용

```bash
# 프로덕션용 Docker Compose 실행
make compose-prod-up
```

## API 문서

- API 문서: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 라이선스

MIT License
