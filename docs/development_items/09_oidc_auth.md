Title: OIDC 기반 AD 인증 적용 (09)

Summary
- Google Cloud Identity(OIDC) 기반 인증 흐름을 백엔드·프론트 모두에 도입했다.
- 전 API에 Bearer 토큰 검증을 강제하고, 최초 로그인 사용자를 DB에 저장한다.
- 프론트 상단에 “Sign in with Google” 버튼/프로필 패널을 추가하고, 모든 API 호출에 토큰을 자동 첨부한다.

환경 변수
- `.env` 신규 값: `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_AUDIENCE`, `OIDC_JWKS_CACHE_SECONDS`, `OIDC_SCOPES`.
- 값만 교체하면 외부(Cloud Identity) ↔ 사내 AD 전환이 가능하다.

백엔드 구현
- 설정: `Settings`에 OIDC 필드 추가, `requirements.txt`에 `PyJWT[crypto]`.
- 인증 모듈: `graph_manager/core/auth.py`
  - `OIDCProviderClient`가 discovery 문서/ JWKS를 캐시하고 `verify_id_token()`·`exchange_code()` 제공.
  - `require_authenticated_user` FastAPI dependency가 Authorization 헤더(or `access_token` 쿼리)로 들어온 ID Token을 검증하고 `request.state.user`에 주입.
- 데이터 모델: `graph_user_account` 테이블(`GraphUserAccount`) 및 `UserRepository`, `UserService`.
  - 최초 로그인/재로그인 시 프로필을 upsert 하고 마지막 로그인 시각을 갱신.
- DI: `GraphContainer`에 `user_service`, `oidc_provider` 제공자 추가.
- API
  - 공개: `GET /api/v1/auth/config`, `POST /api/v1/auth/exchange` (PKCE code 교환).
  - 보호: `GET /api/v1/users/me` – DB에 저장된 사용자 정보 + 내가 등록한 최근 작업 리스트를 반환.
  - 기존 라우터(graph/jobs/search/expand/sync/events/tables/diagnostics)는 모두 `Depends(require_authenticated_user)`로 보호.
- SSE: `/api/v1/events/trigger-status`도 토큰 검증을 거치며, 프론트는 `?access_token=<id_token>`으로 구독.

프론트엔드 구현
- HTML/CSS: 네비게이션에 로그인 버튼/프로필 칩, 프로필 모달 UI 추가(`modern-console.css`).
- JS
  - `static/js/auth.js`: 순수 JS 기반 PKCE 클라이언트.
    - `/api/v1/auth/config` 로드 → 로그인 버튼 클릭 시 state/code_verifier 생성 후 Google Authorization Endpoint로 redirect.
    - redirect 후 `/api/v1/auth/exchange` 호출해 tokens/user 저장(sessionStorage) 및 `auth:state-changed` 이벤트 발행.
    - `fetchWithAuth()`가 Authorization / `X-User` 헤더를 자동 추가하고 401 시 세션을 정리.
    - 프로필 패널에서 `/api/v1/users/me` 호출, “내가 등록한 작업” 목록 렌더링, 로그아웃 제공.
  - `static/js/main.js`
    - 모든 API 호출을 `authClient.fetchWithAuth`로 교체, 인증 오류 시 안내.
    - 로그인 완료 후에만 그래프 검색/확장이 동작하며, 로그아웃 시 그래프를 초기화.
    - SSE 구독은 로그인 토큰을 쿼리로 전달하며, 인증 상태 변경 이벤트에 따라 재연결.

새로운 요청/응답 규칙
- 요청 헤더: `Authorization: Bearer <ID Token>` 필수, `X-User`에는 Base64로 인코딩된 사용자 JSON(`sub`, `email`, `name`, `picture`, `roles` 등)을 포함.
- 프로필 API 응답 예
```
GET /api/v1/users/me
{
  "user": {
    "sub": "abc123",
    "name": "Kim Minsoo",
    "email": "minsu@example.com",
    "picture": "https://...",
    "roles": ["user"],
    "last_login_at": "2025-01-15T09:42:10Z"
  },
  "jobs_count": 3,
  "jobs": [
    { "job_id": "JOB_SALES", "name": "Daily Sales", "owner": "minsu@example.com", "updated_at": "2025-01-15T07:30:00Z" }
  ]
}
```

검증 가이드
1. `.env`에 실제 OIDC 값 입력 후 `make run`.
2. 브라우저에서 “Sign in with Google” 클릭 → 로그인 성공 시 상단 프로필이 표시돼야 함.
3. 개발자 도구 Network로 API 요청 헤더(`Authorization`, `X-User`) 확인.
4. DB `graph_user_account` 테이블에 로그인 사용자가 upsert 되었는지 확인.
5. `/api/v1/users/me` 호출로 프로필·내 작업 리스트 확인.
6. 로그아웃 후 API가 401을 반환하고 그래프가 초기화되는지 확인.
