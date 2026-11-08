import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } }).single('avatar')

export function workspaceAvatarUpload(request, response, next) {
  upload(request, response, (error) => {
    if (error) {
      error.statusCode = 400
      error.message = error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3 MB or smaller' : 'Unable to upload image'
      return next(error)
    }
    const file = request.file
    const type = detectWorkspaceAvatarType(file?.buffer)
    if (!type || file.mimetype !== type) {
      const invalid = new Error('Choose a valid PNG, JPEG or WebP image')
      invalid.statusCode = 415
      return next(invalid)
    }
    request.avatarData = `data:${type};base64,${file.buffer.toString('base64')}`
    return next()
  })
}

export function detectWorkspaceAvatarType(bytes) {
  if (bytes?.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png'
  if (bytes?.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (bytes?.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}
