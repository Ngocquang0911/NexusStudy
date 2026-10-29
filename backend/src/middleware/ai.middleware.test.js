import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAiDocuments } from './ai.middleware.js'

test('AI document validation rejects more than ten selected documents', async () => {
  let nextError
  await validateAiDocuments(
    { body: { documentIds: Array.from({ length: 11 }, (_, index) => `507f1f77bcf86cd7994390${String(index).padStart(2, '0')}`) }, aiWorkspaceId: '507f1f77bcf86cd799439011' },
    {},
    (error) => { nextError = error },
  )

  assert.equal(nextError.statusCode, 400)
  assert.match(nextError.message, /no more than 10/)
})
