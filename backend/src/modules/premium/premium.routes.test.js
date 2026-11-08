import test from 'node:test'
import assert from 'node:assert/strict'
import router, { PREMIUM_PRICES } from './premium.routes.js'
import { PremiumRequest } from './PremiumRequest.js'
import { User } from '../users/User.js'

function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this }, json(data) { this.body = data; return this } } }
const createHandler = router.stack.find((layer) => layer.route?.path === '/premium/request' && layer.route.methods.post).route.stack.at(-1).handle

test('Premium request uses server prices and rejects invalid or duplicate requests', async (context) => {
  context.mock.method(User, 'findById', () => ({ select: async () => ({ _id: 'user', subscriptionPlan: 'FREE', systemRole: 'STUDENT' }) }))
  let saved
  context.mock.method(PremiumRequest, 'create', async (payload) => { saved = payload; return payload })
  let res = response()
  await createHandler({ auth: { userId: 'user' }, body: { plan: 'YEARLY', priceVnd: 1 } }, res, (err) => { throw err })
  assert.equal(res.statusCode, 201)
  assert.equal(saved.priceVnd, 289000)
  assert.deepEqual(PREMIUM_PRICES, { MONTHLY: 39000, SIX_MONTHS: 150000, YEARLY: 289000 })
  res = response()
  await createHandler({ auth: { userId: 'user' }, body: { plan: 'INVALID' } }, res, (err) => { throw err })
  assert.equal(res.statusCode, 400)
  PremiumRequest.create.mock.mockImplementation(async () => { const err = new Error('duplicate'); err.code = 11000; throw err })
  res = response()
  await createHandler({ auth: { userId: 'user' }, body: { plan: 'MONTHLY' } }, res, (err) => { throw err })
  assert.equal(res.statusCode, 409)
})
