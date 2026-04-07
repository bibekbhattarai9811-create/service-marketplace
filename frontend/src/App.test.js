import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock(
  'axios',
  () => ({
    post: jest.fn(),
    get: jest.fn(),
  }),
  { virtual: true }
);

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

test('renders the login screen on the default route', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
