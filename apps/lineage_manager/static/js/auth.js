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
  const DEFAULT_ORGANIZATION = "Lineage Manager";

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
    const cleaned = name
      .replace(/[^A-Za-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "?";
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (
        (parts[0][0] || "").toUpperCase() +
        (parts[parts.length - 1][0] || "").toUpperCase()
      );
    }
    const single = parts[0] || "";
    const letters = single.replace(/[^A-Za-z0-9]/g, "");
    if (letters.length >= 2) {
      return (letters[0] + letters[1]).toUpperCase();
    }
    return (letters[0] || "?").toUpperCase();
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
      this.requireSignin = false;
      this.apiClient = apiClient;
      this.ready = this.initialize();
    }

    async initialize() {
      try {
        this.config = await this.fetchConfig();
        this.requireSignin = this.config?.require_signin === true;
        await this.handleRedirect();
        this.restoreSession();
        this.bindUI();
        if (this.isAuthenticated()) {
          await this.preloadProfile();
        } else if (this.requireSignin) {
          const params = new URLSearchParams(window.location.search);
          const hasCode =
            params.has("code") || (window.formData && window.formData.has("code"));

          if (hasCode) {
            // Let handleRedirect process it
          } else {
            // Do not auto-redirect in open mode, just logging
            console.info("[Auth] Public mode with optional sign-in");
          }
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
        `[Auth] Config loaded (requireAuth=${String(data?.require_signin)})`
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
      let code = params.get("code");
      let returnedState = params.get("state");

      // Check for POST form data if URL params are missing
      if (!code && window.formData && window.formData.has("code")) {
        code = window.formData.get("code");
        returnedState = window.formData.get("state");
      }

      if (!code) return;
      console.info("[Auth] Handling OIDC redirect callback");

      const storedState = sessionStorage.getItem(STATE_KEY);

      if (storedState && returnedState && storedState !== returnedState) {
        throw new Error("Invalid OIDC state");
      }

      const verifier = sessionStorage.getItem(VERIFIER_KEY);

      if (!verifier) {
        console.error("PKCE verifier missing – cannot exchange token");
        return;
      }

      try {
        await this.exchangeAuthorizationCode(code, verifier);
      } catch (err) {
        console.error("[Auth] Exchange failed, clearing code to prevent loop:", err);
        // We suppress the error here so that the app can continue as unauthenticated
      } finally {
        sessionStorage.removeItem(VERIFIER_KEY);
        sessionStorage.removeItem(STATE_KEY);

        if (params.has("code")) {
          params.delete("code");
          params.delete("state");
          const newQuery = params.toString();
          const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}`;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
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
      // Check token validity regardless of requireSignin flag
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
      const headers = new Headers(init.headers || {});

      // Attach token if available, but do NOT block if missing (Open Frontend)
      if (this.isAuthenticated()) {
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


      // Admin Tools Bindings
      const initializeBtn = document.getElementById("admin-initialize-graph");
      initializeBtn?.addEventListener("click", async () => {
        if (!confirm("Initialize graph from Job Manager?\n\nThis will fetch all jobs and rebuild the lineage graph.")) {
          return;
        }

        try {
          // Disable button while processing
          initializeBtn.disabled = true;
          initializeBtn.textContent = "Initializing...";

          const result = await this.apiClient.initializeGraph();

          alert(`Graph initialized successfully!\n\nJobs fetched: ${result.jobs_fetched}\nNodes created: ${result.total_nodes_created}\nEdges created: ${result.edges_created}`);
          window.location.reload();
        } catch (err) {
          console.error("Initialize failed", err);
          alert(`Failed to initialize graph: ${err.message}`);
          initializeBtn.textContent = "Initialize Graph"; // Restore text
          initializeBtn.disabled = false;
        }
      });
    }

    applyProfileData(profile) {
      if (!profile?.user) return;
      this.user = { ...(this.user || {}), ...profile.user };
      sessionStorage.setItem(USER_KEY, JSON.stringify(this.user));
      this.updateUI();
    }

    getAvatarUrl(user, size = 96) {
      const name = user?.name || user?.email || user?.sub || "";
      return generateInitialsAvatar(name, size);
    }

    updateUI() {
      const loginBtn = document.getElementById("login-btn");
      const chip = document.getElementById("user-chip");
      const nameEl = document.getElementById("user-chip-name");
      const avatarEl = document.getElementById("user-avatar");

      const authed = this.isAuthenticated();
      // Optional Sign-in: Show login button if not authenticated
      if (loginBtn) loginBtn.hidden = authed;

      // Chip: Visible if authenticated OR in anonymous mode (requireSignin=false)
      if (chip) chip.hidden = !authed && this.requireSignin;

      if (authed && this.user) {
        nameEl && (nameEl.textContent = this.user.name || this.user.email || this.user.sub);
        if (avatarEl) {
          avatarEl.src = this.getAvatarUrl(this.user, 64);
        }
      } else if (!authed && !this.requireSignin) {
        // Anonymous User
        nameEl && (nameEl.textContent = "Anonymous");
        if (avatarEl) {
          avatarEl.src = this.getAvatarUrl({ name: "Anonymous" }, 64);
        }
      } else if (avatarEl) {
        avatarEl.src = DEFAULT_AVATAR;
      }
    }

    toggleProfileView({ loading = false } = {}) {
      const loadingEl = document.getElementById("profile-loading");
      const contentEl = document.getElementById("profile-content");
      if (loadingEl) loadingEl.hidden = !loading;
      if (contentEl) contentEl.hidden = loading;
    }

    showProfileContent() {
      this.toggleProfileView({ loading: false });
    }

    showProfileLoading() {
      this.toggleProfileView({ loading: true });
    }

    renderProfile(profile) {
      console.info("[Auth] Profile payload:", profile);
      const panel = document.getElementById("profile-panel");
      const nameEl = document.getElementById("profile-name");
      const emailEl = document.getElementById("profile-email");
      const photoEl = document.getElementById("profile-photo");
      const orgEl = document.getElementById("profile-organization");
      const subEl = document.getElementById("profile-sub");

      if (!profile) return;
      const { user, jobs } = profile;
      nameEl &&
        (nameEl.textContent =
          user.name || user.preferred_username || user.email || "User");
      emailEl && (emailEl.textContent = user.email || "");
      const organizationValue = user.organization || DEFAULT_ORGANIZATION;
      orgEl && (orgEl.textContent = `Organization: ${organizationValue}`);
      subEl && (subEl.textContent = user.sub ? `Identifier: ${user.sub}` : "");
      if (photoEl) {
        photoEl.src = this.getAvatarUrl(user);
      }
      if (panel) panel.hidden = false;
      this.populateProfileAttributes(user);

      // Show Admin Tools if user has 'Admin' role
      const adminSection = document.getElementById("profile-admin-section");
      if (adminSection) {
        console.log("[Auth] Checking admin status - user.roles:", user.roles);
        const isAdmin = Array.isArray(user.roles) && user.roles.includes("Admin");
        console.log("[Auth] isAdmin:", isAdmin, "adminSection.hidden will be:", !isAdmin);
        adminSection.hidden = !isAdmin;
      }
    }

    populateProfileAttributes(user = {}) {
      const box = document.getElementById("profile-attribute-box");
      const list = document.getElementById("profile-attribute-list");
      if (!box || !list) return;
      const entries = [
        ["Username", user.preferred_username],
        ["Organization", user.organization || DEFAULT_ORGANIZATION],
        ["Department", user.dept],
        [
          "Roles",
          Array.isArray(user.roles) && user.roles.length
            ? user.roles.join(", ")
            : user.roles || null,
        ],
        ["Locale", user.locale],
        [
          "Last login",
          user.last_login_at ? new Date(user.last_login_at).toLocaleString() : null,
        ],
      ]
        .filter(([_, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => ({ label, value }));

      list.innerHTML = entries
        .map(
          (entry) => `
            <li class="profile-attribute-item">
              <strong>${entry.label}</strong>
              <span>${entry.value}</span>
            </li>`
        )
        .join("");
      box.hidden = entries.length === 0;
    }

    async showProfile(forceRefresh = false) {
      // If we are not authenticated, we can't show the real profile.
      if (!this.isAuthenticated()) {
        if (!this.requireSignin) {
          // Show Dummy Profile for Anonymous User
          const dummyProfile = {
            user: {
              name: "Anonymous User",
              first_name: "Anonymous",
              last_name: "User",
              email: "anonymous@lineage.manager",
              preferred_username: "anonymous",
              organization: "Public Access",
              dept: "Guest Interaction",
              roles: ["Viewer", "Guest"],
              sub: "anonymous-session",
              locale: navigator.language
            }
          };
          this.renderProfile(dummyProfile);
          this.showProfileContent();

          const panel = document.getElementById("profile-panel");
          if (panel) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add("is-visible"));
          }
          return;
        }
        console.warn("[Auth] Cannot show profile: User not authenticated.");
        return;
      }
      this.ensureAuthenticated();
      const panel = document.getElementById("profile-panel");
      if (panel) {
        panel.hidden = false;
        requestAnimationFrame(() => panel.classList.add("is-visible"));
      }
      this.showProfileLoading();
      try {
        const profile = await this.fetchProfile({ force: forceRefresh });
        this.renderProfile(profile);
        this.showProfileContent();
      } catch (err) {
        console.error(err);
        this.hideProfile();
      }
    }

    hideProfile() {
      const panel = document.getElementById("profile-panel");
      if (panel) {
        panel.classList.remove("is-visible");
        panel.hidden = true;
      }
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
      this.ensureAuthenticated();
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
