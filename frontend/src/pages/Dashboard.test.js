import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { apiClient, WS_API } from '../api';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  }),
  { virtual: true }
);

jest.mock('../api', () => ({
  WS_API: 'ws://example.test/ws',
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  clearSession: jest.fn(),
}));

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.close = jest.fn();
  }
}

describe('Dashboard', () => {
  beforeAll(() => {
    global.WebSocket = MockWebSocket;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('role', 'worker');
    localStorage.setItem('user_id', '3');

    apiClient.get.mockImplementation((url) => {
      if (url === '/jobs/available-jobs') {
        return Promise.resolve({
          data: [
            { id: 1, title: 'Fix sink', description: 'Leaking sink', location: 'Chicago', price: 50, status: 'OPEN' },
          ],
        });
      }
      if (url === '/jobs/worker-jobs/me') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/worker-earnings') {
        return Promise.resolve({ data: { completed_jobs: 0, total_earnings: 0 } });
      }
      if (url === '/jobs/worker-rating/3') {
        return Promise.resolve({ data: { average_rating: 4.5 } });
      }
      if (url === '/transactions') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/jobs/notifications/summary') {
        return Promise.resolve({ data: { unread_count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test('renders available jobs and accepts a job', async () => {
    apiClient.post.mockResolvedValue({ data: { message: 'ok' } });

    render(<Dashboard />);

    expect(await screen.findByText(/fix sink/i)).toBeInTheDocument();
    expect(WS_API).toBe('ws://example.test/ws');

    fireEvent.click(screen.getByRole('button', { name: /accept job/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/jobs/accept-job', null, {
        params: { job_id: 1 },
      });
    });

    expect(await screen.findByText(/job accepted successfully!/i)).toBeInTheDocument();
  });
});
