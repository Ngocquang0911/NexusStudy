import assert from 'node:assert/strict'
import test from 'node:test'
import { Workspace } from '../workspaces/Workspace.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Channel } from './Channel.js'
import { emitAuthorizedChannelEvent, revokeWorkspaceSockets } from './chat.socket.js'

test('private channel realtime events exclude users who lost channel access', async (context) => {
  const permittedId = 'member-1'
  const excludedId = 'member-2'
  const channel = {
    workspaceId: 'workspace-1',
    isPrivate: true,
    createdBy: { equals: (userId) => userId === 'owner-id' },
    allowedMembers: [{ equals: (userId) => userId === permittedId }],
  }
  context.mock.method(Channel, 'findById', async () => channel)
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => ({ _id: 'workspace-1' }) }))
  context.mock.method(WorkspaceMember, 'find', () => ({
    select() {
      return { lean: async () => [{ userId: permittedId }, { userId: excludedId }] }
    },
  }))

  const delivered = []
  const sockets = [
    { id: 'socket-1', auth: { userId: permittedId }, emit: (event) => delivered.push(event) },
    { id: 'socket-2', auth: { userId: excludedId }, emit: (event) => delivered.push(event) },
  ]
  const io = { in: () => ({ fetchSockets: async () => sockets }) }

  await emitAuthorizedChannelEvent(io, 'channel-1', 'receiveMessage', { _id: 'message-1' })

  assert.deepEqual(delivered, ['receiveMessage'])
})

test('workspace members are excluded from channel events after losing workspace membership', async (context) => {
  const channel = {
    workspaceId: 'workspace-1',
    isPrivate: false,
    createdBy: { equals: () => false },
    allowedMembers: [],
  }
  context.mock.method(Channel, 'findById', async () => channel)
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => ({ _id: 'workspace-1' }) }))
  context.mock.method(WorkspaceMember, 'find', () => ({
    select() {
      return { lean: async () => [{ userId: 'current-member' }] }
    },
  }))

  let delivered = 0
  const sockets = [
    { id: 'socket-1', auth: { userId: 'former-member' }, emit: () => { delivered += 1 } },
  ]
  const io = { in: () => ({ fetchSockets: async () => sockets }) }

  await emitAuthorizedChannelEvent(io, 'channel-1', 'receiveMessage', {})

  assert.equal(delivered, 0)
})

test('workspace deletion notifies connected members once and removes workspace and channel rooms', async (context) => {
  context.mock.method(Channel, 'find', () => ({ select: async () => [{ _id: 'channel-1' }] }))
  const emitted = []
  const left = []
  const socket = { id: 'socket-1', emit: (event, data) => emitted.push({ event, data }) }
  const rooms = {
    'workspace:workspace-1': [socket],
    'channel:channel-1': [socket],
  }
  const io = {
    in(room) {
      return {
        fetchSockets: async () => rooms[room] || [],
        socketsLeave: async (roomToLeave) => left.push([room, roomToLeave]),
      }
    },
  }

  await revokeWorkspaceSockets(io, 'workspace-1')

  assert.deepEqual(emitted, [{ event: 'workspaceDeleted', data: { workspaceId: 'workspace-1' } }])
  assert.deepEqual(left, [
    ['workspace:workspace-1', 'workspace:workspace-1'],
    ['channel:channel-1', 'channel:channel-1'],
  ])
})

test('deleted workspaces do not emit new channel events', async (context) => {
  context.mock.method(Channel, 'findById', async () => ({ workspaceId: 'workspace-deleted' }))
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => null }))
  context.mock.method(WorkspaceMember, 'find', async () => {
    throw new Error('A deleted workspace must not fetch active members')
  })
  let fetchedSockets = false
  const io = {
    in() {
      return {
        fetchSockets: async () => {
          fetchedSockets = true
          return []
        },
      }
    },
  }

  await emitAuthorizedChannelEvent(io, 'channel-deleted', 'receiveMessage', {})

  assert.equal(fetchedSockets, false)
})
