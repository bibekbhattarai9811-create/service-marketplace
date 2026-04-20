// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: jest.fn(),
      },
      mergeOptions: jest.fn(),
    },
  },
}));

jest.mock('react-leaflet', () => {
  const React = require('react');

  const passthrough = ({ children }) => <div>{children}</div>;

  return {
    MapContainer: passthrough,
    TileLayer: () => <div />,
    Marker: passthrough,
    Popup: passthrough,
    useMapEvents: () => null,
  };
});
