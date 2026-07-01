/**
 * BusinessOS v1.3 — AuthService
 *
 * Facade over an AuthProvider. Swapping auth implementations
 * (FakeAuth → JWT → OAuth) only requires changing the provider.
 *
 * API SLOT: AUTH
 * FUTURE: import JWTAuthProvider and set it here
 */

import StorageService from '../core/storage.js';
import AppState from '../core/appState.js';
import Logger from './logger.js';
import FakeAuthProvider from '../providers/auth/FakeAuthProvider.js';

const AuthService = (() => {
  // API SLOT: AUTH
  // FUTURE: swap to JWTAuthProvider
  const _auth = new FakeAuthProvider(StorageService.getProvider());

  async function register({ name, email, password, company }) {
    const result = await _auth.register({ name, email, password, company });
    if (result.ok) {
      Logger.auth('register', `Novo usuário cadastrado: ${email}`);
    }
    return result;
  }

  async function login(email, password) {
    const result = await _auth.login(email, password);
    if (result.ok) {
      AppState.hydrate();
      AppState.setUser({
        id:      result.user.id,
        name:    result.user.name,
        email:   result.user.email,
        role:    result.user.role || 'admin',
        company: result.user.company,
        companyId: result.user.companyId,
      });
      Logger.auth('login', `Login: ${email}`);
    }
    return result;
  }

  function logout() {
    const user = getSession();
    if (user) Logger.auth('logout', `Logout: ${user.email}`);
    StorageService.clearSession();
    AppState.reset();
    window.location.href = 'login.html';
  }

  function getSession() {
    return StorageService.getSession();
  }

  function requireAuth() {
    if (!getSession()) {
      window.location.href = 'login.html';
      return null;
    }
    return getSession();
  }

  return { register, login, logout, getSession, requireAuth };
})();

export default AuthService;
