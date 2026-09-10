/**
 * TuneFlow Domain-Driven Design (DDD) Bounded Context: Roles & Permissions
 * Single Source of Truth for Role-Based Access Control (RBAC) and Capability Boundaries.
 */

const Role = Object.freeze({
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
});

const Permission = Object.freeze({
  // Music Discovery & Playback
  MUSIC_SEARCH: 'music:search',
  MUSIC_PREVIEW: 'music:preview',
  MUSIC_STREAM: 'music:stream',

  // Queue & Download Management
  QUEUE_DOWNLOAD: 'queue:download',
  QUEUE_CANCEL: 'queue:cancel',

  // System Administration & Health
  SYSTEM_DIAGNOSTICS: 'system:diagnostics',
  SYSTEM_MAINTENANCE: 'system:maintenance',

  // User Account Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_DELETE: 'user:delete',
  USER_PASSWORD_RESET: 'user:password_reset',

  // Guest Session Governance
  GUEST_READ: 'guest:read',
  GUEST_RESET_COOLDOWN: 'guest:reset_cooldown'
});

const ROLE_PERMISSIONS = Object.freeze({
  [Role.ADMIN]: Object.freeze(Object.values(Permission)),
  [Role.USER]: Object.freeze([
    Permission.MUSIC_SEARCH,
    Permission.MUSIC_PREVIEW,
    Permission.MUSIC_STREAM,
    Permission.QUEUE_DOWNLOAD,
    Permission.QUEUE_CANCEL
  ]),
  [Role.GUEST]: Object.freeze([
    Permission.MUSIC_SEARCH,
    Permission.MUSIC_PREVIEW,
    Permission.MUSIC_STREAM
  ])
});

/**
 * Validates if the given string represents a valid system role.
 * @param {string} role
 * @returns {boolean}
 */
function isValidRole(role) {
  if (!role || typeof role !== 'string') return false;
  return Object.values(Role).includes(role);
}

/**
 * Validates if the given string represents a valid domain permission.
 * @param {string} permission
 * @returns {boolean}
 */
function isValidPermission(permission) {
  if (!permission || typeof permission !== 'string') return false;
  return Object.values(Permission).includes(permission);
}

/**
 * Checks if a given role possesses a specific permission.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  if (!isValidRole(role) || !isValidPermission(permission)) {
    return false;
  }
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions ? rolePermissions.includes(permission) : false;
}

/**
 * Retrieves all permissions associated with a role as an immutable array copy.
 * @param {string} role
 * @returns {string[]}
 */
function getPermissionsForRole(role) {
  if (!isValidRole(role)) {
    return [];
  }
  return [...(ROLE_PERMISSIONS[role] || [])];
}

module.exports = {
  Role,
  Permission,
  ROLE_PERMISSIONS,
  isValidRole,
  isValidPermission,
  hasPermission,
  getPermissionsForRole
};
