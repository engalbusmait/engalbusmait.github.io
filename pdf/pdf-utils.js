/* pdf-utils.js — shared utilities for PDF Toolkit */
'use strict';

window.PdfUtils = {

  /* ── Download helpers ── */
  downloadFile(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    this.downloadBlob(blob, filename);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  },

  /* ── Formatting ── */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  /* ── Progress overlay ── */
  showProgress(msg) {
    let overlay = document.getElementById('pu-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pu-overlay';
      overlay.innerHTML = `
        <div class="pu-box">
          <div class="pu-spinner"></div>
          <p id="pu-msg"></p>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById('pu-msg').textContent = msg || 'Processing…';
    overlay.style.display = 'flex';
  },

  hideProgress() {
    const overlay = document.getElementById('pu-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  /* ── Error banner ── */
  showError(msg) {
    let banner = document.getElementById('pu-error');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pu-error';
      banner.style.cssText = `
        position:fixed;top:80px;left:50%;transform:translateX(-50%);
        background:#ff4757;color:#fff;padding:.75rem 1.5rem;border-radius:10px;
        font-size:.9rem;font-weight:600;z-index:9999;max-width:90%;text-align:center;
        box-shadow:0 4px 20px rgba(255,71,87,.4);`;
      document.body.appendChild(banner);
    }
    banner.textContent = msg;
    banner.style.display = 'block';
    clearTimeout(banner._timeout);
    banner._timeout = setTimeout(() => this.clearError(), 6000);
  },

  clearError() {
    const banner = document.getElementById('pu-error');
    if (banner) banner.style.display = 'none';
  },

  /* ── File reading ── */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  },

  /* ── PDF page count via pdf-lib ── */
  async getPdfPageCount(arrayBuffer) {
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdf.getPageCount();
  },

  /* ── Validate file ── */
  validatePdf(file) {
    if (!file) return 'No file selected.';
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf') return 'Please select a PDF file.';
    if (file.size > 200 * 1024 * 1024) return 'File is too large (max 200 MB).';
    return null;
  },

  validateImage(file) {
    if (!file) return 'No file selected.';
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) return 'Please select a JPG or PNG image.';
    return null;
  },

  /* ── Statistics (localStorage) ── */
  STATS_KEY: 'pdf_toolkit_stats',

  trackOperation(toolKey) {
    try {
      const raw = localStorage.getItem(this.STATS_KEY);
      const stats = raw ? JSON.parse(raw) : {};
      stats[toolKey] = (stats[toolKey] || 0) + 1;
      stats._total = (stats._total || 0) + 1;
      if (!stats._firstUse) stats._firstUse = Date.now();
      stats._lastUse = Date.now();
      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
    } catch {}
  },

  getStats() {
    try {
      return JSON.parse(localStorage.getItem(this.STATS_KEY) || '{}');
    } catch { return {}; }
  },

  clearStats() {
    try { localStorage.removeItem(this.STATS_KEY); } catch {}
  },

  /* ── Parse page range string like "1-3, 5, 7-9" ── */
  parseRanges(str, maxPage) {
    const ranges = [];
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(n => parseInt(n.trim(), 10));
        if (isNaN(a) || isNaN(b) || a < 1 || b < a || b > maxPage)
          return { error: `Invalid range: "${part}". Pages must be between 1 and ${maxPage}.` };
        for (let i = a; i <= b; i++) ranges.push(i - 1); // 0-indexed
      } else {
        const n = parseInt(part, 10);
        if (isNaN(n) || n < 1 || n > maxPage)
          return { error: `Invalid page number: "${part}". Must be between 1 and ${maxPage}.` };
        ranges.push(n - 1);
      }
    }
    if (ranges.length === 0) return { error: 'No valid pages specified.' };
    return { pages: ranges };
  },

};

/* ── Inject shared CSS for overlay / spinner ── */
(function injectOverlayCSS() {
  const style = document.createElement('style');
  style.textContent = `
    #pu-overlay {
      display:none;position:fixed;inset:0;background:rgba(7,11,20,.8);
      z-index:9998;align-items:center;justify-content:center;
      backdrop-filter:blur(4px);
    }
    .pu-box {
      background:#0d1526;border:1px solid rgba(0,212,255,.2);border-radius:16px;
      padding:2rem 3rem;text-align:center;
      box-shadow:0 0 40px rgba(0,212,255,.1);
    }
    .pu-spinner {
      width:44px;height:44px;border:3px solid rgba(0,212,255,.15);
      border-top-color:#00d4ff;border-radius:50%;
      animation:pu-spin .8s linear infinite;margin:0 auto 1rem;
    }
    @keyframes pu-spin { to { transform:rotate(360deg); } }
    .pu-box p { color:#e2e8f0;font-size:.95rem;font-family:'Inter',sans-serif; }
  `;
  document.head.appendChild(style);
})();
