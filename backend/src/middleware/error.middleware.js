export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`)
  error.statusCode = 404
  next(error)
}

export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : error.message
  if (statusCode >= 500) {
    console.error('API request failed', {
      method: _request.method,
      path: _request.originalUrl,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    })
  }

  response.status(statusCode).json({
    success: false,
    message,
    ...(error.code ? { code: error.code } : {}),
    ...(error.email ? { email: error.email } : {}),
    errors: error.details || [],
  })
}
