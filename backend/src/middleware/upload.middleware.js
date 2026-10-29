import crypto from 'node:crypto'
import { open, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import multer from 'multer'

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

export function hasSupportedFileSignature(mimeType, buffer) {
  if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  if (mimeType === 'application/msword') {
    return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  }
  if (mimeType === 'text/plain') return !buffer.includes(0)
  return false
}

async function verifyUploadedFile(file) {
  const handle = await open(file.path, 'r')
  try {
    const buffer = Buffer.alloc(4096)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    return hasSupportedFileSignature(file.mimetype, buffer.subarray(0, bytesRead))
  } finally {
    await handle.close()
  }
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, fileURLToPath(new URL('../../uploads/', import.meta.url))),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

const uploader = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error('Unsupported file type'))
    return callback(null, true)
  },
})

export function documentUpload(request, response, next) {
  uploader.single('file')(request, response, async (error) => {
    if (error) {
      if (request.file?.path) {
        try {
          await unlink(request.file.path)
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') return next(cleanupError)
        }
      }
      error.statusCode = error.code === 'LIMIT_FILE_SIZE' ? 400 : 415
      error.message = error.code === 'LIMIT_FILE_SIZE' ? 'File size must not exceed 10 MB' : error.message
      return next(error)
    }
    if (!request.file) return next()

    try {
      if (await verifyUploadedFile(request.file)) return next()
      await unlink(request.file.path)
      const invalidFileError = new Error('File content does not match an allowed document type')
      invalidFileError.statusCode = 415
      return next(invalidFileError)
    } catch (verificationError) {
      if (verificationError.code !== 'ENOENT') {
        try {
          await unlink(request.file.path)
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') return next(cleanupError)
        }
      }
      return next(verificationError)
    }
  })
}
