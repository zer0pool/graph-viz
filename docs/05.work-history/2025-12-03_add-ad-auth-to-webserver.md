📄 인증 기능 추가 요구사항서
(Google Cloud Identity 기반 OIDC 인증)
1. 목적

본 시스템은 현재 외부 환경에서 개발 및 테스트가 진행 중이며,
향후 사내망으로 이전할 수 있다.
이에 따라 외부·내부 환경 모두에서 동일하게 사용할 수 있는 표준 인증 구조가 필요하다.

본 요구사항은 Google Cloud Identity 기반 OpenID Connect(OIDC) 를 이용해
웹서비스에 로그인 기능을 추가하는 것을 목표로 한다.
OIDC 표준 방식을 사용함으로써
사내 이전 시 사내 AD와 Cloud Identity를 연동하기만 하면
웹서비스 코드는 수정 없이 그대로 유지될 수 있다.

2. 적용 범위

프론트엔드 웹 애플리케이션

백엔드 API 서버(FastAPI 기반)

인증 필요 API 전체

외부/내부 환경 모두에서 동일한 인증 흐름 적용

3. 인증 구성 방식
3.1 인증 방식

Google Cloud Identity 기반

OpenID Connect(OIDC) Authorization Code Flow (PKCE) 사용

HTTPS 기반 통신 필수

Access Token + ID Token 을 사용하여 사용자 인증

3.2 외부 환경 (개발/테스트 단계)

Google Cloud Identity가 ID Provider로 동작

웹서비스는 Google 로그인 화면으로 redirect

로그인 완료 후 redirect_uri로 토큰 전달

프론트·백엔드는 Google의 OIDC 규격에 따라 토큰 처리

3.3 사내 환경 (운영 단계)

사내 AD ↔ Google Cloud Identity 계정 동기화 수행

웹서비스의 인증 로직은 변경 없음

인증 Provider endpoint·client_id·secret 만 환경변수로 변경

즉 코드 수정 없이 운영 환경으로 전환 가능

4. 프론트엔드 요구사항
4.1 로그인 UI

“Sign in with Google” 로그인 버튼 추가

로그인 상태 확인 UI(상단 사용자 정보 표시)

로그아웃 기능 추가

4.2 인증 절차

사용자가 로그인 버튼 클릭

Google OIDC Authorization Endpoint로 redirect

인증 성공 후 redirect_uri로 token 수신

ID Token 파싱 (email, name, sub 등)

Access Token/ID Token을 백엔드 호출 시 Authorization 헤더로 첨부

로그인 상태 유지 및 만료 시 갱신 처리

4.3 보안

토큰은 localStorage/sessionStorage 중 보안 정책에 따라 보관

토큰 만료 시 자동 재인증 또는 사용자 알림

5. 백엔드(FastAPI) 요구사항
5.1 토큰 검증

Google JWKS를 이용하여 ID Token Signature 검증

aud, iss, exp 등 Claim 검증

email(sub)을 기준으로 사용자 인증 처리

검증 실패 시 401 Unauthorized 반환

5.2 사용자 정보 처리

최초 로그인 시 사용자 계정 정보 저장

사용자 Role/권한 관리 구조 확장성 고려

5.3 인증 보호 미들웨어

모든 보호된 API는 Authorization Bearer Token 필요

미인증 요청은 401 반환

인증 성공 시 request.user 에 사용자 정보 주입

6. 환경 변수

외부/사내 환경 전환 시 아래 값만 변경하여 운영함:

OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=


코드 수정 없이 환경 변수만 교체하면 운영 환경으로 이전 가능

7. 테스트 요구사항

외부 Google 계정으로 로그인 성공 확인

ID Token 검증 정상 동작

인증 필요 API 호출 시 정상 인증

토큰 만료·재로그인 처리 확인

환경 변수를 사내 IDP로 바꿨을 때 동일한 인증 흐름 유지 확인

8. 비기능 요구사항

로그인 과정 오류 발생 시 사용자 안내 메시지 제공

인증 처리 응답 시간 1초 이하 유지

모든 통신은 HTTPS 기반

OIDC 규격 RFC 문서 준수


웹서비스는 동일 구조 유지, 코드 수정 없음
 



 프론트엔드 인증 UI 및 사용자 정보 처리 요구사항
