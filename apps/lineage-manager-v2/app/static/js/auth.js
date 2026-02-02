import { ApiClient } from "./app/services/api.js";

(function () {
  const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp";
  const AVATAR_COLORS = [
    "#2563EB", "#7C3AED", "#059669", "#DC2626",
    "#EA580C", "#2563EB", "#6B7280", "#0891B2",
  ];

  function getInitials(name) {
    if (!name || typeof name !== "string") return "?";
    const cleaned = name.replace(/[^A-Za-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return "?";
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] || "").toUpperCase() + (parts[parts.length - 1][0] || "").toUpperCase();
    const letters = parts[0].replace(/[^A-Za-z0-9]/g, "");
    return letters.length >= 2 ? (letters[0] + letters[1]).toUpperCase() : (letters[0] || "?").toUpperCase();
  }

  function pickColor(seed) {
    if (!seed) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function generateInitialsAvatar(name, size = 96) {
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const initials = getInitials(name);
    const bg = pickColor(name || initials);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(size * 0.45)}px "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(initials, size / 2, size / 2);
    return canvas.toDataURL("image/png");
  }

  class AuthClient {
    constructor(apiClient) {
      this.user = null;
      this.profileCache = null;
      this.apiClient = apiClient;
      this.ready = this.initialize();
    }

    async initialize() {
      console.info("[Auth] Initializing AuthClient (BFF)...");
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          this.user = await res.json();
          console.info("[Auth] Session active:", this.user.sub);
        } else {
          console.info("[Auth] No active session found.");
        }
      } catch (err) {
        console.error("[Auth] Initial session check failed", err);
      }
      this.bindUI();
      this.updateUI();
      this.dispatchStateChange();
    }

    dispatchStateChange() {
      document.dispatchEvent(new CustomEvent("auth:state-changed", {
        detail: { authenticated: this.isAuthenticated(), user: this.user },
      }));
    }

    isAuthenticated() {
      return !!this.user && !this.user.is_anonymous;
    }

    async fetchWithAuth(input, init = {}) {
      console.debug(`[Auth] fetch (BFF mode) ${init.method || "GET"} ${input}`);
      const response = await fetch(input, init);
      if (response.status === 401) {
        console.warn("[Auth] 401 Unauthorized. Clearing local state.");
        this.user = null;
        this.updateUI();
        this.dispatchStateChange();
      }
      return response;
    }

    startLogin() {
      console.info("[Auth] Redirecting to BFF Login...");
      window.location.assign("/api/v1/auth/login");
    }

    async logout() {
      console.info("[Auth] Logging out (BFF)...");
      try {
        await fetch("/api/v1/auth/logout", { method: "POST" });
      } catch (err) {
        console.error("[Auth] Logout failed", err);
      } finally {
        this.user = null;
        this.updateUI();
        this.dispatchStateChange();
        window.location.reload();
      }
    }

    bindUI() {
      document.getElementById("login-btn")?.addEventListener("click", e => { e.preventDefault(); this.startLogin(); });
      document.getElementById("logout-btn")?.addEventListener("click", e => { e.preventDefault(); this.logout(); });
      document.getElementById("user-chip")?.addEventListener("click", () => this.showProfile());
      document.getElementById("profile-close")?.addEventListener("click", () => this.hideProfile());
      const overlay = document.getElementById("profile-panel");
      overlay?.addEventListener("click", (evt) => { if (evt.target === overlay) this.hideProfile(); });
    }

    updateUI() {
      const loginBtn = document.getElementById("login-btn");
      const chip = document.getElementById("user-chip");
      const nameEl = document.getElementById("user-chip-name");
      const avatarEl = document.getElementById("user-avatar");

      const authed = this.isAuthenticated();
      if (loginBtn) loginBtn.hidden = authed;
      if (chip) chip.hidden = false; // Always show even for anonymous if backend allows

      if (authed && this.user) {
        if (nameEl) nameEl.textContent = this.user.name || this.user.email || this.user.sub;
        if (avatarEl) avatarEl.src = generateInitialsAvatar(this.user.name || this.user.email || "User", 64);
      } else {
        if (nameEl) nameEl.textContent = "Anonymous";
        if (avatarEl) avatarEl.src = generateInitialsAvatar("Anonymous", 64);
      }
    }

    async showProfile() {
      const panel = document.getElementById("profile-panel");
      if (!panel) return;
      
      const nameEl = document.getElementById("profile-name");
      const photoEl = document.getElementById("profile-photo");
      const attrList = document.getElementById("profile-attribute-list");
      const attrBox = document.getElementById("profile-attribute-box");

      const displayUser = this.user || { name: "Anonymous User", sub: "anonymous", dept: "Guest", roles: ["Viewer"] };
      
      if (nameEl) nameEl.textContent = displayUser.name || displayUser.email || displayUser.sub;
      if (photoEl) photoEl.src = generateInitialsAvatar(nameEl.textContent, 96);
      
      if (attrList) {
        const attrs = [
          ["ID", displayUser.sub],
          ["Department", displayUser.dept],
          ["Roles", Array.isArray(displayUser.roles) ? displayUser.roles.join(", ") : displayUser.roles]
        ].filter(a => a[1]);
        attrList.innerHTML = attrs.map(a => `<li class="profile-attribute-item"><strong>${a[0]}</strong><span>${a[1]}</span></li>`).join("");
        if (attrBox) attrBox.hidden = attrs.length === 0;
      }

      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("is-visible"));
    }

    hideProfile() {
      const panel = document.getElementById("profile-panel");
      if (panel) {
        panel.classList.remove("is-visible");
        panel.hidden = true;
      }
    }
  }

  const apiClient = new ApiClient(null);
  const authClient = new AuthClient(apiClient);
  apiClient.authClient = authClient;
  window.authClient = authClient;
  window.authReady = authClient.ready;
})();
