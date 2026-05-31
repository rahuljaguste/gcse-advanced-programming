/* api-shim.js — services /api/* from localStorage on GitHub Pages.
   Works as a browser <script> AND as a Node require() (for tests). */
(function () {
  'use strict';

  // ---- storage helpers ----
  function keyFor(student, suffix) {
    return 'gcse:' + student + ':' + suffix;
  }

  function readJSON(key, dflt) {
    try {
      const raw = localStorage.getItem(key);
      // getItem returns string|null per spec; the undefined check is a
      // defensive guard for non-conforming polyfills.
      if (raw === null || raw === undefined) return dflt;
      return JSON.parse(raw);
    } catch (e) {
      return dflt;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // quota exceeded or storage disabled — degrade silently
      return false;
    }
  }

  // ---- shared fetch wrapper (idempotent; both shims reuse it) ----
  function installFetchWrapper() {
    const w = (typeof window !== 'undefined') ? window : global;
    w.__apiRoutes = w.__apiRoutes || [];
    if (!w.__fetchPatched && typeof w.fetch === 'function') {
      w.__fetchPatched = true;
      const realFetch = w.fetch.bind(w);
      w.fetch = function (url, opts) {
        for (const route of w.__apiRoutes) {
          const res = route(url, opts);   // Response or null
          if (res) return res;
        }
        return realFetch(url, opts);
      };
    }
    return w;
  }

  // expose for browser
  if (typeof window !== 'undefined') {
    window.__apiShim = { keyFor, readJSON, writeJSON, installFetchWrapper };
  }

  // expose for Node tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { keyFor, readJSON, writeJSON, installFetchWrapper };
  }
})();
