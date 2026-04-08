import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { apiClient } from './api';

jest.mock('./api', () => ({
  apiClient: {
    post: jest.fn(),
  },
  clearSession: jest.fn(),
}));

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');

    return {
      BrowserRouter: ({ children }) => <div>{children}</div>,
      Routes: ({ children }) => React.Children.toArray(children)[0] ?? null,
      Route: ({ element }) => element,
    };
  },
  { virtual: true }
);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('renders the login screen on the default route', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

test('logs in a worker and saves the session details', async () => {
  apiClient.post.mockResolvedValue({
    data: {
      user_id: 3,
      role: 'worker',
      token: 'test-token',
    },
  });

  render(<App />);

  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'worker1@test.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: '1234' },
  });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => {
    expect(apiClient.post).toHaveBeenCalledWith('/login', {
      email: 'worker1@test.com',
      password: '1234',
    });
  });

  expect(await screen.findByText(/login successful! redirecting/i)).toBeInTheDocument();
  expect(localStorage.getItem('user_id')).toBe('3');
  expect(localStorage.getItem('role')).toBe('worker');
  expect(localStorage.getItem('token')).toBe('test-token');
});
