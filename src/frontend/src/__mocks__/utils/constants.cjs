/** Jest-only: avoids import.meta.env in tests */
const raw =
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) || '';
let API_BASE_URL = raw.replace ? raw.replace(/\/$/, '') : raw || 'http://localhost:8000';
if (!/^https?:\/\//.test(API_BASE_URL)) {
  API_BASE_URL = 'http://localhost:8000';
}
module.exports = { API_BASE_URL };
