// API Service for Tradazone
// Handles data fetching and backend integration
//
// ADR-API-001 (Accepted, 2026-03-24):
// We use a centralized JavaScript gateway module as the API boundary for UI features.
// Context: backend endpoints are still being phased in while pages need stable contracts.
// Decision: keep `api` domain groups (`customers`, `invoices`, `checkouts`, `items`)
// in this file and resolve base URL from `VITE_API_URL` with a local fallback.
// Consequence: feature pages can ship against consistent async interfaces now and
// migrate method-by-method to real HTTP calls without rewriting page-level logic.

import {
  mockCustomers,
  mockInvoices,
  mockCheckouts,
  mockItems,
} from "../data/mockData";

// Base URL for the backend API
// In development, this can be an environment variable or proxy
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Helper to simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Slice an array into a single page of results.
 *
 * @param {Array}  items
 * @param {number} page   - 1-based page number. Values < 1 are clamped to 1.
 * @param {number} limit  - Items per page (default 10).
 * @returns {{ data: Array, page: number, limit: number, total: number, totalPages: number }}
 */
export function paginate(items, page = 1, limit = 10) {
  // BUG FIX #31: clamp page to minimum of 1 to prevent page-0 underflow
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.floor(limit));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  //if the requested page exceeds the available pages,clamp to last page
  const clampedPage = Math.min(safePage, totalPages);
  const start = (clampedPage - 1) * safeLimit;
  return {
    data: items.slice(start, start + safeLimit),
    page: clampedPage,
    limit: safeLimit,
    total,
    totalPages,
  };
}
// ---------------------------------------------------------------------------
// 401 / token-expiration interceptor
// ---------------------------------------------------------------------------

/**
 * Callback invoked whenever apiFetch receives a 401 Unauthorized response.
 *
 * Default behaviour: hard-redirect to the sign-in page so the user is always
 * prompted to reconnect, even without a running React tree (e.g. a background
 * fetch that fires after the component unmounts).
 *
 * Override at app initialisation to use React Router's navigate instead:
 * ```js
 * import { setUnauthorizedHandler } from './services/api';
 * setUnauthorizedHandler(() => {
 *     logout();
 *     navigate('/signin?reason=expired');
 * });
 * ```
 */
let _onUnauthorized = () => {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  window.location.assign(`${base}/signin?reason=expired`);
};

/**
 * Register a custom handler for 401 responses.
 * Call this once during app initialisation inside a component that has access
 * to both `useAuth` and `useNavigate` (e.g. a child of BrowserRouter).
 *
 * @param {() => void} handler
 */
export function setUnauthorizedHandler(handler) {
  _onUnauthorized = handler;
}

/**
 * Thin fetch wrapper that centralises authentication-error handling.
 *
 * - Returns parsed JSON on 2xx responses.
 * - On 401: calls _onUnauthorized() and returns
 *   `{ ok: false, error: 'ERR_TOKEN_EXPIRED', status: 401 }` so callers
 *   receive a machine-readable code rather than an unhandled rejection.
 * - On other non-2xx: throws an error enriched with `status` and `body`.
 *
 * Migration guide — replace each TODO mock with:
 * ```js
 * return apiFetch(`${API_BASE_URL}/resource`);
 * ```
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    _onUnauthorized();
    return { ok: false, error: "ERR_TOKEN_EXPIRED", status: 401 };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(
      new Error(body.message || `API error ${response.status}`),
      { status: response.status, body }
    );
  }

  return response.json();
}

// Expose for tests and future real-fetch migrations (not needed by mock callers)
export { apiFetch };

const api = {
  // Customers
  customers: {
    // BUG FIX #31: list now accepts { page, limit } and returns paginated envelope
    list: async ({ page = 1, limit = 10 } = {}) => {
      await delay(500);
      return paginate(mockCustomers, page, limit);
    },
    get: async (id) => {
      await delay(300);
      return mockCustomers.find((c) => c.id === id);
    },
    create: async (data) => {
      await delay(800);
      console.log("API Create Customer:", data);
      return { id: Date.now().toString(), ...data };
    },
    update: async (id, data) => {
      await delay(500);
      console.log("API Update Customer:", id, data);
      return { id, ...data };
    },
    delete: async (id) => {
      await delay(500);
      console.log("API Delete Customer:", id);
      return true;
    },
  },

  // Invoices
  invoices: {
    list: async ({ page = 1, limit = 10 } = {}) => {
      await delay(500);
      return paginate(mockInvoices, page, limit);
    },
    get: async (id) => {
      await delay(300);
      return mockInvoices.find((i) => i.id === id);
    },
    create: async (data) => {
      await delay(800);
      console.log("API Create Invoice:", data);
      return { id: `INV-${Date.now()}`, ...data };
    },
  },

  // Checkouts
  checkouts: {
    list: async ({ page = 1, limit = 10 } = {}) => {
      await delay(500);
      return paginate(mockCheckouts, page, limit);
    },
    create: async (data) => {
      await delay(800);
      console.log("API Create Checkout:", data);
      return { id: `CHK-${Date.now()}`, ...data };
    },
  },

  // Items
  items: {
    list: async ({ page = 1, limit = 10 } = {}) => {
      await delay(500);
      return paginate(mockItems, page, limit);
    },
    create: async (data) => {
      await delay(800);
      console.log("API Create Item:", data);
      return { id: Date.now().toString(), ...data };
    },
  },
};

export default api;
