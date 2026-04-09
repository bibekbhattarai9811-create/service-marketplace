import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PostJob from './PostJob';
import { apiClient } from '../api';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  }),
  { virtual: true }
);

jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
  },
  clearSession: jest.fn(),
}));

describe('PostJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('role', 'customer');
  });

  test('submits a new job and shows the created job id', async () => {
    apiClient.post.mockResolvedValue({
      data: { job_id: 42 },
    });

    render(<PostJob />);

    fireEvent.change(screen.getByPlaceholderText(/job title/i), {
      target: { value: 'Fix fence' },
    });
    fireEvent.change(screen.getByPlaceholderText(/job description/i), {
      target: { value: 'Backyard fence needs repair' },
    });
    fireEvent.change(screen.getByPlaceholderText(/location/i), {
      target: { value: 'Austin' },
    });
    fireEvent.change(screen.getByPlaceholderText(/price/i), {
      target: { value: '75' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post job/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/jobs/create-job', {
        title: 'Fix fence',
        description: 'Backyard fence needs repair',
        location: 'Austin',
        price: 75,
      });
    });

    expect(await screen.findByText(/job posted successfully! job id: 42/i)).toBeInTheDocument();
  });
});
