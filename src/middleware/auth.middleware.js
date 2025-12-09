import { verifyToken } from '../utils/jwt.util.js';
import { prisma } from '../config/db.js';
import { MESSAGES } from '../config/messages.js';
import { errorResponse } from '../utils/response.util.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
    }

    req.user = { id: user.id, name: user.name, email: user.email,role:user.role };
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Auth middleware error:', err);
    return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Only admin can access this endpoint', 'ForbiddenError', 403);
  }
  return next();
}
