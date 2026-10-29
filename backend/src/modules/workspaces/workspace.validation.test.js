import assert from 'node:assert/strict'
import test from 'node:test'
import { validateWorkspaceUpdate } from './workspace.validation.js'

test('accepts and trims supported workspace settings', () => {
  assert.deepEqual(
    validateWorkspaceUpdate({ name: '  HCI · Team 04  ', description: '  Team workspace  ' }),
    { name: 'HCI · Team 04', description: 'Team workspace' },
  )
})

test('rejects protected workspace fields', () => {
  assert.throws(
    () => validateWorkspaceUpdate({ ownerId: 'attacker-id' }),
    { message: 'Unsupported workspace field: ownerId', statusCode: 400 },
  )
})

test('rejects empty or oversized workspace names', () => {
  assert.throws(
    () => validateWorkspaceUpdate({ name: '   ' }),
    { message: 'Workspace name cannot be empty', statusCode: 400 },
  )
  assert.throws(
    () => validateWorkspaceUpdate({ name: 'x'.repeat(121) }),
    { message: 'name cannot exceed 120 characters', statusCode: 400 },
  )
})

test('requires a non-empty update with string values', () => {
  assert.throws(
    () => validateWorkspaceUpdate({}),
    { message: 'At least one workspace field must be updated', statusCode: 400 },
  )
  assert.throws(
    () => validateWorkspaceUpdate({ description: 23 }),
    { message: 'description must be a string', statusCode: 400 },
  )
})
