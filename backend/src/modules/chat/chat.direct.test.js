import test from 'node:test'
import assert from 'node:assert/strict'
import { Channel } from './Channel.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { createChannel, getOrCreateDirectChannel, updateChannel } from './chat.service.js'

const workspace = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const first = '111111111111111111111111'
const second = '222222222222222222222222'

test('direct conversations require a different current workspace member and use a stable private pair', async (t) => {
  const originalFind = WorkspaceMember.findOne
  const originalUpsert = Channel.findOneAndUpdate
  t.after(() => { WorkspaceMember.findOne = originalFind; Channel.findOneAndUpdate = originalUpsert })
  WorkspaceMember.findOne = async () => null
  await assert.rejects(getOrCreateDirectChannel(workspace, first, second), { statusCode: 403 })
  await assert.rejects(getOrCreateDirectChannel(workspace, first, first), { statusCode: 400 })
  WorkspaceMember.findOne = async () => ({ userId: second })
  Channel.findOneAndUpdate = async (filter, update) => ({ filter, data: update.$setOnInsert })
  const a = await getOrCreateDirectChannel(workspace, first, second)
  const b = await getOrCreateDirectChannel(workspace, second, first)
  assert.equal(a.filter.directKey, b.filter.directKey)
  assert.equal(a.data.isPrivate, true)
  assert.deepEqual(a.data.allowedMembers, [first, second])
  await assert.rejects(updateChannel({ directKey: a.filter.directKey }, {}, { isPrivate: false }), { statusCode: 403 })
})


test('members can create channels and invalid names or duplicate names are rejected', async (t) => {
  const originalCreate = Channel.create
  t.after(() => { Channel.create = originalCreate })
  Channel.create = async (data) => data
  const channel = await createChannel(workspace, first, { name: 'Planning', isPrivate: false })
  assert.equal(channel.name, 'planning')
  assert.equal(channel.isPrivate, false)
  await assert.rejects(createChannel(workspace, first, { name: 'dm-reserved' }), { statusCode: 400 })
  Channel.create = async () => { const error = new Error('duplicate'); error.code = 11000; throw error }
  await assert.rejects(createChannel(workspace, first, { name: 'planning' }), { statusCode: 409 })
})
