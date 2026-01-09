import React, { useEffect, useRef, useState } from "react";
import { loadRemote } from "./loadRemote";
import { useAuth, AuthClient } from "../app/AuthContext";

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
  const { user, getToken, fetchWithAuth } = useAuth(); // Get auth client

  // Memoize auth object if needed, but since functions might not be stable, careful.
  // Actually, useAuth from Context usually provides stable functions if implemented with useMemo or outside.
  // In our AuthContext implementation, it is memoized.
  const authClient: AuthClient = { user, getToken, fetchWithAuth };

  // 🔹 mount: 단 한 번만
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const container = await loadRemote(scope, url);
        if (cancelled) return;

        const factory = await container.get(module);
        const moduleExports = factory();
        // Support named 'mount', default 'mount', or default export as function
        const mount =
          moduleExports.mount ||
          moduleExports.default?.mount ||
          moduleExports.default;

        if (typeof mount !== "function") {
          throw new Error(
            `Module ${module} does not export a 'mount' function. Exports: ${Object.keys(
              moduleExports
            ).join(", ")}`
          );
        }

        cleanupRef.current = mount(containerRef.current!, {
          ...(mountProps ?? {}),
          initialSelection: mountProps,
          eventTarget: containerRef.current,
          auth: authClient, // Inject Auth Client
        });
        mountedRef.current = true;
      } catch (err) {
        console.error(`Failed to load remote module ${scope}:`, err);
        setError(`Failed to load module: ${scope}`);
      }
    })();

    return () => {
      // Shell 자체가 내려갈 때만 실행됨
      cleanupRef.current?.();
    };
  }, []); // Intentionally empty dependency to mount ONLY ONCE. Auth updates handled via events or stable ref if supported by MFE.

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
        style={{
          display: visible ? "flex" : "none",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#dc2626",
          padding: "1rem",
        }}
      >
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: visible ? "block" : "none",
        height: "100%",
      }}
    />
  );
};
