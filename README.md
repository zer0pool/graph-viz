# Graph Visualization Project

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