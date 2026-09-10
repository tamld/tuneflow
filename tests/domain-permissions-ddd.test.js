const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  Role,
  Permission,
  isValidRole,
  isValidPermission,
  hasPermission,
  getPermissionsForRole
} = require('../src/domain/permissions');

const { requirePermission } = require('../src/middleware/authorize');

describe('DDD Bounded Context: TuneFlow Roles & Permissions Domain Suite', () => {
  describe('Domain Value Objects & Enums', () => {
    it('should define canonical system roles (Role)', () => {
      assert.equal(Role.ADMIN, 'admin');
      assert.equal(Role.USER, 'user');
      assert.equal(Role.GUEST, 'guest');
      assert.ok(Object.isFrozen(Role), 'Role enum must be frozen');
    });

    it('should define granular domain capabilities (Permission)', () => {
      assert.equal(Permission.MUSIC_SEARCH, 'music:search');
      assert.equal(Permission.MUSIC_PREVIEW, 'music:preview');
      assert.equal(Permission.MUSIC_STREAM, 'music:stream');
      assert.equal(Permission.QUEUE_DOWNLOAD, 'queue:download');
      assert.equal(Permission.QUEUE_CANCEL, 'queue:cancel');
      assert.equal(Permission.SYSTEM_DIAGNOSTICS, 'system:diagnostics');
      assert.equal(Permission.SYSTEM_MAINTENANCE, 'system:maintenance');
      assert.equal(Permission.USER_CREATE, 'user:create');
      assert.equal(Permission.USER_READ, 'user:read');
      assert.equal(Permission.USER_DELETE, 'user:delete');
      assert.equal(Permission.USER_PASSWORD_RESET, 'user:password_reset');
      assert.equal(Permission.GUEST_READ, 'guest:read');
      assert.equal(Permission.GUEST_RESET_COOLDOWN, 'guest:reset_cooldown');
      assert.ok(Object.isFrozen(Permission), 'Permission enum must be frozen');
    });

    it('should validate roles with isValidRole', () => {
      assert.equal(isValidRole(Role.ADMIN), true);
      assert.equal(isValidRole(Role.USER), true);
      assert.equal(isValidRole(Role.GUEST), true);
      assert.equal(isValidRole('superadmin'), false);
      assert.equal(isValidRole(''), false);
      assert.equal(isValidRole(null), false);
      assert.equal(isValidRole(undefined), false);
    });

    it('should validate permissions with isValidPermission', () => {
      assert.equal(isValidPermission(Permission.QUEUE_DOWNLOAD), true);
      assert.equal(isValidPermission(Permission.SYSTEM_MAINTENANCE), true);
      assert.equal(isValidPermission('arbitrary:hack'), false);
      assert.equal(isValidPermission(''), false);
      assert.equal(isValidPermission(null), false);
    });
  });

  describe('Domain Invariant 1: Universal Admin Permissions', () => {
    it('admin role must possess 100% of all declared domain permissions', () => {
      const allPermissions = Object.values(Permission);
      assert.ok(allPermissions.length >= 13, 'Must have at least 13 granular permissions');

      for (const perm of allPermissions) {
        assert.equal(
          hasPermission(Role.ADMIN, perm),
          true,
          `Admin must have permission ${perm}`
        );
      }
    });

    it('getPermissionsForRole(admin) should return all permissions immutably', () => {
      const perms = getPermissionsForRole(Role.ADMIN);
      assert.equal(perms.length, Object.values(Permission).length);
      // Ensure modifying returned array does not corrupt internal state
      perms.pop();
      assert.equal(getPermissionsForRole(Role.ADMIN).length, Object.values(Permission).length);
    });
  });

  describe('Domain Invariant 2: Leisure User Capabilities Boundary', () => {
    it('user role must possess full consumer capabilities (search, preview, stream, download, cancel)', () => {
      assert.equal(hasPermission(Role.USER, Permission.MUSIC_SEARCH), true);
      assert.equal(hasPermission(Role.USER, Permission.MUSIC_PREVIEW), true);
      assert.equal(hasPermission(Role.USER, Permission.MUSIC_STREAM), true);
      assert.equal(hasPermission(Role.USER, Permission.QUEUE_DOWNLOAD), true);
      assert.equal(hasPermission(Role.USER, Permission.QUEUE_CANCEL), true);
    });

    it('user role must be strictly forbidden from system & account administration', () => {
      assert.equal(hasPermission(Role.USER, Permission.SYSTEM_DIAGNOSTICS), false);
      assert.equal(hasPermission(Role.USER, Permission.SYSTEM_MAINTENANCE), false);
      assert.equal(hasPermission(Role.USER, Permission.USER_CREATE), false);
      assert.equal(hasPermission(Role.USER, Permission.USER_READ), false);
      assert.equal(hasPermission(Role.USER, Permission.USER_DELETE), false);
      assert.equal(hasPermission(Role.USER, Permission.USER_PASSWORD_RESET), false);
      assert.equal(hasPermission(Role.USER, Permission.GUEST_READ), false);
      assert.equal(hasPermission(Role.USER, Permission.GUEST_RESET_COOLDOWN), false);
    });
  });

  describe('Domain Invariant 3: Guest Confinement Boundary', () => {
    it('guest role must only possess public search, preview, and stream', () => {
      assert.equal(hasPermission(Role.GUEST, Permission.MUSIC_SEARCH), true);
      assert.equal(hasPermission(Role.GUEST, Permission.MUSIC_PREVIEW), true);
      assert.equal(hasPermission(Role.GUEST, Permission.MUSIC_STREAM), true);
    });

    it('guest role must be strictly blocked from downloading MP3 or modifying queue', () => {
      assert.equal(hasPermission(Role.GUEST, Permission.QUEUE_DOWNLOAD), false);
      assert.equal(hasPermission(Role.GUEST, Permission.QUEUE_CANCEL), false);
    });

    it('guest role must be strictly blocked from all administration', () => {
      assert.equal(hasPermission(Role.GUEST, Permission.SYSTEM_DIAGNOSTICS), false);
      assert.equal(hasPermission(Role.GUEST, Permission.SYSTEM_MAINTENANCE), false);
      assert.equal(hasPermission(Role.GUEST, Permission.USER_CREATE), false);
      assert.equal(hasPermission(Role.GUEST, Permission.USER_READ), false);
      assert.equal(hasPermission(Role.GUEST, Permission.USER_DELETE), false);
      assert.equal(hasPermission(Role.GUEST, Permission.GUEST_READ), false);
    });
  });

  describe('Domain Policy Edge Cases & Robustness', () => {
    it('should return false for unrecognized roles or permissions', () => {
      assert.equal(hasPermission('hacker', Permission.MUSIC_SEARCH), false);
      assert.equal(hasPermission(null, Permission.MUSIC_SEARCH), false);
      assert.equal(hasPermission(undefined, Permission.MUSIC_SEARCH), false);
      assert.equal(hasPermission(Role.ADMIN, 'unknown:perm'), false);
      assert.equal(hasPermission(Role.ADMIN, null), false);
    });

    it('getPermissionsForRole should return empty array for invalid roles', () => {
      assert.deepEqual(getPermissionsForRole('invalid'), []);
      assert.deepEqual(getPermissionsForRole(null), []);
    });
  });

  describe('Middleware: requirePermission(permission)', () => {
    it('should reject unauthenticated request with 401', () => {
      const middleware = requirePermission(Permission.QUEUE_DOWNLOAD);
      let status = null;
      let body = null;
      const req = {};
      const res = {
        status(code) {
          status = code;
          return {
            json(data) { body = data; }
          };
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      middleware(req, res, next);

      assert.equal(nextCalled, false);
      assert.equal(status, 401);
      assert.equal(body.error, 'UNAUTHORIZED');
    });

    it('should reject unauthorized role with 403 and requiredPermission info', () => {
      const middleware = requirePermission(Permission.SYSTEM_MAINTENANCE);
      let status = null;
      let body = null;
      const req = { user: { role: Role.USER } };
      const res = {
        status(code) {
          status = code;
          return {
            json(data) { body = data; }
          };
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      middleware(req, res, next);

      assert.equal(nextCalled, false);
      assert.equal(status, 403);
      assert.equal(body.error, 'FORBIDDEN');
      assert.equal(body.requiredPermission, Permission.SYSTEM_MAINTENANCE);
    });

    it('should allow authorized role to proceed to next()', () => {
      const middleware = requirePermission(Permission.QUEUE_DOWNLOAD);
      const req = { user: { role: Role.USER } };
      let resCalled = false;
      const res = {
        status() {
          resCalled = true;
          return { json() {} };
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      middleware(req, res, next);

      assert.equal(nextCalled, true);
      assert.equal(resCalled, false);
    });
  });
});
