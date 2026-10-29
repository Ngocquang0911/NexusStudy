import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePasswordChange, validateProfileUpdate } from './user.validation.js'

test('accepts trimmed editable profile fields', () => {
  assert.deepEqual(
    validateProfileUpdate({ name: '  Student Name ', avatar: ' https://example.com/avatar.png ', bio: '  Hello ' }),
    { name: 'Student Name', avatar: 'https://example.com/avatar.png', bio: 'Hello' },
  )
})

test('rejects empty, oversized, and unsupported profile updates', () => {
  assert.throws(() => validateProfileUpdate({}), { statusCode: 400 })
  assert.throws(
    () => validateProfileUpdate({ name: ' ' }),
    { message: 'Name must be between 2 and 80 characters', statusCode: 400 },
  )
  assert.throws(
    () => validateProfileUpdate({ name: 'Valid Name', systemRole: 'ADMIN' }),
    { message: 'Unsupported profile field: systemRole', statusCode: 400 },
  )
  assert.throws(
    () => validateProfileUpdate({ avatar: 'javascript:alert(1)' }),
    { message: 'Avatar must be a valid HTTP or HTTPS URL', statusCode: 400 },
  )
})

test('validates password length, type, and bcrypt byte limit', () => {
  assert.deepEqual(
    validatePasswordChange({ currentPassword: 'current', newPassword: 'newpass' }),
    { currentPassword: 'current', newPassword: 'newpass' },
  )
  assert.throws(
    () => validatePasswordChange({ currentPassword: 'current', newPassword: 'short' }),
    { message: 'New password must be at least 6 characters', statusCode: 400 },
  )
  assert.throws(
    () => validatePasswordChange({ currentPassword: 'current', newPassword: 'a'.repeat(73) }),
    { message: 'New password cannot exceed 72 UTF-8 bytes', statusCode: 400 },
  )
  assert.throws(() => validatePasswordChange(null), { statusCode: 400 })
})
