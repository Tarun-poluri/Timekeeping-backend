export function successResponse(res, message, data = {}, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function errorResponse(res, message, error = 'Error', status = 400) {
  return res.status(status).json({ success: false, message, error });
}
