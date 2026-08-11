/* Basis Fellowship form client — Formspree edition.
 * Shared by apply.html and nominate.html. Keeps the same public API
 * (BASIS.uploadFiles / submit / chipValues / downloadAnswers / LIVE) so the
 * pages need no changes; this file is the only network layer.
 *
 * GO-LIVE:
 *   1. Create two Formspree forms (apply, nominate), paste their endpoints below.
 *   2. Set LIVE: true.
 * Until LIVE is true, the pages stay in graceful-acknowledge mode (show the
 * success screen, send nothing) so no visitor ever hits a dead endpoint.
 */
window.BASIS = {
  LIVE: true,
  FORMSPREE: {
    apply: 'https://formspree.io/f/xzeprogn',      // handles application + update
    nominate: 'https://formspree.io/f/moeadrlq',
  },
};

(function () {
  var B = window.BASIS;

  // A short reference the applicant can quote; also stored with the submission.
  // Time-seeded + random base36 so it stays unique across thousands of applicants.
  function reference() {
    var s = (Date.now().toString(36) + Math.random().toString(36).slice(2, 5)).toUpperCase();
    return 'BF-2026-' + s.slice(-6);
  }

  function endpointFor(type) {
    return type === 'nominate' ? B.FORMSPREE.nominate : B.FORMSPREE.apply;
  }

  function flatten(v) {
    return Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v));
  }

  // Read chip values out of a chip box (emails, orgs, contacts).
  function chipValues(boxId) {
    var box = document.getElementById(boxId);
    if (!box) return [];
    return Array.prototype.map.call(box.querySelectorAll('.chip'), function (c) {
      return c.firstChild.textContent;
    });
  }

  // Client-side fallback so a failed send never loses the applicant's writing.
  function downloadAnswers(name, fields) {
    var lines = Object.keys(fields).map(function (k) { return k + ':\n' + flatten(fields[k]) + '\n'; });
    var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.txt';
    a.click();
  }

  // Files ride along in the same multipart POST — stash them + the page's
  // progress callback so submit() can drive the existing "Uploading…" line.
  function uploadFiles(files, onProgress) {
    B._files = Array.prototype.slice.call(files || []);
    B._prog = onProgress || null;
    return Promise.resolve(B._files);
  }

  function submit(type, fields, files, formId) {
    var ref = reference();
    var fd = new FormData();
    fd.append('formType', type);
    fd.append('reference', ref);
    fd.append('_subject', 'Basis ' + type + ' — ' + ref);
    fd.append('_gotcha', ''); // honeypot: bots fill it, Formspree drops them
    // Reply-to = the person's first email, so Formspree's confirmation autoresponse
    // reaches them and our replies thread correctly.
    if (fields && fields.emails && fields.emails.length) fd.append('_replyto', fields.emails[0]);
    Object.keys(fields || {}).forEach(function (k) { fd.append(k, flatten(fields[k])); });
    (files || []).forEach(function (f) { if (f instanceof File) fd.append('files', f, f.name); });

    var prog = B._prog; B._prog = null; B._files = null;

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpointFor(type));
      xhr.setRequestHeader('Accept', 'application/json');
      if (prog && files && files.length) {
        xhr.upload.onprogress = function (e) { if (e.lengthComputable) prog(0, e.loaded / e.total); };
      }
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) { resolve(ref); return; }
        var msg = 'submit';
        if (xhr.status === 429) { msg = 'rate'; }
        else if (xhr.status === 413) { msg = 'toolarge'; }
        else { try { var j = JSON.parse(xhr.responseText); if (j && j.errors && j.errors.length) msg = j.errors[0].message; } catch (_) {} }
        reject(new Error(msg));
      };
      xhr.onerror = function () { reject(new Error('network')); };
      xhr.send(fd);
    });
  }

  B.uploadFiles = uploadFiles;
  B.submit = submit;
  B.chipValues = chipValues;
  B.downloadAnswers = downloadAnswers;
})();
