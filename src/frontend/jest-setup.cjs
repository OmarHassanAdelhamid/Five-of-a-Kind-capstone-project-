// Ensure API base URL is set for api.test (constants mock reads this at load time).
if (typeof process !== 'undefined' && process.env) {
  process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
}
