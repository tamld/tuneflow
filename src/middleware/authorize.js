const { hasPermission } = require('../domain/permissions');

function authorize(...allowedRoles) {
  return function rbacGate(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để thực hiện thao tác này'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    next();
  };
}

function requirePermission(permission) {
  return function permissionGate(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để thực hiện thao tác này'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này',
        requiredPermission: permission
      });
    }

    next();
  };
}

module.exports = {
  authorize,
  requirePermission
};
