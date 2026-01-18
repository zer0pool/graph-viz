# MFE Platform 실행 가이드

> [!TIP] > **더 빠르고 간편한 실행 방법**: Docker Compose를 사용하여 전체 환경을 한 번에 띄우려면 [Docker 통합 실행 가이드](./00.guides/local-docker-guide.md)를 참고하세요.

## 📦 컴포넌트 목록 및 포트

| 컴포넌트                    | 경로                                     | 포트 | 실행 명령                                                                    |
| --------------------------- | ---------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| **Backend**                 | `apps/lineage_manager`                   | 5003 | `make run` 또는 `uvicorn apps.lineage_manager.main:app --reload --port 5003` |
| **Lineage MFE**             | `apps/admin_console/lineage`             | 3001 | `npm run dev`                                                                |
| **Table Detail Viewer MFE** | `apps/admin_console/table-detail-viewer` | 3002 | `npm run dev`                                                                |
| **Shell**                   | `apps/admin_console/shell`               | 3000 | `npm run dev`                                                                |

---

## 🚀 수동 실행 순서

### 1️⃣ Backend (필수)

```bash
cd /home/darkwing/src/lineage_platform
make run
# 또는
python -m uvicorn apps.lineage_manager.main:app --reload --port 5003
```

**확인**: http://localhost:5003/lineage-manager/docs

### 2️⃣ Table Detail Viewer MFE

```bash
cd /home/darkwing/src/lineage_platform/apps/admin_console/table-detail-viewer
npm run dev
```

**확인**: http://localhost:3002

### 3️⃣ Lineage MFE

```bash
cd /home/darkwing/src/lineage_platform/apps/admin_console/lineage
npm run dev
```

**확인**: http://localhost:3001

### 4️⃣ Shell (마지막)

```bash
cd /home/darkwing/src/lineage_platform/apps/admin_console/shell
npm run dev
```

**확인**: http://localhost:3000

---

## 📝 자동 실행/정지 스크립트 사용법

### 전체 시작

```bash
cd /home/darkwing/src/lineage_platform
./scripts/start-all.sh
```

### 전체 정지

```bash
cd /home/darkwing/src/lineage_platform
./scripts/stop-all.sh
```

### 개별 시작

```bash
./scripts/start-all.sh backend    # Backend만
./scripts/start-all.sh frontend   # Frontend만 (MFE + Shell)
```

---

## 🔍 로그 확인

각 컴포넌트의 로그는 `logs/` 디렉토리에 저장됩니다:

```bash
tail -f logs/backend.log
tail -f logs/lineage.log
tail -f logs/table-detail-viewer.log
tail -f logs/shell.log
```

---

## ⚠️ 주의사항

1. **실행 순서**: Backend → MFE들 → Shell 순서 권장
2. **포트 충돌**: 위 포트들이 사용중이면 에러 발생
3. **종료**: `Ctrl+C`로 개별 종료 또는 `stop-all.sh` 사용
4. **캐시 이슈**: 문제 발생 시 `rm -rf dist node_modules/.cache` 후 재시작
