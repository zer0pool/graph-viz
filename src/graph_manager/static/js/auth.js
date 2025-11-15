(function () {
  const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp";
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

  class AuthClient {
    constructor() {
      this.config = null;
      this.tokens = null;
      this.user = null;
      this.profileCache = null;
      this.ready = this.initialize();
    }

    async initialize() {
      try {
        this.config = await this.fetchConfig();
        await this.handleRedirect();
        this.restoreSession();
        this.bindUI();
      } catch (err) {
        console.error("Auth init failed", err);
      }
      this.updateUI();
    }

    async fetchConfig() {
      const res = await fetch("/api/v1/auth/config");
      if (!res.ok) throw new Error("Failed to load auth config");
      return res.json();
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

    async handleRedirect() {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("code")) return;
      const code = params.get("code");
      const returnedState = params.get("state");
      const storedState = sessionStorage.getItem(STATE_KEY);
      if (storedState && returnedState && storedState !== returnedState) {
        throw new Error("Invalid OIDC state");
      }
      const verifier = sessionStorage.getItem(VERIFIER_KEY);
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
      const res = await fetch("/api/v1/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: verifier }),
      });
      if (!res.ok) {
        throw new Error("Failed to exchange authorization code");
      }
      const data = await res.json();
      this.storeSession(data);
    }

    storeSession(data) {
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
      if (!this.tokens) return false;
      if (!this.tokens.expires_at) return true;
      return this.tokens.expires_at > Date.now() - 5000;
    }

    ensureAuthenticated() {
      if (!this.isAuthenticated()) {
        throw new Error("AUTH_REQUIRED");
      }
    }

    getIdToken() {
      return this.tokens?.id_token || null;
    }

    async fetchWithAuth(input, init = {}) {
      this.ensureAuthenticated();
      const headers = new Headers(init.headers || {});
      headers.set("Authorization", `Bearer ${this.tokens.id_token}`);
      if (this.user) {
        try {
          const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(this.user))));
          headers.set("X-User", encoded);
        } catch (_) {
          // ignore encoding errors
        }
      }
      const response = await fetch(input, { ...init, headers });
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
      profileClose?.addEventListener("click", () => this.hideProfile());
      const overlay = document.getElementById("profile-panel");
      overlay?.addEventListener("click", (evt) => {
        if (evt.target === overlay) this.hideProfile();
      });
    }

    updateUI() {
      const loginBtn = document.getElementById("login-btn");
      const chip = document.getElementById("user-chip");
      const nameEl = document.getElementById("user-chip-name");
      const avatarEl = document.getElementById("user-avatar");

      const authed = this.isAuthenticated();
      if (loginBtn) loginBtn.hidden = authed;
      if (chip) chip.hidden = !authed;
      if (authed && this.user) {
        nameEl && (nameEl.textContent = this.user.name || this.user.email || this.user.sub);
        if (avatarEl) {
          avatarEl.src = this.user.picture || DEFAULT_AVATAR;
        }
      }
    }

    async showProfile() {
      this.ensureAuthenticated();
      const panel = document.getElementById("profile-panel");
      const jobsList = document.getElementById("profile-job-list");
      const jobCount = document.getElementById("profile-job-count");
      const nameEl = document.getElementById("profile-name");
      const emailEl = document.getElementById("profile-email");
      const photoEl = document.getElementById("profile-photo");

      const profile = await this.fetchProfile();
      if (!profile) return;
      const { user, jobs } = profile;
      nameEl && (nameEl.textContent = user.name || user.preferred_username || user.email || "Unknown User");
      emailEl && (emailEl.textContent = user.email || "");
      if (photoEl) {
        photoEl.src = user.picture || DEFAULT_AVATAR;
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

    hideProfile() {
      const panel = document.getElementById("profile-panel");
      if (panel) panel.hidden = true;
    }

    async fetchProfile() {
      if (this.profileCache && Date.now() - this.profileCache.fetchedAt < 60_000) {
        return this.profileCache.data;
      }
      const res = await this.fetchWithAuth("/api/v1/users/me");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      this.profileCache = { data, fetchedAt: Date.now() };
      return data;
    }
  }

  window.authClient = new AuthClient();
  window.authReady = window.authClient.ready;
})();
