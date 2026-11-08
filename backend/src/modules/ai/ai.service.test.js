import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { env } from '../../config/env.js'
import { chat, describeAiProviderError, extractDocumentText, suggestTasks, validateStudyCount } from './ai.service.js'

test('study item limits follow the requesting account plan', () => {
  assert.equal(validateStudyCount(10, 'FREE'), 10)
  assert.equal(validateStudyCount(15, 'FREE'), 15)
  assert.equal(validateStudyCount(20, 'FREE'), 20)
  assert.throws(() => validateStudyCount(21, 'FREE'), /1 to 20/)
  assert.equal(validateStudyCount(50, 'PREMIUM'), 50)
  for (const count of [0, 51, 1.5]) assert.throws(() => validateStudyCount(count, 'PREMIUM'), /1 to 50/)
})

test('AI provider errors explain common failures without exposing provider details', () => {
  assert.match(describeAiProviderError({ status: 401, message: 'secret key' }), /authentication failed/)
  assert.match(describeAiProviderError({ status: 429, code: 'insufficient_quota' }), /billing/)
  assert.match(describeAiProviderError({ status: 429 }), /rate limit/)
  assert.match(describeAiProviderError({ status: 404 }), /model/)
  assert.doesNotMatch(describeAiProviderError({ status: 401, message: 'secret key' }), /secret key/)
})

test('AI actions return an explicit configuration error instead of mock success', async (context) => {
  const originalApiKey = env.aiApiKey
  env.aiApiKey = ''
  context.after(() => { env.aiApiKey = originalApiKey })

  await assert.rejects(
    chat({ workspaceId: 'workspace-id', question: 'How should I study?' }),
    { statusCode: 503, message: /AI service is not configured/ },
  )
  await assert.rejects(
    suggestTasks({ workspaceId: 'workspace-id' }),
    { statusCode: 503, message: /AI service is not configured/ },
  )
})

test('AI extracts real text from an authorized local text document', async () => {
  const fileName = `${randomUUID()}.txt`
  const filePath = new URL(`../../../uploads/${fileName}`, import.meta.url)
  const expectedText = 'Source text for an AI study summary.'
  await writeFile(filePath, expectedText, 'utf8')
  try {
    const extracted = await extractDocumentText({
      fileName,
      fileUrl: `/uploads/${fileName}`,
      fileType: 'text/plain',
      isLink: false,
    })
    assert.equal(extracted, expectedText)
  } finally {
    await unlink(filePath)
  }
})

test('AI explicitly rejects external links rather than claiming to read them', async () => {
  await assert.rejects(
    extractDocumentText({ fileName: 'external reference', isLink: true }),
    { statusCode: 422, message: /External links cannot be read by AI/ },
  )
})
