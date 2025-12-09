import { ApiClient } from "./app/services/api.js";

(function () {
  // Create API client instance
  let api = null;
  const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp";
  const AVATAR_COLORS = [
    "#2563EB",
    "#7C3AED",
    "#059669",
    "#DC2626",
    "#EA580C",
    "#2563EB",
    "#6B7280",
    "#0891B2",
  ];
  const TOKEN_KEY = "lm.tokens";
  const USER_KEY = "lm.user";
  const VERIFIER_KEY = "lm.pkce_verifier";
  const STATE_KEY = "lm.pkce_state";

  function base64Url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64Url(digest);
  }

  function randomString(length = 64) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const values = crypto.getRandomValues(new Uint8Array(length));
    let result = "";
    for (let i = 0; i < values.length; i += 1) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }

  function getInitials(name) {
    if (!name || typeof name !== "string") return "?";
    const cleaned = name.replace(/[\s_-]+/g, " ").trim();
    if (!cleaned) return "?";
    const parts = cleaned.split(" ").filter(Boolean);
    const first = parts[0] || "";
    const second = parts[1] || "";
    const initials =
      (first[0] || "").toUpperCase() +
      ((second[0] || first[1] || "").toUpperCase());
    return initials || "?";
  }

  function pickColor(seed) {
    if (!seed) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0; // force 32-bit int
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function generateInitialsAvatar(name, size = 96) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const initials = getInitials(name);
    const bg = pickColor(name || initials);

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(size * 0.45)}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, size / 2, size / 2);

    return canvas.toDataURL("image/png");
  }

  class AuthClient {
    constructor(apiClient) {
      this.config = null;
      this.tokens = null;
      this.user = null;
      this.profileCache = null;
      this.profileError = null;
      this.requireAuth = true;
      this.apiClient = apiClient;
      this.ready = this.initialize();
    }

    async initialize() {
      try {
        this.config = await this.fetchConfig();
        this.requireAuth = !(this.config?.require_authentication === false);
        await this.handleRedirect();
        this.restoreSession();
        this.bindUI();
        if (this.isAuthenticated()) {
          await this.preloadProfile();
        }
      } catch (err) {
        console.error("Auth init failed", err);
      }
      this.updateUI();
      document.dispatchEvent(
        new CustomEvent("auth:state-changed", {
          detail: { authenticated: this.isAuthenticated(), user: this.user },
        })
      );
    }

    async fetchConfig() {
      console.debug("[Auth] Fetching OIDC config from backend");
      const data = await this.apiClient.fetchConfig();
      console.debug(
        `[Auth] Config loaded (requireAuth=${String(data?.require_authentication)})`
      );
      return data;
    }

    restoreSession() {
      try {
        const storedTokens = sessionStorage.getItem(TOKEN_KEY);
        if (storedTokens) this.tokens = JSON.parse(storedTokens);
        const storedUser = sessionStorage.getItem(USER_KEY);
        if (storedUser) this.user = JSON.parse(storedUser);
      } catch (_) {
        this.tokens = null;
        this.user = null;
      }
    }

    async preloadProfile() {
      try {
        await this.fetchProfile({ silent: true, force: true });
      } catch (err) {
        console.warn("[Auth] Profile preload failed", err);
      }
    }

    async handleRedirect() {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("code")) return;
      console.info("[Auth] Handling OIDC redirect callback");

      const code = params.get("code");
      const returnedState = params.get("state");
      const storedState = sessionStorage.getItem(STATE_KEY);

      if (storedState && returnedState && storedState !== returnedState) {
        throw new Error("Invalid OIDC state");
      }

      const verifier = sessionStorage.getItem(VERIFIER_KEY);

      if (!verifier) {
        console.error("PKCE verifier missing – cannot exchange token");
        return;
      }

      await this.exchangeAuthorizationCode(code, verifier);

      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);

      params.delete("code");
      params.delete("state");
      const newQuery = params.toString();
      const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}`;
      window.history.replaceState({}, document.title, newUrl);
    }

    async exchangeAuthorizationCode(code, verifier) {
      console.info(
        `[Auth] Exchanging authorization code (state=${sessionStorage.getItem(STATE_KEY)})`
      );
      const data = await this.apiClient.exchangeAuthorizationCode(code, verifier);
      this.storeSession(data);
    }

    storeSession(data) {
      console.debug(
        `[Auth] Storing session (expires_in=${data?.expires_in}, has_user=${Boolean(data?.user)})`
      );
      this.tokens = {
        access_token: data.access_token,
        id_token: data.id_token,
        token_type: data.token_type,
        scope: data.scope,
        refresh_token: data.refresh_token,
        expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      };
      this.user = data.user || null;
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(this.tokens));
      if (this.user) sessionStorage.setItem(USER_KEY, JSON.stringify(this.user));
      this.profileCache = null;
      this.updateUI();
      document.dispatchEvent(
        new CustomEvent("auth:state-changed", {
          detail: { authenticated: this.isAuthenticated(), user: this.user },
        })
      );
    }

    isAuthenticated() {
      if (!this.requireAuth) return true;
      if (!this.tokens) return false;
      if (!this.tokens.expires_at) return true;
      return this.tokens.expires_at > Date.now() - 5000;
    }

    ensureAuthenticated() {
      if (!this.requireAuth) return;
      if (!this.isAuthenticated()) {
        throw new Error("AUTH_REQUIRED");
      }
    }

    getIdToken() {
      return this.tokens?.id_token || null;
    }

    async fetchWithAuth(input, init = {}) {
      const headers = new Headers(init.headers || {});
      if (this.requireAuth) {
        this.ensureAuthenticated();
        headers.set("Authorization", `Bearer ${this.tokens.id_token}`);
        if (this.user) {
          try {
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(this.user))));
            headers.set("X-User", encoded);
          } catch (_) {
            // ignore encoding errors
          }
        }
      }
      console.debug(`[Auth] fetchWithAuth ${init.method || "GET"} ${input}`);
      const response = await fetch(input, { ...init, headers });
      console.debug(`[Auth] Response ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        this.logout();
        throw new Error("AUTH_EXPIRED");
      }
      return response;
    }

    async startLogin() {
      if (!this.config) return;
      const verifier = randomString(64);
      const challenge = await sha256(verifier);
      const state = randomString(32);
      sessionStorage.setItem(VERIFIER_KEY, verifier);
      sessionStorage.setItem(STATE_KEY, state);

      const authUrl = new URL(this.config.authorization_endpoint);
      authUrl.searchParams.set("client_id", this.config.client_id);
      authUrl.searchParams.set("redirect_uri", this.config.redirect_uri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", this.config.scope);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      window.location.assign(authUrl.toString());
    }

    logout(silent = false) {
      this.tokens = null;
      this.user = null;
      this.profileCache = null;
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
      if (!silent) {
        document.dispatchEvent(
          new CustomEvent("auth:state-changed", {
            detail: { authenticated: false, user: null },
          })
        );
      }
      this.updateUI();
    }

    bindUI() {
      const loginBtn = document.getElementById("login-btn");
      const logoutBtn = document.getElementById("logout-btn");
      const chip = document.getElementById("user-chip");
      const profileClose = document.getElementById("profile-close");
      const profileRetry = document.getElementById("profile-retry");

      loginBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        this.startLogin();
      });
      logoutBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
      chip?.addEventListener("click", async () => {
        try {
          await this.showProfile();
        } catch (err) {
          console.error(err);
        }
      });
      profileRetry?.addEventListener("click", () => this.showProfile(true));
      profileClose?.addEventListener("click", () => this.hideProfile());
      const overlay = document.getElementById("profile-panel");
      overlay?.addEventListener("click", (evt) => {
        if (evt.target === overlay) this.hideProfile();
      });
    }

    applyProfileData(profile) {
      if (!profile?.user) return;
      this.user = { ...(this.user || {}), ...profile.user };
      sessionStorage.setItem(USER_KEY, JSON.stringify(this.user));
      this.updateUI();
    }

    getAvatarUrl(user, size = 96) {
      if (user?.picture) return user.picture;
      const name = user?.name || user?.email || user?.sub || "";
      return generateInitialsAvatar(name, size);
    }

    updateUI() {
      const loginBtn = document.getElementById("login-btn");
      const chip = document.getElementById("user-chip");
      const nameEl = document.getElementById("user-chip-name");
      const avatarEl = document.getElementById("user-avatar");

      const authed = this.isAuthenticated();
      if (loginBtn) loginBtn.hidden = authed || !this.requireAuth;
      if (chip) chip.hidden = !authed || !this.requireAuth;
      if (authed && this.user) {
        nameEl && (nameEl.textContent = this.user.name || this.user.email || this.user.sub);
        if (avatarEl) {
          avatarEl.src = this.getAvatarUrl(this.user, 64);
        }
      } else if (avatarEl) {
        avatarEl.src = DEFAULT_AVATAR;
      }
    }

    toggleProfileView({ loading = false, error = false } = {}) {
      const loadingEl = document.getElementById("profile-loading");
      const errorEl = document.getElementById("profile-error");
      const contentEl = document.getElementById("profile-content");
      if (loadingEl) loadingEl.hidden = !loading;
      if (errorEl) errorEl.hidden = !error;
      if (contentEl) contentEl.hidden = loading || error;
    }

    showProfileContent() {
      this.toggleProfileView({ loading: false, error: false });
    }

    showProfileLoading() {
      this.toggleProfileView({ loading: true, error: false });
    }

    setProfileErrorMessage(err) {
      const errorEl = document.getElementById("profile-error-message");
      const fallback = "We couldn't load your profile. Please try again.";
      if (!errorEl) return;
      const text = err?.message || err?.statusText || fallback;
      errorEl.textContent = text;
    }

    showProfileError(err) {
      this.setProfileErrorMessage(err);
      this.toggleProfileView({ loading: false, error: true });
    }

    renderProfile(profile) {
      const panel = document.getElementById("profile-panel");
      const jobsList = document.getElementById("profile-job-list");
      const jobCount = document.getElementById("profile-job-count");
      const nameEl = document.getElementById("profile-name");
      const emailEl = document.getElementById("profile-email");
      const photoEl = document.getElementById("profile-photo");

      if (!profile) return;
      const { user, jobs } = profile;
      nameEl &&
        (nameEl.textContent =
          user.name || user.preferred_username || user.email || "Unknown User");
      emailEl && (emailEl.textContent = user.email || "");
      if (photoEl) {
        photoEl.src = this.getAvatarUrl(user);
      }
      if (jobCount) jobCount.textContent = `${profile.jobs_count} recent jobs`;
      if (jobsList) {
        jobsList.innerHTML = "";
        if (jobs.length === 0) {
          jobsList.innerHTML = '<li class="empty">No jobs registered yet.</li>';
        } else {
          jobs.forEach((job) => {
            const li = document.createElement("li");
            li.innerHTML = `<div class="job-title">${job.name || job.job_id}</div>
              <div class="job-meta">${job.job_id}${job.updated_at ? ` • ${new Date(job.updated_at).toLocaleString()}` : ""}</div>`;
            jobsList.appendChild(li);
          });
        }
      }
      if (panel) panel.hidden = false;
    }

    async showProfile(forceRefresh = false) {
      if (this.requireAuth) this.ensureAuthenticated();
      const panel = document.getElementById("profile-panel");
      if (panel) panel.hidden = false;
      this.showProfileLoading();
      try {
        const profile = await this.fetchProfile({ force: forceRefresh });
        this.renderProfile(profile);
        this.showProfileContent();
      } catch (err) {
        console.error(err);
        this.showProfileError(err);
      }
    }

    hideProfile() {
      const panel = document.getElementById("profile-panel");
      if (panel) panel.hidden = true;
      this.showProfileContent();
    }

    async fetchProfile({ force = false, silent = false } = {}) {
      if (
        !force &&
        this.profileCache &&
        Date.now() - this.profileCache.fetchedAt < 60_000
      ) {
        return this.profileCache.data;
      }
      if (this.requireAuth) this.ensureAuthenticated();
      console.debug("[Auth] Fetching profile");
      try {
        const data = await this.apiClient.fetchProfile();
        console.debug(`[Auth] Profile fetched for ${data?.user?.sub}`);
        this.profileCache = { data, fetchedAt: Date.now() };
        this.profileError = null;
        this.applyProfileData(data);
        return data;
      } catch (err) {
        this.profileError = err;
        if (silent) {
          console.warn("[Auth] Profile fetch failed", err);
          return null;
        }
        throw err;
      }
    }
  }

  // Initialize API client with a temporary auth client
  const tempAuthClient = {
    fetchWithAuth: async (input, init = {}) => {
      return fetch(input, init);
    }
  };

  const apiClient = new ApiClient(tempAuthClient);
  const authClient = new AuthClient(apiClient);

  // Update the API client with the real auth client
  apiClient.authClient = authClient;

  window.authClient = authClient;
  window.authReady = authClient.ready;
})();
