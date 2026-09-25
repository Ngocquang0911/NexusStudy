import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireChannelMember, requireMessageMember } from '../../middleware/chat.middleware.js'
import { requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import {
  create,
  editMessage,
  getChannels,
  getMessages,
  remove,
  removeMessage,
  search,
  sendMessage,
  togglePin,
  update,
} from './chat.controller.js'

const router = Router()

router.use(requireAuth)
router.get('/workspaces/:workspaceId/channels', requireWorkspaceMember, getChannels)
router.post('/workspaces/:workspaceId/channels', requireWorkspaceMember, create)
router.put('/channels/:id', requireChannelMember, update)
router.delete('/channels/:id', requireChannelMember, remove)
router.get('/channels/:channelId/messages/search', requireChannelMember, search)
router.get('/channels/:channelId/messages', requireChannelMember, getMessages)
router.post('/channels/:channelId/messages', requireChannelMember, sendMessage)
router.put('/messages/:id', requireMessageMember, editMessage)
router.delete('/messages/:id', requireMessageMember, removeMessage)
router.put('/messages/:id/pin', requireMessageMember, togglePin)

export default router
