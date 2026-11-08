import {
  assignTask,
  addTaskFeedback,
  createTask,
  deleteTask,
  getTask,
  getWorkspaceProgress,
  listTasks,
  updateTask,
  updateTaskReminders,
  updateTaskStatus,
} from './task.service.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function create(request, response, next) {
  return handle(request, response, next, () => createTask(request.auth.userId, request.body.workspaceId, request.body, request.workspaceMember), 'Task created', 201)
}

export function list(request, response, next) {
  return handle(request, response, next, () => listTasks(request.params.workspaceId), 'Tasks retrieved')
}

export function getOne(request, response, next) {
  return handle(request, response, next, () => getTask(request.params.id), 'Task retrieved')
}

export function update(request, response, next) {
  return handle(request, response, next, () => updateTask(request.task, request.auth.userId, request.workspaceMember, request.body), 'Task updated')
}

export function updateStatus(request, response, next) {
  return handle(request, response, next, () => updateTaskStatus(request.task, request.auth.userId, request.workspaceMember, request.body.status, request.body.progress), 'Task status updated')
}

export function updateReminders(request, response, next) {
  return handle(request, response, next, () => updateTaskReminders(request.task, request.auth.userId, request.workspaceMember, request.body.reminders), 'Task reminders updated')
}

export function assign(request, response, next) {
  return handle(request, response, next, () => assignTask(request.task, request.auth.userId, request.workspaceMember, request.body.assignedTo), 'Task assigned')
}

export function createFeedback(request, response, next) {
  return handle(request, response, next, () => addTaskFeedback(request.task, request.auth.userId, request.body), 'Task feedback added', 201)
}

export function remove(request, response, next) {
  return handle(request, response, next, () => deleteTask(request.task, request.workspaceMember), 'Task deleted')
}

export function progress(request, response, next) {
  return handle(request, response, next, () => getWorkspaceProgress(request.params.workspaceId), 'Workspace progress retrieved')
}


export async function exportReport(request, response, next) {
  try {
    const tasks = await listTasks(request.params.workspaceId)
    const csvCell = (value) => {
      let text = String(value ?? '')
      if (/^[\s]*[=+@\-\t\r]/.test(text)) text = "'" + text
      return `"${text.replaceAll('"', '""')}"`
    }
    const rows = [['Task', 'Assignee', 'Email', 'Status', 'Progress (%)', 'Deadline', 'Completed at']]
    for (const task of tasks) {
      const assignees = task.assignedTo?.length ? task.assignedTo : [null]
      const reportStatus = task.deadline && task.deadline < new Date() && !['DONE', 'CANCELLED'].includes(task.status) ? 'OVERDUE' : task.status
      for (const person of assignees) rows.push([task.title, person?.name || 'Everyone in this workspace', person?.email || '', reportStatus, task.progress, task.deadline?.toISOString() || '', task.completedAt?.toISOString() || ''])
    }
    response.set('Content-Type', 'text/csv; charset=utf-8')
    response.set('Content-Disposition', 'attachment; filename="task-report.csv"')
    response.send('\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'))
  } catch (error) { next(error) }
}
