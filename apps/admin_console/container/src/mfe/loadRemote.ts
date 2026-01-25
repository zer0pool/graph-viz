// This function dynamically loads a remote module
export const loadRemote = (scope: string, url: string) => {
  return new Promise<any>((resolve, reject) => {
    // Check if script is already loaded
    if (document.getElementById(`remote-script-${scope}`)) {
      // @ts-ignore
      return resolve(window[scope]);
    }

    const script = document.createElement("script");
    script.src = url;
    script.id = `remote-script-${scope}`;
    script.async = true;

    console.log(`[Shell:loadRemote] Injecting script: ${url}`);

    script.onload = () => {
      console.log(`[Shell:loadRemote] Script loaded: ${url}`);
      // @ts-ignore
      const container = window[scope];
      if (!container) {
        console.error(
          `[Shell:loadRemote] Global '${scope}' not found on window after script load!`,
        );
        reject(new Error(`Global '${scope}' not found on window`));
        return;
      }
      // @ts-ignore
      // Initialize the container
      if (!container.__initialized) {
        console.log(`[Shell:loadRemote] Initializing container: ${scope}`);
        // @ts-ignore
        container.init(__webpack_share_scopes__.default);
        // @ts-ignore
        container.__initialized = true;
      }

      resolve(container);
    };

    script.onerror = () => {
      console.error(`[Shell:loadRemote] Script load error for: ${url}`);
      reject(new Error(`Failed to load remote script: ${url}`));
    };

    document.head.appendChild(script);
  });
};
