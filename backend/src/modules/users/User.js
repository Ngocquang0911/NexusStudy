import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, and dots'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    emailVerified: { type: Boolean, default: true },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationSentAt: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    systemRole: { type: String, enum: ['STUDENT', 'LECTURER', 'ADMIN'], default: 'STUDENT' },
    subscriptionPlan: { type: String, enum: ['FREE', 'PREMIUM'], default: 'FREE', index: true },
  },
  { timestamps: true },
)

userSchema.pre('validate', function (next) {
  if (!this.username && this.email) {
    const cleanPrefix = this.email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '') || 'user'
    this.username = cleanPrefix.toLowerCase().slice(0, 30)
  }
  next()
})

userSchema.set('toJSON', {
  transform: (_document, returnedUser) => {
    delete returnedUser.password
    return returnedUser
  },
})

export const User = mongoose.model('User', userSchema)
