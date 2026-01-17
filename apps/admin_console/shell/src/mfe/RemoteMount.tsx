import React, { useEffect, useRef, useState } from "react";
import { loadRemote } from "./loadRemote";
import { useAuth } from "../app/AuthContext";
import { AuthClient } from "../app/auth/types";
import "../styles/mfe/RemoteMount.css";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  const mountedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); // Get full auth client

  // Memoize auth object if needed, but since functions might not be stable, careful.
  // Actually, useAuth from Context usually provides stable functions if implemented with useMemo or outside.
  // In our AuthContext implementation, it is memoized.
  const authClient: AuthClient = auth;

  // 🔹 mount: 단 한 번만
  useEffect(() => {
    let cancelled = false;

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
            `Module ${module} does not export a 'mount' function. Exports: ${Object.keys(
              moduleExports,
            ).join(", ")}`,
          );
        }

        console.log(`[Shell:RemoteMount] Calling mount function for ${scope}`);
        cleanupRef.current = mount(containerRef.current!, {
          ...(mountProps ?? {}),
          initialSelection: mountProps,
          eventTarget: containerRef.current,
          auth: authClient, // Inject Auth Client
        });
        mountedRef.current = true;
        console.log(`[Shell:RemoteMount] Mount successful for ${scope}`);
      } catch (err) {
        console.error(
          `[Shell:RemoteMount] Error loading/mounting ${scope}:`,
          err,
        );
        setError(`Failed to load module: ${scope}`);
      }
    })();

    return () => {
      cancelled = true;
      console.log(`[Shell:RemoteMount] Cleaning up for ${scope}`);
      cleanupRef.current?.();
      cleanupRef.current = null;
      mountedRef.current = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [scope, url, module, authClient]); // Re-mount when target MFE changes

  // 🔹 props 변경 (지금은 noop, 이후 확장)
  useEffect(() => {
    if (!mountedRef.current) return;
    if (!mountProps) return;

    // MFE로 selection 변경 이벤트 전달
    const event = new CustomEvent("mfe:selection", {
      detail: { ...mountProps }, // ⭐ 반드시 detail 로 감싸기
    });

    containerRef.current?.dispatchEvent(event);
  }, [mountProps]);

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
