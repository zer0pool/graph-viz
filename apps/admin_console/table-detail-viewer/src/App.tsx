import React, { useEffect, useState } from "react";
import { TableDetailViewer } from "./TableDetailViewer";
import { Selection } from "./types";
import "./styles/legacy.css"; // Import legacy styles

export const App: React.FC<{
  eventTarget?: EventTarget;
  initialSelection?: any;
}> = ({ eventTarget, initialSelection }) => {
  const [selection, setSelection] = useState<any>(initialSelection ?? null);

  useEffect(() => {
    if (!eventTarget) return;

    const handler = (e: any) => {
      setSelection({ ...e.detail });
    };

    eventTarget.addEventListener("mfe:selection", handler);
    return () => eventTarget.removeEventListener("mfe:selection", handler);
  }, [eventTarget]);

  return <TableDetailViewer selection={selection} />;
};
export default App;
