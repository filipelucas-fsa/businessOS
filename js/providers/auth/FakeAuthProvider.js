/**
 * BusinessOS v1.3 — FakeAuthProvider
 *
 * Implements authentication using simple localStorage-based sessions.
 * Password is hashed with a simple deterministic hash (demo only).
 *
 * API SLOT: AUTH
 * FUTURE: Replace with JWTAuthProvider (bcrypt + JWT + refresh tokens)
 *
 * The interface exposes the same methods regardless of provider,
 * so swapping is zero-impact on the rest of the app.
 */

export class FakeAuthProvider {
  constructor(storageProvider) {
    this.storage = storageProvider;
  }

  // Simple deterministic hash (NOT cryptographically secure — demo only)
  // FUTURE: Replace with bcrypt on the server
  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  }

  async register({ name, email, password, company }) {
    const existing = await this.storage.findUserByEmail(email);
    if (existing) return { ok: false, error: 'E-mail já cadastrado.' };

    // V1.3: Each user belongs to a company (tenant)
    const companyId = `company_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const companyRecord = {
      id:        companyId,
      name:      company || 'Minha Empresa',
      plan:      'free',           // API SLOT: PAYMENT — upgrade via Stripe/MercadoPago
      createdAt: Date.now(),
    };
    await this.storage.saveCompany(companyRecord);

    const user = {
      id:           this.storage.generateId ? this.storage.generateId() : crypto.randomUUID(),
      name,
      email,
      companyId,
      company:      company || 'Minha Empresa',
      role:         'admin',
      passwordHash: this._hash(password),
      createdAt:    Date.now(),
    };
    await this.storage.saveUser(user);
    return { ok: true, user, company: companyRecord };
  }

  async login(email, password) {
    const user = await this.storage.findUserByEmail(email);
    if (!user)                               return { ok: false, error: 'Usuário não encontrado.' };
    if (user.passwordHash !== this._hash(password)) return { ok: false, error: 'Senha incorreta.' };

    const companyRecord = await this.storage.getCompany(user.companyId || 'default');
    const sessionData = {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      company:   user.company,
      companyId: user.companyId || 'default',
      role:      user.role || 'admin',
      plan:      companyRecord?.plan || 'free',
    };
    await this.storage.setSession(sessionData);

    // API SLOT: AUTH
    // FUTURE: Return JWT token from server instead of saving session locally
    // const { token, refreshToken } = await api.post('/auth/login', { email, password });
    // localStorage.setItem('bos_token', token);

    return { ok: true, user: sessionData };
  }

  async logout() {
    await this.storage.clearSession();
    // API SLOT: AUTH
    // FUTURE: Invalidate JWT on server: await api.post('/auth/logout');
    window.location.href = 'login.html';
  }

  async getSession() {
    return this.storage.getSession();
  }

  async refreshSession() {
    // API SLOT: AUTH
    // FUTURE: Use refresh token to get new JWT
    return this.getSession();
  }
}

export default FakeAuthProvider;
