import { dismissNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from './notification.service.js'

async function handle(request, response, next, action, message) {
  try {
    const data = await action()
    response.json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function list(request, response, next) {
  return handle(request, response, next, () => listNotifications(request.auth.userId), 'Notifications retrieved')
}

export function markRead(request, response, next) {
  return handle(request, response, next, () => markNotificationRead(request.auth.userId, request.params.id), 'Notification marked as read')
}

export function markAllRead(request, response, next) {
  return handle(request, response, next, () => markAllNotificationsRead(request.auth.userId), 'Notifications marked as read')
}

export function dismiss(request, response, next) {
  return handle(request, response, next, () => dismissNotification(request.auth.userId, request.params.id), 'Notification dismissed')
}
