import React, { useEffect, useState } from "react";
import { TableDetailViewer } from "./router/TableDetailViewer";
import { Selection } from "../shared/types";

export const App: React.FC<{
  eventTarget?: EventTarget;
  initialSelection?: any;
}> = ({ eventTarget, initialSelection }) => {
  const [selection, setSelection] = useState<any>(initialSelection ?? null);

  useEffect(() => {
    if (initialSelection) {
      setSelection(initialSelection);
    }
  }, [initialSelection]);

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
