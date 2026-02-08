import { useState, useCallback } from "react";
import { useTableOverview } from "../../entities/table/model/useTableOverview";
import { useTableSchema } from "../../entities/table/model/useTableSchema";
import { useTableTimeliness } from "../../entities/table/model/useTableTimeliness";
import { useTableLineage } from "../../entities/table/model/useTableLineage";

export function useTableDetailView(tableName: string) {
  const [tab, setTab] = useState("info");
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["info"]));
  const [timelineDays, setTimelineDays] = useState(7);

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    setLoadedTabs((prev) => new Set(prev).add(newTab));
  }, []);

  // Data Hooks
  const { table, loading: loadingInfo } = useTableOverview(tableName);

  const { schema, loading: loadingSchema } = useTableSchema(
    loadedTabs.has("schema") ? tableName : ""
  );

  const { timeliness, loading: loadingTime } = useTableTimeliness(
    loadedTabs.has("timeliness") ? tableName : "",
    timelineDays
  );

  // Lineage is needed for metrics in Overview and for the Lineage tab itself
  const { lineage, loading: loadingLineage } = useTableLineage(
    (loadedTabs.has("lineage") || tab === "info") ? tableName : ""
  );

  // FQN Parsing for Header
  const parts = tableName.split('.');
  const projectName = parts[0] || "N/A";
  const datasetName = parts.slice(1, -1).join('.') || (parts.length > 1 ? parts[0] : "N/A");
  const displayName = table?.name || parts[parts.length - 1] || tableName;

  return {
    tab,
    handleTabChange,
    loadedTabs,
    timelineDays,
    setTimelineDays,
    table,
    loadingInfo,
    schema,
    loadingSchema,
    timeliness,
    loadingTime,
    lineage,
    loadingLineage,
    projectName,
    datasetName,
    displayName,
  };
}
