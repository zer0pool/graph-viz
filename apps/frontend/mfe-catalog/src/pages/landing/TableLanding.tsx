import React, { useCallback } from "react";
import { useTableLanding } from "../../widgets/table-landing/useTableLanding";
import { TableLandingView } from "../../widgets/table-landing/TableLandingView";

export function TableLanding() {
  const { metrics, refresh } = useTableLanding();

  return <TableLandingView metrics={metrics} onRefresh={refresh} />;
}
