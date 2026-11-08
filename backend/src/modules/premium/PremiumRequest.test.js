import assert from 'node:assert/strict'
import test from 'node:test'
import { PremiumRequest } from './PremiumRequest.js'

test('premium pending statuses have one unique index per user and status', () => {
  const indexes = PremiumRequest.schema.indexes()
  const pending = indexes.find(([keys]) => keys.userId === 1 && keys.status === 1)
  assert.equal(pending[1].unique, true)
  assert.deepEqual(pending[1].partialFilterExpression, { status: { $in: ['PENDING', 'PENDING_PAYMENT'] } })
  assert.equal(indexes.filter(([keys]) => keys.userId === 1 && Object.keys(keys).length === 1).length, 0)
})
