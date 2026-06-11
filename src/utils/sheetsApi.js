/**
 * sheetFetch — JSONP bridge to Google Apps Script
 *
 * WHY JSONP and not fetch()?
 *   Apps Script /exec endpoints block browser fetch() with CORS.
 *   JSONP injects a <script> tag whose src is the API URL.
 *   Script tags bypass CORS. Apps Script wraps its JSON in the
 *   callback name we supply → our window function receives the data.
 *
 * @param {string} scriptUrl  Your Apps Script /exec URL
 * @param {object} params     Query params like { action, date, ... }
 * @returns {Promise<object>} Resolved with the JSON data from the sheet
 */
export function sheetFetch(scriptUrl, params) {
  return new Promise((resolve, reject) => {
    if (!scriptUrl) {
      reject(new Error("Apps Script URL not set. Go to Settings."));
      return;
    }

    // Unique callback name prevents collision when multiple requests fly at once
    const cbName = "_gs" + Date.now() + Math.floor(Math.random() * 9999);

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout — check your Apps Script URL"));
    }, 20_000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      const el = document.getElementById(cbName);
      if (el) el.parentNode.removeChild(el);
    }

    window[cbName] = (data) => { cleanup(); resolve(data); };

    const qs = Object.entries({ ...params, callback: cbName })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const scr = document.createElement("script");
    scr.id  = cbName;
    scr.src = scriptUrl + "?" + qs;
    scr.onerror = () => { cleanup(); reject(new Error("Script load failed — verify Apps Script URL")); };
    document.head.appendChild(scr);
  });
}
