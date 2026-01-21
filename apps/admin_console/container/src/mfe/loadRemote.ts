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

    script.onload = () => {
      // @ts-ignore
      resolve(window[scope]);
    };

    script.onerror = () => {
      reject(new Error(`Failed to load remote script: ${url}`));
    };

    document.head.appendChild(script);
  });
};
