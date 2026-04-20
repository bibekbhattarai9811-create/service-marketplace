import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PostJob from './PostJob';
import { apiClient } from '../api';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/post-job' }),
  }),
  { virtual: true }
);

jest.mock('../api', () => ({
  apiClient: {
    get: jest.fn(),
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

  test('submits a new job with the selected category', async () => {
    apiClient.post.mockResolvedValue({
      data: { job_id: 42 },
    });

    render(<PostJob />);

    fireEvent.click(screen.getByRole('button', { name: /plumbing/i }));
    fireEvent.change(screen.getByPlaceholderText(/job title/i), {
      target: { value: 'Fix fence' },
    });
    fireEvent.change(screen.getByPlaceholderText(/job description/i), {
      target: { value: 'Backyard fence needs repair' },
    });
    fireEvent.change(screen.getByPlaceholderText(/selected city or region/i), {
      target: { value: 'Austin' },
    });
    fireEvent.change(screen.getByPlaceholderText(/price offer/i), {
      target: { value: '75' },
    });
    fireEvent.click(screen.getByRole('button', { name: /publish job offer/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/jobs/create-job', {
        title: 'Fix fence',
        description: 'Backyard fence needs repair',
        location: 'Austin',
        price: 75,
        category: 'Plumbing',
        service_date: '',
        service_window: '',
      });
    });
  });
});
