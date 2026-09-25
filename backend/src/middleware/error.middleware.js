export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`)
  error.statusCode = 404
  next(error)
}

export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : error.message

  response.status(statusCode).json({
    success: false,
    message,
    errors: error.details || [],
  })
}