(Google Cloud Identity 기반 OIDC 적용)
1. 개요

인증 기능 추가와 함께, 로그인 후 사용자 경험(UX)을 개선하기 위한
프로필 표시 기능, 프로필 상세 화면, 사용자 정보 토큰 전달 기능을 프론트에 구현한다.
프론트는 백엔드에 요청할 때 항상 사용자 정보를 토큰 형태로 포함하여
백엔드가 사용자 액션을 식별할 수 있도록 한다.

2. 프론트 UI 변경 요구사항
2.1 로그인 후 사용자 프로필 표시

로그인 성공 시 화면 우측 상단에 아래 정보를 표시한다.

원형 프로필 이미지 (Google 계정 프로필 사진)

프로필 이미지 오른쪽에 사용자 이름(Full Name 또는 Display Name)

Hover 시 드롭다운 메뉴 표시(옵션) — 로그아웃, 프로필 보기 등

예시:

(●)  김민수 ▼

2.2 프로필 화면 추가

사용자가 상단 프로필 이미지를 클릭하면 개인 프로필 페이지로 이동한다.

프로필 페이지 구성 요소

큰 프로필 사진 영역

Google Cloud Identity에서 제공하는 profile image URL 사용

사용자 기본 정보

이름(full_name)

이메일(email)

Google 계정 sub(ID)

내가 등록한 작업 리스트(간단 정보)

최근 등록한 작업 수

내가 관리 중인 job 목록 일부

작업 상세로 이동 가능한 링크

로그아웃 버튼

UI 컨셉은 GitHub 프로필 페이지의 축소 버전과 유사하게 구성.

3. 프론트 ↔ 백엔드 전달 요구사항
3.1 모든 API 요청에 사용자 정보 토큰 포함

프론트는 로그인 후 획득한 ID Token 또는 자체 생성한 **UserInfo Token(JWT)**을
모든 API 요청의 Header 에 포함해야 한다.

HTTP 예시:

Authorization: Bearer <user_token>
X-User: <encoded_user_info>

3.2 토큰 구조 요구사항
내부 서비스에서 활용할 수 있는 범위로 아래 정보를 포함하는 것이 권장된다.
필드	설명
sub	Google 고유 사용자 ID (변하지 않음 → DB 키로 적합)
name	사용자 이름
email	사용자 이메일
picture	프로필 이미지 URL
preferred_username	로그인에 사용한 ID
roles(optional)	사용자 권한(User/Admin 등)
dept(optional)	부서 정보(사내 이전 시 필요)
locale(optional)	언어

Google ID Token에는 name, email, picture, sub가 기본 포함되므로,
그대로 사용해도 무방하고 필요하면 프론트에서 JSON 구성 후 JWT화해서 전달 가능.

4. 프론트 내부 처리 요구사항
4.1 토큰 저장 방식

sessionStorage 또는 memory-based store 권장

localStorage는 편하지만 보안 리스크 있음 → 필요 시 보안팀 협의

4.2 토큰 만료 처리

ID Token 만료 시 자동으로 Google re-authentication 수행

만료 직전에 자동 refresh하거나,
만료 후 API 실패(401) 시 로그인 페이지로 redirect 처리

4.3 프로필 정보 로딩

로그인 직후 Google OIDC userinfo endpoint 호출하여 프로필 데이터 확보

또는 ID Token payload에서 직접 파싱

5. 추가 고려사항

프로필 사진 URL 캐싱

네트워크 단절 시 인증 복구 처리

사내 AD 이전 시 OIDC provider만 변경되므로 UI는 동일하게 유지함

사용자 정보(부서, 직책 등)는 사내 AD Sync 후 토큰에 자동 반영 가능함

6. 최종 요약
로그인 후 프론트 변경점

✔ 상단 우측에 프로필 이미지 + 사용자 이름 표시
✔ 클릭 시 프로필 페이지로 이동
✔ 프로필 페이지는 사용자 정보 + 내가 등록한 작업 리스트 노출
✔ 프론트는 백엔드로 보내는 모든 API 요청에 사용자 토큰 추가
✔ 토큰에는 최소 sub, name, email, picture 포함
✔ 권한/부서 같은 확장정보도 향후 포함 가능