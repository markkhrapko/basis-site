/* Basis Fellowship form client. Shared by apply.html and nominate.html.
 * Network layer only; each page does its own field serialization + UI.
 *
 * GO-LIVE: after the backend is deployed and Turnstile keys exist, set
 *   LIVE: true  and  TURNSTILE_SITE_KEY: '<your key>'  below.
 * Until then LIVE:false keeps the forms in graceful-acknowledge mode so no
 * visitor ever hits a dead endpoint.
 */
window.BASIS = {
  LIVE: false,
  API: 'https://api.basisfellowship.org',
  TURNSTILE_SITE_KEY: 'PLACEHOLDER_TURNSTILE_SITE_KEY',
};

(function () {
  var B = window.BASIS;

  // ---- Turnstile: load once, one solve per applicant ----
  function ensureTurnstile() {
    return new Promise(function (res) {
      if (window.turnstile) return res();
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true; s.defer = true; s.onload = function () { res(); };
      document.head.appendChild(s);
    });
  }
  var _wid;
  function getToken() {
    return ensureTurnstile().then(function () {
      return new Promise(function (resolve) {
        var box = document.getElementById('ts-box');
        if (!box) { box = document.createElement('div'); box.id = 'ts-box'; box.style.display = 'none'; document.body.appendChild(box); }
        var done = false;
        var opts = {
          sitekey: B.TURNSTILE_SITE_KEY, size: 'invisible', action: 'session',
          callback: function (t) { if (!done) { done = true; resolve(t); } },
          'error-callback': function () { if (!done) { done = true; resolve(null); } },
          'timeout-callback': function () { if (!done) { done = true; resolve(null); } }
        };
        if (_wid === undefined) { _wid = window.turnstile.render('#ts-box', opts); }
        else { window.turnstile.reset(_wid); }
        window.turnstile.execute(_wid, { action: 'session' });
      });
    });
  }

  // ---- session (cached ~25 min) ----
  var _sess, _exp = 0;
  function getSession() {
    if (_sess && Date.now() < _exp) return Promise.resolve(_sess);
    return getToken().then(function (token) {
      return fetch(B.API + '/api/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken: token })
      });
    }).then(function (r) { if (!r.ok) throw new Error('session'); return r.json(); })
      .then(function (d) { _sess = d.session; _exp = Date.now() + 25 * 60 * 1000; return _sess; });
  }

  // ---- upload one file with progress ----
  function putWithProgress(url, file, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = function (e) { if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = function () { (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('put ' + xhr.status)); };
      xhr.onerror = function () { reject(new Error('put-network')); };
      xhr.send(file);
    });
  }
  function uploadFiles(files, onProgress) {
    var keys = []; var chain = Promise.resolve();
    Array.prototype.forEach.call(files, function (file, i) {
      chain = chain.then(function () { return getSession(); }).then(function (session) {
        return fetch(B.API + '/api/upload-token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: session, filename: file.name, size: file.size, contentType: file.type })
        });
      }).then(function (r) { if (!r.ok) throw new Error('upload-token ' + r.status); return r.json(); })
        .then(function (d) {
          return putWithProgress(d.url, file, function (p) { if (onProgress) onProgress(i, p); })
            .then(function () { keys.push(d.key); });
        });
    });
    return chain.then(function () { return keys; });
  }

  // ---- idempotency key, stable across refresh/retry ----
  function idemKey(formId) {
    var k = 'basis-idem-' + formId, v = localStorage.getItem(k);
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random()); localStorage.setItem(k, v); }
    return v;
  }
  function clearIdem(formId) { localStorage.removeItem('basis-idem-' + formId); }

  function submit(type, fields, fileKeys, formId) {
    return getSession().then(function (session) {
      return fetch(B.API + '/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, fields: fields, fileKeys: fileKeys, session: session, idempotencyKey: idemKey(formId) })
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.ok) { var e = new Error(d.error || 'submit'); e.payload = d.payload; throw e; }
        clearIdem(formId); return d.id;
      });
    });
  }

  // ---- helpers pages use ----
  function chipValues(boxId) {
    var box = document.getElementById(boxId); if (!box) return [];
    return Array.prototype.map.call(box.querySelectorAll('.chip'), function (c) { return c.firstChild.textContent; });
  }
  function downloadAnswers(name, fields) {
    var lines = Object.keys(fields).map(function (k) { return k + ':\n' + fields[k] + '\n'; });
    var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = name + '.txt'; a.click();
  }

  B.uploadFiles = uploadFiles;
  B.submit = submit;
  B.chipValues = chipValues;
  B.downloadAnswers = downloadAnswers;
})();
