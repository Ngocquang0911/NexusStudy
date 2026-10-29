import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { env } from '../../config/env.js'
import { chat, extractDocumentText, suggestTasks } from './ai.service.js'

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
