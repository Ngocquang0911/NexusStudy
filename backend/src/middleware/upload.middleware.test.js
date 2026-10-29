import assert from 'node:assert/strict'
import test from 'node:test'
import { hasSupportedFileSignature } from './upload.middleware.js'

test('validates document signatures instead of trusting the declared MIME type', () => {
  assert.equal(hasSupportedFileSignature('application/pdf', Buffer.from('%PDF-1.7')), true)
  assert.equal(hasSupportedFileSignature('application/pdf', Buffer.from('MZ executable')), false)
  assert.equal(
    hasSupportedFileSignature('application/msword', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    true,
  )
  assert.equal(
    hasSupportedFileSignature('application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    true,
  )
  assert.equal(hasSupportedFileSignature('text/plain', Buffer.from('Readable notes')), true)
  assert.equal(hasSupportedFileSignature('text/plain', Buffer.from([0x4d, 0x5a, 0x00, 0x00])), false)
})
