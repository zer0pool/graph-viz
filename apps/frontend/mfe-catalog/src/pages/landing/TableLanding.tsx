import React, { useCallback, useEffect, useState } from "react";
import { useTableLanding } from "../../widgets/table-landing/useTableLanding";
import { TableLandingView } from "../../widgets/table-landing/TableLandingView";

export function TableLanding() {
  const {
    tables,
    totalCount,
    sizeRanking,
    rowsRanking,
    loading,
    rankingLoading,
    error,
    fetchData,
    fetchRanking,
    refresh,
  } = useTableLanding();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData({ offset: 0, limit: 10, sortOrder: "DESC" });
    fetchRanking(30);
  }, [fetchData, fetchRanking]);

  const handleFetchData = useCallback(
    (options: Parameters<typeof fetchData>[0]) => {
      fetchData(options);
    },
    [fetchData]
  );

  return (
    <TableLandingView
      tables={tables}
      totalCount={totalCount}
      sizeRanking={sizeRanking}
      rowsRanking={rowsRanking}
      loading={loading}
      rankingLoading={rankingLoading}
      error={error}
      search={search}
      onSearchChange={setSearch}
      onRefresh={refresh}
      onFetchData={handleFetchData}
    />
  );
}
