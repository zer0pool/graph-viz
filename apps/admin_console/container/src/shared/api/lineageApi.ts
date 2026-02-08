import { baseApi } from "./config";
import { JobHealthResponse, JobLineageHybridResponse } from "./types/lineage";

export const lineageApi = {
  getJobHealth: async (jobId: string): Promise<JobHealthResponse> => {
    const response = await baseApi.get<JobHealthResponse>(`/jobs/${jobId}/health`);
    return response.data;
  },

  getJobLineageHybrid: async (jobId: string): Promise<JobLineageHybridResponse> => {
    const response = await baseApi.get<JobLineageHybridResponse>(`/jobs/${jobId}/lineage`);
    return response.data;
  },
};
