import assert from 'node:assert/strict'
import test from 'node:test'
import { User } from '../modules/users/User.js'
import { requireAdmin } from './auth.middleware.js'

test('admin authorization checks the current database role', async (context) => {
  context.mock.method(User, 'findById', () => ({
    select: async () => ({ systemRole: 'STUDENT' }),
  }))
  let nextError

  await requireAdmin({ auth: { userId: 'user-id' } }, {}, (error) => { nextError = error })

  assert.equal(nextError.statusCode, 403)
  assert.equal(nextError.message, 'Administrator access required')
})

test('admin authorization permits only a database-confirmed administrator', async (context) => {
  context.mock.method(User, 'findById', () => ({
    select: async () => ({ systemRole: 'ADMIN' }),
  }))
  let called = false

  await requireAdmin({ auth: { userId: 'admin-id' } }, {}, () => { called = true })

  assert.equal(called, true)
})
