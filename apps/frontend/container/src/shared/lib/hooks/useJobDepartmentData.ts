import { useState, useEffect, useCallback } from "react";
import { graphqlClient } from "../../api/graphqlClient";

export interface DepartmentJobItem {
  department: string;
  count: number;
}

const JOB_DEPT_QUERY = `
  query GetJobDepartmentDistribution {
    jobStats {
      total
      byDepartment {
        department
        count
      }
    }
  }
`;

export const useJobDepartmentData = () => {
  const [items, setItems] = useState<DepartmentJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await graphqlClient.fetch<{
        jobStats: {
          total: number;
          byDepartment: { department: string; count: number }[];
        }
      }>(JOB_DEPT_QUERY);

      const sortedItems = (response.jobStats?.byDepartment || []).sort((a, b) => b.count - a.count);
      setItems(sortedItems);
      setTotal(response.jobStats?.total || 0);
    } catch (e) {
      console.error("[Analytics] Error fetching job department distribution (GraphQL):", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, total, loading, refresh: fetch };
};
