import React, { useCallback } from "react";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { useDatasetsTable } from "./useDatasetsTable";
import { DatasetsTableView } from "./DatasetsTableView";

export function DatasetsTable() {
  const navigate = useMfeNavigate();
  const { search, setSearch, filteredDatasets, maxSize } = useDatasetsTable();

  const handleViewDetail = useCallback((name: string) => {
    navigate(`/tables/${name}`);
  }, [navigate]);

  return (
    <DatasetsTableView
        search={search}
        onSearchChange={setSearch}
        datasets={filteredDatasets}
        maxSize={maxSize}
        onViewDetail={handleViewDetail}
    />
  );
}
