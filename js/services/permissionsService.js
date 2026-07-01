/**
 * BusinessOS — PermissionsService
 *
 * Role-based access control scaffold. The full multi-role flow ships in a
 * later version; today only `admin` exists at runtime, but every UI control
 * that is conceptually role-gated already consults this service.
 *
 *   Roles:   admin · manager · employee · finance
 *   Perms:   <module>.<action>  e.g. "products.create", "finance.read"
 *
 * To add a new gated control:
 *
 *     if (!PermissionsService.can('products.delete')) return;
 *
 * To grant a role to a user later (V1.2+):
 *
 *     PermissionsService.assign(userId, 'manager');
 */

import StorageService from '../core/storage.js';
import AppState from '../core/appState.js';

const PermissionsService = (() => {
  const ROLES = {
    admin: { label: 'Administrador', permissions: ['*'] },
    manager: {
      label: 'Gerente',
      permissions: [
        'products.*', 'customers.*', 'sales.*',
        'reports.read', 'finance.read', 'settings.read',
      ],
    },
    employee: {
      label: 'Funcionário',
      permissions: ['products.read', 'customers.read', 'sales.create', 'sales.read'],
    },
    finance: {
      label: 'Financeiro',
      permissions: ['finance.*', 'reports.*', 'sales.read', 'products.read', 'customers.read'],
    },
  };

  function _match(pattern, permission) {
    if (pattern === '*') return true;
    if (pattern === permission) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return permission.startsWith(prefix + '.');
    }
    return false;
  }

  function currentRole() {
    return AppState.get('user')?.role || 'admin';
  }

  function can(permission) {
    const role = ROLES[currentRole()];
    if (!role) return false;
    return role.permissions.some(p => _match(p, permission));
  }

  function listRoles() { return ROLES; }

  function assign(userId, role) {
    if (!ROLES[role]) throw new Error(`Unknown role: ${role}`);
    const users = StorageService.getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return null;
    u.role = role;
    StorageService.saveUser(u);
    return u;
  }

  return { ROLES, currentRole, can, listRoles, assign };
})();

export default PermissionsService;
