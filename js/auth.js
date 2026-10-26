// ============================================================
// auth.js — sign in / sign up / reset / guest mode / account tools
//
// Cloud features switch on only when config.js has a Supabase URL
// and publishable key. Without them the app runs local-only, exactly
// like the original demo ("guest" mode).
// ============================================================

const Auth = {
  user: null,
  mode: 'signin',          // signin | signup | reset | newpass
  busy: false,

  // Resolves once the app may render (signed in, or chosen guest).
  async boot() {
    const show = id => document.getElementById(id)?.classList.remove('hidden');

    if (!CONFIG.CLOUD_ENABLED) {
      Storage.setScope('guest');
      Sync.setStatus('local');
      this.renderAccountBox();
      return;
    }

    // Cloud is configured but the client library didn't load (offline / blocked CDN).
    // Never silently fall back to guest mode: that would hide the user's data
    // and send their edits to the wrong place.
    if (typeof supabase === 'undefined' || !Sync.init(supabase.createClient)) {
      let last = null;
      try { last = JSON.parse(localStorage.getItem('hed_last_user') || 'null'); } catch (e) {}
      if (last && last.id) {
        this.user = last;
        Sync.resume(last.id);                       // read saved data; queue edits for later
        this.renderAccountBox();
        showToast('📴 Could not reach the sync service — working from saved data. Changes will upload when you are back online.', 'info');
        window.addEventListener('online', () => {
          if (document.querySelector('.modal:not(.hidden)')) showToast('Back online — reload the page to sync.', 'info');
          else location.reload();
        });
        return;
      }
      this.mode = 'unavailable';
      show('auth-screen');
      this.renderScreen();
      await new Promise(resolve => { this._resolveBoot = resolve; });
      return;
    }

    // A password-recovery link lands here with a recovery session.
    Sync.client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { this.mode = 'newpass'; this.renderScreen(); }
      if (event === 'SIGNED_OUT' && this.user) location.reload();
    });

    const { data } = await Sync.client.auth.getSession();
    if (data.session) {
      await this.enter(data.session.user);
      return;
    }
    if (localStorage.getItem('hed_use_guest') === '1') {
      Storage.setScope('guest');
      Sync.setStatus('local');
      this.renderAccountBox();
      return;
    }
    show('auth-screen');
    this.renderScreen();
    await new Promise(resolve => { this._resolveBoot = resolve; });
  },

  async enter(user) {
    this.user = user;
    try { localStorage.setItem('hed_last_user', JSON.stringify({ id: user.id, email: user.email })); } catch (e) {}
    document.getElementById('auth-screen')?.classList.add('hidden');
    await Sync.start(user.id);
    await this.offerMigration();
    this.renderAccountBox();
    if (this._resolveBoot) { this._resolveBoot(); this._resolveBoot = null; }
  },

  useGuest() {
    try { localStorage.setItem('hed_use_guest', '1'); } catch (e) {}
    Storage.setScope('guest');
    Sync.setStatus('local');
    document.getElementById('auth-screen').classList.add('hidden');
    this.renderAccountBox();
    if (this._resolveBoot) { this._resolveBoot(); this._resolveBoot = null; }
  },

  // ── Screen ─────────────────────────────────────────────────
  setMode(m) { this.mode = m; this.renderScreen(); },

  renderScreen() {
    const el = document.getElementById('auth-screen');
    if (!el) return;
    el.classList.remove('hidden');
    const m = this.mode;
    if (m === 'unavailable') {
      el.innerHTML = `
        <div class="auth-card">
          <div class="auth-logo">📡</div>
          <h2>Can't reach the sign-in service</h2>
          <p class="auth-sub">Check your internet connection and try again. If you have never signed in on this device you'll need to be online once.</p>
          <button class="btn btn-primary auth-btn" onclick="location.reload()">Try again</button>
          <button class="btn btn-outline auth-btn" onclick="Auth.useGuest()">Continue without an account</button>
          <p class="auth-fine">Guest data stays in this browser only.</p>
        </div>`;
      return;
    }
    const title = { signin: 'Welcome back', signup: 'Create your account', reset: 'Reset password', newpass: 'Choose a new password' }[m];
    const cta   = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link', newpass: 'Save new password' }[m];
    el.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">🎓</div>
        <h2>${title}</h2>
        <p class="auth-sub">Track your MS / PhD journey — synced across all your devices.</p>
        <div id="auth-msg" class="auth-msg hidden" role="alert"></div>
        <form onsubmit="Auth.submit(event)" novalidate>
          ${m !== 'newpass' ? `
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com">
          </div>` : ''}
          ${m !== 'reset' ? `
          <div class="form-group">
            <label for="auth-password">${m === 'newpass' ? 'New password' : 'Password'}</label>
            <input id="auth-password" name="password" type="password" required minlength="8"
                   autocomplete="${m === 'signin' ? 'current-password' : 'new-password'}" placeholder="At least 8 characters">
          </div>` : ''}
          <button type="submit" class="btn btn-primary auth-btn" id="auth-submit">${cta}</button>
        </form>
        <div class="auth-links">
          ${m === 'signin' ? `<a href="#" onclick="Auth.setMode('reset');return false">Forgot password?</a>
                              <a href="#" onclick="Auth.setMode('signup');return false">Create account</a>` : ''}
          ${m === 'signup' ? `<a href="#" onclick="Auth.setMode('signin');return false">I already have an account</a>` : ''}
          ${m === 'reset'  ? `<a href="#" onclick="Auth.setMode('signin');return false">Back to sign in</a>` : ''}
        </div>
        ${m === 'signin' || m === 'signup' ? `
        <div class="auth-divider"><span>or</span></div>
        <button class="btn btn-outline auth-btn" onclick="Auth.useGuest()">Continue without an account</button>
        <p class="auth-fine">Without an account your data stays in this browser only — no sync, no backup.</p>` : ''}
      </div>`;
    el.querySelector('input')?.focus();
  },

  message(text, kind = 'error') {
    const box = document.getElementById('auth-msg');
    if (!box) return;
    box.textContent = text;
    box.className = `auth-msg auth-msg-${kind}`;
  },

  friendly(error) {
    const msg = (error && error.message) || 'Something went wrong.';
    if (/invalid login credentials/i.test(msg)) return 'Email or password is incorrect.';
    if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox.';
    if (/already registered|already been registered/i.test(msg)) return 'That email already has an account. Try signing in.';
    if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
    if (/password.*(short|least|weak)/i.test(msg)) return msg;
    if (/fetch|network/i.test(msg)) return 'Cannot reach the server. Check your internet connection.';
    return msg;
  },

  async submit(ev) {
    ev.preventDefault();
    if (this.busy) return;
    const form = ev.target;
    const email = form.email ? form.email.value.trim() : '';
    const password = form.password ? form.password.value : '';

    if (this.mode !== 'newpass' && !/^\S+@\S+\.\S+$/.test(email)) return this.message('Enter a valid email address.');
    if (this.mode !== 'reset' && password.length < 8) return this.message('Password must be at least 8 characters.');

    this.busy = true;
    const btn = document.getElementById('auth-submit');
    btn.disabled = true;
    const auth = Sync.client.auth;
    try {
      if (this.mode === 'signin') {
        const { data, error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        try { localStorage.removeItem('hed_use_guest'); } catch (e) {}
        await this.enter(data.user);
      } else if (this.mode === 'signup') {
        const { data, error } = await auth.signUp({
          email, password,
          options: { emailRedirectTo: location.origin + location.pathname },
        });
        if (error) throw error;
        // Supabase returns an obfuscated user with no identities for an existing email.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('already registered');
        }
        if (data.session) {
          try { localStorage.removeItem('hed_use_guest'); } catch (e) {}
          await this.enter(data.user);
        } else {
          this.message('Account created. Check your email and click the confirmation link, then sign in.', 'ok');
        }
      } else if (this.mode === 'reset') {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        this.message('If that email has an account, a reset link is on its way.', 'ok');
      } else if (this.mode === 'newpass') {
        const { error } = await auth.updateUser({ password });
        if (error) throw error;
        const { data } = await auth.getSession();
        history.replaceState(null, '', location.pathname);
        this.mode = 'signin';
        if (data.session) await this.enter(data.session.user);
      }
    } catch (e) {
      this.message(this.friendly(e));
    } finally {
      this.busy = false;
      if (btn) btn.disabled = false;
    }
  },

  async signOut() {
    if (Sync.pendingCount() &&
        !confirm(`${Sync.pendingCount()} change(s) have not synced yet and will be lost on this device if you sign out. Sign out anyway?`)) return;
    // Remove this account's cache from the device so the next person sees nothing.
    const uid = this.user && this.user.id;
    await Sync.client.auth.signOut();
    try { localStorage.removeItem('hed_last_user'); } catch (e) {}
    if (uid) {
      Object.keys(localStorage).filter(k => k.startsWith(`hed:${uid}:`)).forEach(k => localStorage.removeItem(k));
    }
    location.reload();
  },

  // ── One-time import of data created before the account ─────
  guestSnapshot() {
    const prev = Storage.scope;
    Storage.setScope('guest');
    const out = {};
    Object.entries(Storage.SYNCED).forEach(([key, kind]) => {
      const v = Storage.rawGet(key);
      if (v === null) return;
      if (Storage.SINGLETONS.includes(kind)) {
        if (v && (v.name || v.target || v.fieldOfStudy)) out[key] = v;
      } else if (Array.isArray(v)) {
        const real = v.filter(r => r && !/_s\d+$/.test(String(r.id)));   // skip demo sample rows
        if (real.length) out[key] = real;
      }
    });
    Storage.setScope(prev);
    return out;
  },

  async offerMigration() {
    const flag = `hed:${this.user.id}:migrated`;
    if (localStorage.getItem(flag)) return;
    const snap = this.guestSnapshot();
    const keys = Object.keys(snap);
    if (!keys.length) { localStorage.setItem(flag, '1'); return; }
    const total = keys.reduce((n, k) => n + (Array.isArray(snap[k]) ? snap[k].length : 1), 0);

    if (confirm(`Found ${total} item(s) saved on this device before you signed in.\n\nUpload them to your account? (Demo sample data is skipped.)`)) {
      keys.forEach(key => {
        const kind = Storage.SYNCED[key];
        if (Storage.SINGLETONS.includes(kind)) {
          const cur = Storage.get(key);
          if (!cur || !cur.setupDone) Storage.set(key, { ...snap[key], ...(cur || {}) });
        } else {
          const cur = Storage.get(key) || [];
          const have = new Set(cur.map(r => String(r.id)));
          Storage.set(key, cur.concat(snap[key].filter(r => !have.has(String(r.id)))));
        }
      });
      // The data now lives in this account's cache + outbox. Remove the shared
      // guest copy so the next person to sign in on this device is never offered it.
      keys.forEach(key => { try { localStorage.removeItem(key); } catch (e) {} });
      if (typeof showToast === 'function') showToast('✅ Local data uploaded to your account.', 'success');
    }
    localStorage.setItem(flag, '1');
  },

  // ── Sidebar account box ────────────────────────────────────
  renderAccountBox() {
    const el = document.getElementById('account-box');
    if (!el) return;
    if (this.user) {
      el.innerHTML = `
        <div class="account-email" title="${esc(this.user.email)}">👤 ${esc(this.user.email)}</div>
        <button onclick="Auth.signOut()">🚪 Sign out</button>`;
    } else if (CONFIG.CLOUD_ENABLED) {
      el.innerHTML = `
        <div class="account-email">Guest — not synced</div>
        <button onclick="localStorage.removeItem('hed_use_guest');location.reload()">☁️ Sign in / create account</button>`;
    } else {
      el.innerHTML = `<div class="account-email">Local only — cloud sync not configured</div>`;
    }
  },

  // ── Danger zone ────────────────────────────────────────────
  async deleteAccount() {
    if (!this.user) return;
    const typed = prompt('This permanently deletes your account, all records and all uploaded files from the cloud.\n\nType DELETE to confirm:');
    if (typed !== 'DELETE') return;
    try {
      await Files.removeAllMine();                       // storage objects first
      const { error } = await Sync.client.rpc('delete_my_account');
      if (error) throw error;
      const uid = this.user.id;
      Object.keys(localStorage).filter(k => k.startsWith(`hed:${uid}:`)).forEach(k => localStorage.removeItem(k));
      await Sync.client.auth.signOut().catch(() => {});
      try { localStorage.removeItem('hed_last_user'); } catch (e) {}
      alert('Your account and data have been deleted.');
      location.reload();
    } catch (e) {
      showToast('❌ Could not delete account: ' + this.friendly(e), 'error');
    }
  },
};
