import React, { useCallback } from "react";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { useDatasetsTable } from "./useDatasetsTable";
import { useTableFilter } from "./useTableFilter";
import { DatasetsTableView } from "./DatasetsTableView";

export function DatasetsTable() {
  const navigate = useMfeNavigate();
  const { datasets, maxSize, loading } = useDatasetsTable();
  const tableFilter = useTableFilter(datasets);

  const handleViewDetail = useCallback(
    (name: string) => {
      navigate(`/tables/${name}`);
    },
    [navigate]
  );

  return (
    <DatasetsTableView
      {...tableFilter}
      maxSize={maxSize}
      loading={loading}
      onViewDetail={handleViewDetail}
    />
  );
}
