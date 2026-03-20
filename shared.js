// ─── ProLaunch Shared Utilities ───────────────────────────────────────────────

const PL = {

  // ── Google Apps Script Web App URL (replace after setup) ──
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbym_6LZz39SwCV8F8smkilUCxEqbTOy-A9IJ5YiTbffqBdbri5Bjxy2ZN5k8bzwU3Kd/exec',

  // ── Selar payment link ──
  SELAR_LINK: 'https://selar.com/premium-access',

  // ── Premium access duration: 24 hours in ms ──
  ACCESS_DURATION: 24 * 60 * 60 * 1000,

  // ── Save biodata to localStorage ──
  saveBiodata(data) {
    localStorage.setItem('pl_user', JSON.stringify(data));
  },

  // ── Get saved biodata ──
  getBiodata() {
    try { return JSON.parse(localStorage.getItem('pl_user')) || null; }
    catch { return null; }
  },

  // ── Check if user has filled biodata ──
  hasBiodata() {
    const u = this.getBiodata();
    return u && u.name && u.email && u.level && u.role;
  },

  // ── Grant premium access (timestamp-based) ──
  grantPremium() {
    localStorage.setItem('pl_premium', Date.now().toString());
  },

  // ── Check if premium is active ──
  isPremium() {
    const ts = localStorage.getItem('pl_premium');
    if (!ts) return false;
    return (Date.now() - parseInt(ts)) < this.ACCESS_DURATION;
  },

  // ── Get remaining premium time as string ──
  premiumTimeLeft() {
    const ts = localStorage.getItem('pl_premium');
    if (!ts) return null;
    const remaining = this.ACCESS_DURATION - (Date.now() - parseInt(ts));
    if (remaining <= 0) return null;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return `${h}h ${m}m`;
  },

  // ── Send biodata to Google Sheets via Apps Script ──
  async sendToSheets(data) {
    if (!this.SHEETS_URL || this.SHEETS_URL.includes('YOUR_GOOGLE')) return;
    try {
      await fetch(this.SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.warn('Sheets sync failed:', e); }
  },

  // ── Build Selar URL with email prefilled ──
  getSelarUrl() {
    const user = this.getBiodata();
    const base = this.SELAR_LINK;
    if (user?.email) return `${base}?email=${encodeURIComponent(user.email)}`;
    return base;
  },

  // ── Redirect to biodata if not filled ──
  requireBiodata() {
    if (!this.hasBiodata()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  },

  // ── Show toast notification ──
  toast(msg, type = 'success') {
    let el = document.getElementById('pl-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pl-toast';
      el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;padding:0.9rem 1.4rem;border-radius:12px;color:white;font-weight:600;font-size:0.875rem;z-index:9999;transform:translateY(80px);opacity:0;transition:all 0.4s;max-width:320px;font-family:'DM Sans',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.15);`;
      document.body.appendChild(el);
    }
    const colors = { success: '#7bb640', error: '#ef4444', info: '#19a08c', warn: '#f59e0b' };
    el.style.background = colors[type] || colors.success;
    el.textContent = msg;
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
    setTimeout(() => { el.style.transform = 'translateY(80px)'; el.style.opacity = '0'; }, 4500);
  },

  // ── Call backend AI proxy ──
  async callAI(prompt) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data.text;
  },

  // ── Download content as .doc ──
  downloadDoc(content, filename) {
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head><meta charset='utf-8'><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.6;}</style></head>
      <body>${content.replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
};
