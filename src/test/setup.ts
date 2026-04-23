import '@testing-library/jest-dom'

// Mock window.location for testing
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    origin: 'http://localhost:5173',
    pathname: '/eld-progress-report/',
  },
  writable: true,
})