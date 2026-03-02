// Force-load micromatch (and thus picomatch) from root node_modules first
// so Jest never picks up Vite's nested picomatch (different API, causes REPLACEMENTS undefined).
require('micromatch');

// Ensure API base URL is absolute for api.test (constants mock reads this at load time)
if (typeof process !== 'undefined' && process.env) {
  process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
}
