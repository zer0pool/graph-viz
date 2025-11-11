Title: DB 세션/커넥션 문제 원인과 수정 내역 (06)

개요
- 증상: 그래프를 반복 확장(특히 upstream) 하다 보면 간헐적으로 DB 오류 발생
  - PyMySQL: `InternalError: Packet sequence number wrong - got X expected 1`
  - 기타: `read of closed file`, 트랜잭션 롤백 로그
- 영향: 요청 처리 중 예외 발생 → 500 응답 → UI 확장 실패

재현 조건(발견 케이스)
1) `JOB_TEST_10` 등록 후 좌측(upstream) 방향으로 노드를 연속해서 Expand
2) 여러 요청이 빠르게 연속/동시에 처리되며, 간헐적으로 위 오류 재현

근본 원인 분석
- 이전 구현은 `scoped_session`(스레드 로컬 기반)을 전역으로 유지하며 사용
- FastAPI/Starlette는 비동기 실행 모델로 동일 스레드에서 여러 코루틴(요청)이 interleave될 수 있음
- 그 결과, 스레드-로컬만으로는 ‘요청 단위 분리’가 보장되지 않아 세션/연결이 요청 간 잘못 재사용될 가능성 존재
- 또한 MySQL 커넥션은 장시간 유휴/네트워크 이슈 등으로 끊길 수 있음
  - 끊긴 커넥션 재사용 시 `Packet sequence number wrong` 등 드라이버 레벨 오류 발생

수정 전략
1) 요청 단위(Session per request)로 전환
   - `scoped_session` 제거, `sessionmaker`로 변경
   - 미들웨어에서 요청마다 `Session()`을 생성/주입/종료
2) 커넥션 풀 탄력성 강화 (MySQL 등 서버형 DB 대상)
   - `pool_pre_ping=True`: 커넥션 사용 전 ping으로 통신 이상 조기 감지
   - `pool_recycle=1800`: 30분 주기로 커넥션 재생성(서버 타임아웃 회피)
   - `pool_size`, `max_overflow`를 설정값에서 반영

코드 변경 요약
- 파일: `src/graph_manager/core/database.py`
  - `scoped_session` → `sessionmaker`로 교체
  - `Database.session_maker()` 추가
  - 엔진 생성 시 (sqlite 제외)
    - `pool_pre_ping=True`, `pool_recycle=1800`
    - `pool_size=settings.database_pool_size`, `max_overflow=settings.database_max_overflow`
- 파일: `src/graph_manager/core/container.py`
  - 컨테이너의 `session_factory` 제공자를 `db.session_maker`로 교체
- 파일: `src/graph_manager/core/middleware.py`
  - 매 요청마다 `session_maker()`로 새 `Session` 생성
  - 요청 종료 시 `commit/rollback` 후 `close()`

환경 설정 (.env → Settings)
- 다음 값은 이미 존재하며, 이제 실제 엔진 풀에 반영됨
  - `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW`
  - 필요 시 운영 환경에 맞게 조정

검증 방법
1) 앱 재기동 후 다음 시나리오 반복
   - 검색으로 그래프 표시 → 노드 우클릭 → Upstream/Downstream 확장 반복
   - 에러 로그 (`Packet sequence number wrong`, `read of closed file`) 재현 여부 확인
2) `GET /api/v1/graph/health`로 연결 상태와 카운트 정상 확인

영향 범위/호환성
- API 인터페이스 변경 없음
- 세션 생명주기가 요청 단위로 안전하게 분리되어 동시성 안정성 향상
- 장시간 유휴 후 재요청 등에서도 풀 ping/재활용으로 끊김 복구

추가 고려 사항(옵션)
- 매우 긴 유휴 타임아웃 환경에서는 `pool_recycle` 값을 더 짧게(예: 600초) 조정
- DB 서버의 `wait_timeout`, `interactive_timeout` 정책을 앱 설정과 일치하게 구성
- 대량 동시요청 시 `pool_size/max_overflow` 튜닝

