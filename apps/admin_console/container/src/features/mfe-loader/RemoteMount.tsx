import React, { useEffect, useRef, useState } from "react";
import { loadRemote } from "./loadRemote";
import { useAuth } from "../../app/providers/AuthProvider";
import { AuthClient } from "../../entities/user/types";
import "../../styles/mfe/RemoteMount.css";

type Props = {
  scope: string;
  module: string;
  url: string;
  mountProps?: any;
  visible: boolean;
};

export const RemoteMount: React.FC<Props> = ({
  scope,
  module,
  url,
  mountProps,
  visible,
}) => {
  console.log(
    `[Shell:RemoteMount] Rendering component for scope: ${scope}, visible: ${visible}`,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  const mountedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); // Get full auth client

  // 🔹 Keep latest props in a ref for the async mount call
  const propsRef = useRef(mountProps);
  useEffect(() => {
    propsRef.current = mountProps;
  }, [mountProps]);

  // 🔹 Stabilize authClient reference for MFE
  const authRef = useRef<AuthClient>(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  // 🔹 mount: Only once
  useEffect(() => {
    let cancelled = false;
    let didCleanup = false;

    (async () => {
      try {
        console.log(
          `[Shell:RemoteMount] Starting load for scope: ${scope}, url: ${url}`,
        );
        const container = await loadRemote(scope, url);
        if (cancelled) return;

        console.log(
          `[Shell:RemoteMount] Container loaded for ${scope}. Getting module: ${module}`,
        );
        const factory = await container.get(module);
        const moduleExports = factory();

        console.log(
          `[Shell:RemoteMount] Module exports for ${module}:`,
          Object.keys(moduleExports),
        );

        // Support named 'mount', default 'mount', or default export as function
        const mount =
          moduleExports.mount ||
          moduleExports.default?.mount ||
          moduleExports.default;

        if (typeof mount !== "function") {
          throw new Error(
            `Module ${module} does not export a 'mount' function.`,
          );
        }

        // Use the LATEST props available at mount time
        const latestProps = propsRef.current;
        console.log(`[Shell:RemoteMount] Calling mount() for ${scope} with latestProps:`, latestProps);

        cleanupRef.current = mount(containerRef.current!, {
          ...(latestProps ?? {}),
          initialSelection: latestProps,
          eventTarget: containerRef.current,
          auth: authRef.current, // Inject Auth Client
        });
        
        mountedRef.current = true;
        setIsMounted(true);
        console.log(`[Shell:RemoteMount] Mount successful for ${scope}`);
      } catch (err) {
        console.error(
          `[Shell:RemoteMount] Error loading/mounting ${scope}:`,
          err,
        );
        console.error(
          `[Shell:RemoteMount] Stack trace:`,
          err instanceof Error ? err.stack : "No stack trace",
        );
        setError(
          `Failed to load module: ${scope}. Details: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (didCleanup) return;
      didCleanup = true;

      console.log(`[Shell:RemoteMount] Cleaning up for ${scope}`);
      try {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      } catch (e) {
        console.warn(
          `[Shell:RemoteMount] Error during cleanup for ${scope}:`,
          e,
        );
      } finally {
        cleanupRef.current = null;
        mountedRef.current = false;
        setIsMounted(false);
      }
    };
  }, [scope, url, module]);

  // 🔹 Propagate props changes (only after mount)
  useEffect(() => {
    if (!isMounted) return;
    if (!mountProps) return;

    console.log(`[Shell:RemoteMount] Propagating props change to ${scope}:`, mountProps);

    // Dispatch selection change event to MFE
    const event = new CustomEvent("mfe:selection", {
      detail: { ...mountProps },
    });

    containerRef.current?.dispatchEvent(event);
  }, [isMounted, mountProps, scope]);

  if (error) {
    return (
      <div
        className={`remote-mount-error ${
          visible ? "remote-mount-visible-flex" : "remote-mount-hidden"
        }`}
      >
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`remote-mount-container ${
        visible ? "remote-mount-visible-block" : "remote-mount-hidden"
      }`}
    />
  );
};
