import test from 'node:test'
import assert from 'node:assert/strict'
import { detectWorkspaceAvatarType } from './workspaceAvatar.middleware.js'
test('recognizes supported image signatures and rejects other data', () => {
  assert.equal(detectWorkspaceAvatarType(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png')
  assert.equal(detectWorkspaceAvatarType(Buffer.from([255,216,255])), 'image/jpeg')
  assert.equal(detectWorkspaceAvatarType(Buffer.from('RIFF0000WEBP')), 'image/webp')
  assert.equal(detectWorkspaceAvatarType(Buffer.from('<svg>')), null)
  assert.equal(detectWorkspaceAvatarType(undefined), null)
})
