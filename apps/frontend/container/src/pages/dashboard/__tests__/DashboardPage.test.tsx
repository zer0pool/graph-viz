import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardPage } from '../DashboardPage';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../../shared/lib/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: () => ({
    metrics: [
        { type: "total_tables", value: 10, subtext: "Test Tables" }
    ],
    loading: false,
    refresh: jest.fn()
  })
}));

jest.mock('../../shared/lib/hooks/useAnalyticsData', () => ({
  useAnalyticsData: () => ({
    recentHistory: [],
    topVisited: [],
    loadingTop: false,
    refresh: jest.fn()
  })
}));

describe('DashboardPage', () => {
  it('renders dashboard title and metrics', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Test Tables')).toBeInTheDocument();
  });
});
