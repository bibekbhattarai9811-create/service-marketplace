import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { apiClient } from './api';
import Register from './pages/Register';

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
    const navigate = jest.fn();

    return {
      BrowserRouter: ({ children }) => <div>{children}</div>,
      Routes: ({ children }) => React.Children.toArray(children)[0] ?? null,
      Route: ({ element }) => element,
      Navigate: () => <div>redirected</div>,
      Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
      useNavigate: () => navigate,
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
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
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
    target: { value: 'StrongPass1' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(apiClient.post).toHaveBeenCalledWith('/login', {
      email: 'worker1@test.com',
      password: 'StrongPass1',
    });
  });

  expect(await screen.findByText(/login successful! redirecting/i)).toBeInTheDocument();
  expect(localStorage.getItem('user_id')).toBe('3');
  expect(localStorage.getItem('role')).toBe('worker');
  expect(localStorage.getItem('token')).toBe('test-token');
});

test('shows an error message when login fails', async () => {
  apiClient.post.mockRejectedValue({
    response: {
      data: {
        detail: 'Invalid email or password',
      },
    },
  });

  render(<App />);

  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'worker1@test.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: 'wrong-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  expect(localStorage.getItem('user_id')).toBeNull();
  expect(localStorage.getItem('role')).toBeNull();
  expect(localStorage.getItem('token')).toBeNull();
});

test('registers a customer and shows the created user id', async () => {
  apiClient.post.mockResolvedValue({
    data: {
      user_id: 7,
    },
  });

  render(<Register />);

  fireEvent.change(screen.getByPlaceholderText(/full name/i), {
    target: { value: 'Test Customer' },
  });
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'customer7@test.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/phone/i), {
    target: { value: '1234567890' },
  });
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'customer' },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: 'StrongPass1' },
  });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(apiClient.post).toHaveBeenCalledWith('/register', {
      name: 'Test Customer',
      email: 'customer7@test.com',
      phone: '1234567890',
      role: 'customer',
      password: 'StrongPass1',
      admin_secret: null,
    });
  });

  expect(await screen.findByText(/registration successful! user id: 7/i)).toBeInTheDocument();
});

test('shows an error message when registration fails', async () => {
  apiClient.post.mockRejectedValue({
    response: {
      data: {
        detail: 'Email already registered',
      },
    },
  });

  render(<Register />);

  fireEvent.change(screen.getByPlaceholderText(/full name/i), {
    target: { value: 'Test Customer' },
  });
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'customer7@test.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/phone/i), {
    target: { value: '1234567890' },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: 'StrongPass1' },
  });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
});

test('shows local validation for weak password on registration', async () => {
  render(<Register />);

  fireEvent.change(screen.getByPlaceholderText(/full name/i), {
    target: { value: 'Test Customer' },
  });
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'customer7@test.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/phone/i), {
    target: { value: '1234567890' },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: 'weakpass' },
  });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
});
