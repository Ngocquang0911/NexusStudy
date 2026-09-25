import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    systemRole: { type: String, enum: ['STUDENT', 'LECTURER', 'ADMIN'], default: 'STUDENT' },
  },
  { timestamps: true },
)

userSchema.set('toJSON', {
  transform: (_document, returnedUser) => {
    delete returnedUser.password
    return returnedUser
  },
})

export const User = mongoose.model('User', userSchema)
