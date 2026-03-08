# 빌드 스테이지
FROM python:3.11-slim AS builder

WORKDIR /app

# 시스템 의존성 및 Python 패키지 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# 최종 스테이지
FROM python:3.11-slim

WORKDIR /app

# 필요한 패키지만 설치
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

# 소스 코드 복사
COPY . ./src/lineage_manager
COPY deploy/docker/entrypoint.sh /entrypoint.sh

# 환경 변수 설정
ENV PYTHONPATH=/app/src
ENV PORT=5003

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["backend"]
