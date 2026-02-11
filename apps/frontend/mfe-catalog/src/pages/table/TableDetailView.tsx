import React from "react";
import { ViewMode } from "../../types";
import { useTableDetailView } from "../../widgets/table-detail/useTableDetailView";
import { TableDetailViewPresenter } from "../../widgets/table-detail/TableDetailViewPresenter";

export const TableDetailView: React.FC<{
  tableName: string;
  mode?: ViewMode;
}> = ({ tableName, mode = "EMBEDDED" }) => {
  const logic = useTableDetailView(tableName);

  return (
    <TableDetailViewPresenter
      tableName={tableName}
      mode={mode}
      {...logic}
      onTabChange={logic.handleTabChange}
      onTimelineDaysChange={logic.setTimelineDays}
    />
  );
};
