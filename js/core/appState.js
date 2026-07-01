/**
 * BusinessOS — AppState
 *
 * Single source of truth for application-wide runtime state. All screens
 * should consult AppState instead of duplicating session/company/theme
 * reads scattered through the codebase.
 *
 * State is hydrated from StorageService at boot and persisted on every
 * mutation. Subscribers are notified through EventBus (`APPSTATE_CHANGED`)
 * so any view can react to login/logout, theme switches, language changes,
 * module activation, etc.
 *
 * Shape:
 *   {
 *     user:       { id, name, email, role } | null,
 *     company:    { id, name, logo, currency } | null,
 *     modules:    string[],         // active module ids
 *     theme:      'light' | 'dark',
 *     language:   'pt-BR' | 'en-US' | 'es-ES',
 *     settings:   object,           // user preferences
 *     session:    { startedAt, lastActivity } | null,
 *   }
 */

import StorageService from './storage.js';
import EventBus from './eventBus.js';

const AppState = (() => {
  const DEFAULTS = {
    user: null,
    company: null,
    modules: ['products', 'customers', 'sales', 'finance', 'reports', 'settings'],
    theme: 'light',
    language: 'pt-BR',
    settings: {},
    session: null,
  };

  let _state = { ...DEFAULTS };
  let _hydrated = false;

  function _persist() {
    StorageService._setRaw('appstate', _state);
  }

  function hydrate() {
    if (_hydrated) return _state;
    const saved = StorageService._getRaw('appstate', null);
    const session = StorageService.getSession();
    const settings = StorageService.getSettings();

    _state = {
      ...DEFAULTS,
      ...(saved || {}),
      user: session ? { id: session.id, name: session.name, email: session.email, role: session.role || 'admin' } : null,
      company: session ? { id: session.id, name: session.company || 'Minha Empresa', logo: settings?.companyLogo || null, currency: settings?.currency || 'BRL' } : null,
      modules: StorageService.getActiveModules(),
      theme: settings?.theme || 'light',
      language: settings?.language || 'pt-BR',
      settings: settings || {},
      session: session ? { startedAt: Date.now(), lastActivity: Date.now() } : null,
    };
    _hydrated = true;
    _persist();
    return _state;
  }

  function get(key) {
    if (!_hydrated) hydrate();
    return key ? _state[key] : { ..._state };
  }

  function set(patch) {
    if (!_hydrated) hydrate();
    _state = { ..._state, ...patch };
    _persist();
    EventBus.publish('APPSTATE_CHANGED', { state: { ..._state }, patch });
    return _state;
  }

  function setUser(user) { set({ user }); }
  function setCompany(company) { set({ company }); }
  function setTheme(theme) { set({ theme }); }
  function setLanguage(language) { set({ language }); }
  function setModules(modules) {
    StorageService.setActiveModules(modules);
    set({ modules });
  }
  function touch() {
    if (!_state.session) return;
    _state.session.lastActivity = Date.now();
    _persist();
  }

  function reset() {
    _state = { ...DEFAULTS };
    _hydrated = false;
    StorageService._removeRaw('appstate');
  }

  return {
    hydrate, get, set,
    setUser, setCompany, setTheme, setLanguage, setModules,
    touch, reset,
  };
})();

export default AppState;
