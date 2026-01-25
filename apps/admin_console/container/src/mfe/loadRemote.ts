// 🔹 Types & Constants
type InternalScriptElement = HTMLScriptElement & {
  dataset: { status: string };
};
const TIMEOUT_MS = 10000;
const POLL_INTERVAL_MS = 100;

/**
 * Dynamically loads a Webpack Remote module and initializes its container.
 */
export const loadRemote = (scope: string, url: string): Promise<any> => {
  return new Promise<any>((resolve, reject) => {
    const existingScript = document.getElementById(
      `remote-script-${scope}`,
    ) as InternalScriptElement;

    // 1. Resolve logic: Extract from window and initialize if needed
    const tryGetContainer = () => {
      // @ts-ignore
      const container = window[scope];
      if (!container) return null;

      // @ts-ignore
      if (!container.__initialized) {
        try {
          // @ts-ignore
          container.init(__webpack_share_scopes__.default);
          // @ts-ignore
          container.__initialized = true;
        } catch (e) {
          console.error(`[Shell:loadRemote] Failed to init ${scope}:`, e);
        }
      }
      return container;
    };

    // 2. Immediate resolution if already available
    const availableContainer = tryGetContainer();
    if (availableContainer) {
      return resolve(availableContainer);
    }

    // 3. Helper: Watch an already-loading script for completion
    const waitForGlobal = () => {
      let elapsed = 0;
      const interval = setInterval(() => {
        const container = tryGetContainer();
        if (container) {
          clearInterval(interval);
          resolve(container);
        } else if (elapsed >= TIMEOUT_MS) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for global '${scope}' (${url})`));
        }
        elapsed += POLL_INTERVAL_MS;
      }, POLL_INTERVAL_MS);
    };

    // 4. Handle Existing Script
    if (existingScript) {
      if (existingScript.dataset.status === "failed") {
        console.warn(`[Shell:loadRemote] retrying failed load for ${scope}`);
        existingScript.remove();
      } else {
        return waitForGlobal();
      }
    }

    // 5. Inject New Script
    const script = document.createElement("script") as InternalScriptElement;
    script.src = url;
    script.id = `remote-script-${scope}`;
    script.async = true;
    script.dataset.status = "loading";

    script.onload = () => {
      script.dataset.status = "loaded";
      const container = tryGetContainer();
      container
        ? resolve(container)
        : reject(new Error(`Global '${scope}' missing after load from ${url}`));
    };

    script.onerror = () => {
      script.dataset.status = "failed";
      reject(new Error(`Failed to load script: ${url}`));
    };

    document.head.appendChild(script);
  });
};
