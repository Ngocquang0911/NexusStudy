import { getMessageModuleStatus } from './message.service.js'

export function getMessageModuleStatusResponse(_request, response) {
  response.json(getMessageModuleStatus())
}
