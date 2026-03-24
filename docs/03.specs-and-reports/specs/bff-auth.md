# Specification: BFF Authentication for Lineage Platform

## 1. Overview
Transition the current Frontend-first authentication flow to a **Backend-first (BFF - Backend For Frontend)** pattern. This enhances security by hiding OAuth tokens from the browser and using Secure, HttpOnly cookies for session management.

## 2. Goals
- Eliminate sensitive tokens (`access_token`, `id_token`) from browser storage (`sessionStorage`/`localStorage`).
- Implement server-side OIDC State and PKCE Verifier management.
- Provide a unified session across all Micro Frontends (MFE) via a shared domain cookie.

## 3. Technical Design

### A. Backend (FastAPI)
1. **Session Management**: 
   - Use a signed session cookie. 
   - Store the `access_token` and `user_info` in the server-side session.
2. **New/Updated Endpoints**:
   - `GET /api/v1/auth/login`: Generates OIDC auth URL, stores PKCE verifier in session, and redirects user to IdP.
   - `GET /api/v1/auth/callback`: Handles IdP callback, exchanges code for tokens, saves tokens in session, and redirects back to the frontend.
   - `GET /api/v1/auth/me`: Returns current user info from the session.
   - `POST /api/v1/auth/logout`: Clears the session cookie.
3. **Authentication Guard**:
   - Update `require_authenticated_user` to check the session cookie instead of the `Authorization` header.

### B. Frontend (Lineage Shell MFE)
1. **AuthContext Update**:
   - On initialization, call `/api/v1/auth/me` to check authentication status.
   - Update `login` and `logout` to use the new backend endpoints.
2. **API Client**:
   - Remove `Authorization: Bearer` header logic.
   - Rely on browser's automatic cookie handling for same-domain requests.

### C. Infrastructure (Nginx)
- Ensure the Shell and Backend share the same domain (already true in current `nginx.conf.template`).
- Verify `proxy_set_header Cookie $http_cookie;` is correctly handled if necessary.

## 4. Implementation Steps
1. **Backend**: Add `SessionMiddleware` to FastAPI.
2. **Backend**: Implement BFF login/callback/logout logic in `auth.py`.
3. **Backend**: Update security dependency to use session cookies.
4. **Frontend**: Refactor `AuthContext.tsx` and `ApiClient.js`.
5. **Infrastructure**: Adjust `nginx.conf` and environment variables.

## 5. Verification Plan
- **Manual**: Test login flow in browser, verify no tokens in `sessionStorage`.
- **Automated**: Add unit tests for `auth.py` BFF endpoints.
