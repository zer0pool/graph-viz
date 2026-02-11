import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useJobLanding } from '../useJobLanding';
import { useApiClient } from '../../../shared/api/ApiContext';

// Mock the API client hook
vi.mock('../../../shared/api/ApiContext', () => ({
  useApiClient: vi.fn(),
}));

describe('useJobLanding hook', () => {
  const mockApi = {
    fetchJobs: vi.fn(),
    fetchSummaryMetrics: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useApiClient as any).mockReturnValue(mockApi);
    // Baseline mock
    mockApi.fetchSummaryMetrics.mockResolvedValue({});
    mockApi.fetchJobs.mockResolvedValue([]);
  });

  it('should fetch jobs and update state on mount', async () => {
    const mockJobs = [{ job_id: 'job-1', job_name: 'Test Job' }];
    const mockSummary = { total_jobs: 10, jobs_today: 2 };
    
    mockApi.fetchSummaryMetrics.mockResolvedValue(mockSummary);
    mockApi.fetchJobs.mockResolvedValue({ jobs: mockJobs });

    const { result } = renderHook(() => useJobLanding());

    // Initial state
    expect(result.current.loading).toBe(true);

    // Wait for fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toEqual(mockJobs);
    expect(result.current.metrics).toHaveLength(5);
    expect(result.current.metrics[0].value).toBe(10);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors gracefully', async () => {
    mockApi.fetchSummaryMetrics.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useJobLanding());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toEqual([]);
    expect(result.current.error).toBe('Failed to load dashboard data');
  });

  it('should return correct status colors', () => {
    const { result } = renderHook(() => useJobLanding());

    expect(result.current.getStatusColor('SUCCESS')).toContain('green');
    expect(result.current.getStatusColor('RUNNING')).toContain('blue');
    expect(result.current.getStatusColor('FAILED')).toContain('red');
  });
});
