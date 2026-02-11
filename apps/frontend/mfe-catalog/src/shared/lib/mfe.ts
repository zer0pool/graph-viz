// This function dynamically loads a remote module
export const loadRemote = (scope: string, url: string) => {
  return new Promise<any>((resolve, reject) => {
    const existingScript = document.getElementById(`remote-script-${scope}`);

    const resolveContainer = () => {
      // @ts-ignore
      const container = window[scope];
      if (container) {
        // @ts-ignore
        if (!container.__initialized) {
          try {
            // @ts-ignore
            container.init(__webpack_share_scopes__.default);
            // @ts-ignore
            container.__initialized = true;
          } catch (e) {
            console.error(`[MFE:loadRemote] Init failed for ${scope}:`, e);
          }
        }
        resolve(container);
        return true;
      }
      return false;
    };

    // 1. If global already exists, resolve immediately
    if (resolveContainer()) return;

    // 2. If script exists but no global, it might be loading or failed
    if (existingScript) {
      console.warn(
        `[MFE:loadRemote] Script for ${scope} already exists but global is missing. Waiting...`,
      );
      let attempts = 0;
      const interval = setInterval(() => {
        if (resolveContainer()) {
          clearInterval(interval);
        } else if (attempts++ > 100) {
          // Max 10s wait
          clearInterval(interval);
          reject(
            new Error(`Timed out waiting for global '${scope}' from ${url}`),
          );
        }
      }, 100);
      return;
    }

    // 3. New load
    const script = document.createElement("script");
    script.src = url;
    script.id = `remote-script-${scope}`;
    script.async = true;

    console.log(`[MFE:loadRemote] Injecting script: ${url}`);

    script.onload = () => {
      if (!resolveContainer()) {
        reject(
          new Error(
            `Global '${scope}' not found on window after script load from ${url}`,
          ),
        );
      }
    };

    script.onerror = () => {
      reject(new Error(`Failed to load remote script: ${url}`));
    };

    document.head.appendChild(script);
  });
};
