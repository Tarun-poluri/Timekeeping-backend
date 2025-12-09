import { errorResponse } from '../utils/response.util.js';

export function notFoundHandler(req, res) {
  return errorResponse(res, 'Route not found', 'NotFoundError', 404);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const error = err.name || 'Error';
  return errorResponse(res, message, error, status);
}
