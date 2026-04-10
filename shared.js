// ─── ProLaunch Shared Utilities v3.1 ─────────────────────────────────────────

const PL = {

  // ── Single Selar product URL — user selects tier on Selar's checkout page ──
  // Set this to your Selar product URL once created
  SELAR_URL: 'https://selar.com/premium-access',

  // ── Promo end date ──
  PROMO_END: new Date('2026-04-30T23:59:59').getTime(),

  // ── Three premium tiers ──
  // Amounts must match exactly what you set on Selar for each variant
  PLANS: {
    '24h':   { label: '24-Hour Access', duration: 24 * 60 * 60 * 1000,      amount: 1000  },
    '7day':  { label: '7-Day Access',   duration: 7  * 24 * 60 * 60 * 1000, amount: 4999  },
    '30day': { label: '30-Day Access',  duration: 30 * 24 * 60 * 60 * 1000, amount: 9999  },
  },

  HISTORY_MAX: 10,

  CGC: {
    url:        'https://selar.com/career-grooming-camp',
    price:      '₦10,000',
    nextCohort: 'May 2026',
  },

  // ── Biodata ──────────────────────────────────────────────────────────────
  saveBiodata(data) { localStorage.setItem('pl_user', JSON.stringify(data)); },
  getBiodata() { try { return JSON.parse(localStorage.getItem('pl_user')) || null; } catch { return null; } },
  hasBiodata() { const u = this.getBiodata(); return !!(u && u.name && u.email && u.level && u.role); },

  // ── Premium ───────────────────────────────────────────────────────────────
  // Called by the webhook handler (server-side) which writes plan+ts to Sheets.
  // Client-side this is called after /api/lookup-user confirms the plan.
  grantPremium(plan, ts = Date.now()) {
    localStorage.setItem('pl_premium', JSON.stringify({ plan, ts }));
  },

  isPremium() {
    try {
      const { plan, ts } = JSON.parse(localStorage.getItem('pl_premium') || 'null') || {};
      if (!plan || !ts) return false;
      return (Date.now() - ts) < (this.PLANS[plan]?.duration || 0);
    } catch { return false; }
  },

  premiumPlan() {
    try {
      const { plan, ts } = JSON.parse(localStorage.getItem('pl_premium') || 'null') || {};
      if (!plan || !ts) return null;
      return (Date.now() - ts) < (this.PLANS[plan]?.duration || 0) ? plan : null;
    } catch { return null; }
  },

  premiumTimeLeft() {
    try {
      const { plan, ts } = JSON.parse(localStorage.getItem('pl_premium') || 'null') || {};
      if (!plan || !ts) return null;
      const remaining = (this.PLANS[plan]?.duration || 0) - (Date.now() - ts);
      if (remaining <= 0) return null;
      const d = Math.floor(remaining / 86400000);
      const h = Math.floor((remaining % 86400000) / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
    } catch { return null; }
  },

  // ── Promo ─────────────────────────────────────────────────────────────────
  isPromoActive() { return Date.now() < this.PROMO_END; },

  promoTimeLeft() {
    const remaining = this.PROMO_END - Date.now();
    if (remaining <= 0) return null;
    return {
      d: Math.floor(remaining / 86400000),
      h: Math.floor((remaining % 86400000) / 3600000),
      m: Math.floor((remaining % 3600000) / 60000),
      s: Math.floor((remaining % 60000) / 1000),
    };
  },

  // ── Single Selar URL — prefill buyer email if available ──────────────────
  getSelarUrl() {
    const user  = this.getBiodata();
    const email = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
    return `${this.SELAR_URL}${email}`;
  },

  // ── User lookup ───────────────────────────────────────────────────────────
  async lookupUser(email) {
    try {
      const res  = await fetch('/api/lookup-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lookup failed');
      return data;
    } catch (e) { console.warn('User lookup failed:', e.message); return { found: false }; }
  },

  // Restores session AND premium grant from server-confirmed lookup result
  restoreSession(lookupResult) {
    if (!lookupResult.found) return false;
    this.saveBiodata({ ...lookupResult.user, returning: true });
    if (lookupResult.premium?.active && lookupResult.premium?.plan) {
      this.grantPremium(lookupResult.premium.plan, lookupResult.premium.timestamp);
    }
    return true;
  },

  // ── Sheets ────────────────────────────────────────────────────────────────
  async sendToSheets(data) {
    const res = await fetch('/api/save-sheet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Backend error');
    return result;
  },

  // ── AI call ───────────────────────────────────────────────────────────────
  async callAI(prompt) {
    const res  = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data.text;
  },

  // ── Report history ────────────────────────────────────────────────────────
  saveReport(type, role, resultObj) {
    const history = this.getHistory();
    history.unshift({ id: Date.now(), type, role, date: new Date().toISOString(), result: resultObj });
    if (history.length > this.HISTORY_MAX) history.splice(this.HISTORY_MAX);
    try { localStorage.setItem('pl_history', JSON.stringify(history)); } catch (_) {}
  },

  getHistory()       { try { return JSON.parse(localStorage.getItem('pl_history')) || []; } catch { return []; } },
  clearHistory()     { localStorage.removeItem('pl_history'); },
  getHistoryById(id) { return this.getHistory().find(e => e.id === id) || null; },

  reportLabel(type) {
    return { analysis: '🔍 CV Analysis', cv: '📄 Resume Build', letter: '✉️ Cover Letter', interview: '🎯 Interview Prep', insights: '💡 Career Insights' }[type] || type;
  },

  // ── DOCX download via /api/generate-docx ─────────────────────────────────
  async downloadDocx(content, filename, type = 'default') {
    try {
      const res = await fetch('/api/generate-docx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename, type }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Download failed'); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${filename}.docx` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toast('✅ Document downloaded!', 'success');
    } catch (e) {
      this.toast('Download failed — trying fallback…', 'warn');
      this._downloadDocFallback(content, filename);
    }
  },

  _downloadDocFallback(content, filename) {
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='utf-8'><style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.6}</style></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword' })), download: `${filename}.doc` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  },

  // ── Optimized CV cache ────────────────────────────────────────────────────
  getOptimizedCV()  { try { return JSON.parse(localStorage.getItem('pl_optimized_cv')) || null; } catch { return null; } },
  getBestCV()       { const o = this.getOptimizedCV(); if (o?.cvText?.length > 50) return o.cvText; const u = this.getBiodata(); return (u?.cvText?.length > 50) ? u.cvText : ''; },
  getBestRole()     { return this.getOptimizedCV()?.jobRole || this.getBiodata()?.role || ''; },
  getBestJD()       { return this.getOptimizedCV()?.jd || ''; },

  // ── Career Grooming Camp ──────────────────────────────────────────────────
  getCGCRecommendation() {
    const user = this.getBiodata();
    if (!user) return null;
    const level = (user.level || '').toLowerCase();
    const role  = user.role || 'your field';
    if (level.includes('student') || level.includes('fresh') || level.includes('entry'))
      return { headline: `New to ${role}? The Career Grooming Camp is built for you.`, body: `As an early-career professional, the Camp will position you strategically, help you build a job-ready portfolio, and get you noticed by the right employers — fast.`, cta: 'Reserve My Spot →', urgency: true };
    if (level.includes('mid'))
      return { headline: `Ready to move up from ${role}?`, body: `Mid-level professionals who attend the Career Grooming Camp report clearer career direction, stronger personal brands, and faster-track promotions. The next cohort opens soon.`, cta: 'Learn More →', urgency: false };
    if (level.includes('senior') || level.includes('executive') || level.includes('director'))
      return { headline: `Elevate your executive presence in ${role}.`, body: `The Career Grooming Camp's advanced track helps senior professionals land board roles, advisory positions, and high-leverage opportunities through strategic positioning.`, cta: 'Explore the Executive Track →', urgency: false };
    return { headline: 'Take your career further with the ProLaunch Career Grooming Camp.', body: `Join a cohort of ambitious professionals to master personal branding, interview strategy, and career advancement in ${role}.`, cta: 'Find Out More →', urgency: false };
  },

  // ── Navigation guard ──────────────────────────────────────────────────────
  requireBiodata() {
    if (!this.hasBiodata()) { window.location.href = '/index.html'; return false; }
    return true;
  },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast(msg, type = 'success') {
    let el = document.getElementById('pl-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pl-toast';
      el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;padding:0.9rem 1.4rem;border-radius:12px;color:white;font-weight:600;font-size:0.875rem;z-index:9999;transform:translateY(80px);opacity:0;transition:all 0.4s;max-width:320px;font-family:'Lato',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.15);`;
      document.body.appendChild(el);
    }
    el.style.background = { success: '#7bb640', error: '#ef4444', info: '#19a08c', warn: '#f59e0b' }[type] || '#7bb640';
    el.textContent = msg;
    el.style.transform = 'translateY(0)'; el.style.opacity = '1';
    setTimeout(() => { el.style.transform = 'translateY(80px)'; el.style.opacity = '0'; }, 4500);
  },
};
