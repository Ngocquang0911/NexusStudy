import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import multer from 'multer'

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

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
  uploader.single('file')(request, response, (error) => {
    if (!error) return next()
    error.statusCode = error.code === 'LIMIT_FILE_SIZE' ? 400 : 415
    error.message = error.code === 'LIMIT_FILE_SIZE' ? 'File size must not exceed 10 MB' : error.message
    return next(error)
  })
}
