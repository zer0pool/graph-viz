# Specification: SSO Migration to Shell MFE

## 1. Goal

Migrate the legacy SSO (OIDC/Google) authentication logic from the legacy `lineage_manager` frontend to the modern Admin Console Shell MFE. This includes supporting Google Login initially and preparing for internal SSO integration with robust logging for remote debugging.

## 2. Legacy Implementation Analysis

### Backend Flow (`lineage_manager`):

- **Config Endpoint**: `GET /api/v1/auth/config` returns OIDC settings (client_id, scopes, endpoints).
- **Exchange Endpoint**: `POST /api/v1/auth/exchange` handles code-to-token swap using PKCE or direct ID token verification.
- **Redirect Handler**: `GET/POST /authorized` handles the callback from OIDC providers.

### Frontend Flow (`auth.js`):

1. **Init**: Fetches config, restores session from `sessionStorage`.
2. **Login**: Generates PKCE verifier/challenge, redirects to provider.
3. **Callback**: Handles `code` in URL or `window.formData`, calls exchange API.
4. **Session**: Stores `lm.tokens` and `lm.user` in `sessionStorage`.
5. **App Interaction**: Attaches `Authorization: Bearer <token>` to all API requests via `fetchWithAuth`.

## 3. Proposed Architecture in Shell

### AuthContext Refactor

- Centralize state management for `user` and `tokens`.
- Support PKCE flow natively in React.
- Provide a robust `fetchWithAuth` wrapper for all MFEs.

### Logging Requirements

Since the internal environment is isolated, logs must be comprehensive:

- **DEBUG**: PKCE state generation, redirect URL construction.
- **INFO**: Redirect handler detection, token exchange start/success.
- **ERROR**: State mismatch, network failures, 401/403 responses.

### Interaction with MFEs

- The Shell will pass the `auth` client (containing `getToken` and `fetchWithAuth`) to all remotes via `mountProps`.

## 4. Documentation Strategy

- **Specs**: This document (`docs/specs/SSO_MIGRATION_SPEC.md`).
- **Progress/Reports**: `docs/report/SSO_MIGRATION_PROGRESS.md` (updated after each phase).
