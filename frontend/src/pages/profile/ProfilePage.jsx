import { CheckCircle2, KeyRound, LoaderCircle, Lock, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'
import { changePassword, updateProfile } from '../../services/userService.js'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('PROFILE') // 'PROFILE' | 'PASSWORD'

  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      name: '',
      avatar: '',
      bio: '',
    },
  })

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
      })
    }
  }, [user, resetProfile])

  const onUpdateProfile = async (data) => {
    setProfileSuccess('')
    setProfileError('')
    setProfileLoading(true)

    try {
      const res = await updateProfile({
        name: data.name.trim(),
        avatar: data.avatar.trim(),
        bio: data.bio.trim(),
      })
      const updated = res.data.data
      updateUser(updated)
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const onChangePassword = async (data) => {
    setPasswordSuccess('')
    setPasswordError('')

    if (data.newPassword !== data.confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setPasswordSuccess('Password changed successfully!')
      resetPassword()
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.message || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="profile-page-container">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">ACCOUNT SETTINGS</span>
          <h1>User Profile</h1>
          <p>Manage your account information, bio, and security credentials.</p>
        </div>
      </div>

      {/* User Hero Summary Card */}
      <div className="profile-hero-card surface-card">
        <div className="profile-hero-left">
          <div className="profile-large-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>
          <div className="profile-hero-details">
            <div className="profile-name-row">
              <h2>{user?.name || 'User'}</h2>
              <span className="system-role-tag">{user?.systemRole || 'STUDENT'}</span>
            </div>
            <span className="profile-email">{user?.email}</span>
            {user?.bio && <p className="profile-bio-text">"{user.bio}"</p>}
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="task-filters-container">
        <div className="task-filters-presets">
          <button
            type="button"
            className={`filter-chip ${activeTab === 'PROFILE' ? 'active' : ''}`}
            onClick={() => setActiveTab('PROFILE')}
          >
            <UserIcon size={14} /> Personal Information
          </button>
          <button
            type="button"
            className={`filter-chip ${activeTab === 'PASSWORD' ? 'active' : ''}`}
            onClick={() => setActiveTab('PASSWORD')}
          >
            <KeyRound size={14} /> Password & Security
          </button>
        </div>
      </div>

      {/* Tab 1: Personal Profile Information */}
      {activeTab === 'PROFILE' && (
        <div className="surface-card profile-form-card">
          <h3>Edit Personal Information</h3>

          {profileSuccess && (
            <div className="inline-success" role="alert">
              <CheckCircle2 size={16} /> {profileSuccess}
            </div>
          )}

          {profileError && (
            <div className="inline-error" role="alert">
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit(onUpdateProfile)}>
            <div className="form-group">
              <label htmlFor="user-name">Full Name *</label>
              <input
                id="user-name"
                type="text"
                {...registerProfile('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 80, message: 'Name cannot exceed 80 characters' },
                })}
              />
              {profileErrors.name && <span className="field-error">{profileErrors.name.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="user-avatar">Avatar Image URL</label>
              <input
                id="user-avatar"
                type="text"
                placeholder="https://example.com/avatar.jpg"
                {...registerProfile('avatar')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-bio">Short Bio</label>
              <textarea
                id="user-bio"
                rows={3}
                placeholder="Tell your study team about your background, interests, or major..."
                {...registerProfile('bio', {
                  maxLength: { value: 500, message: 'Bio cannot exceed 500 characters' },
                })}
              />
              {profileErrors.bio && <span className="field-error">{profileErrors.bio.message}</span>}
            </div>

            <div className="form-actions-right">
              <button type="submit" className="primary-action" disabled={profileLoading}>
                {profileLoading && <LoaderCircle className="spin" size={16} />}
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Password & Security */}
      {activeTab === 'PASSWORD' && (
        <div className="surface-card profile-form-card">
          <h3>Change Password</h3>

          {passwordSuccess && (
            <div className="inline-success" role="alert">
              <CheckCircle2 size={16} /> {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="inline-error" role="alert">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit(onChangePassword)}>
            <div className="form-group">
              <label htmlFor="current-password">Current Password *</label>
              <input
                id="current-password"
                type="password"
                {...registerPassword('currentPassword', {
                  required: 'Current password is required',
                })}
              />
              {passwordErrors.currentPassword && (
                <span className="field-error">{passwordErrors.currentPassword.message}</span>
              )}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="new-password">New Password *</label>
                <input
                  id="new-password"
                  type="password"
                  {...registerPassword('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                {passwordErrors.newPassword && (
                  <span className="field-error">{passwordErrors.newPassword.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password *</label>
                <input
                  id="confirm-password"
                  type="password"
                  {...registerPassword('confirmPassword', {
                    required: 'Please confirm your new password',
                  })}
                />
                {passwordErrors.confirmPassword && (
                  <span className="field-error">{passwordErrors.confirmPassword.message}</span>
                )}
              </div>
            </div>

            <div className="form-actions-right">
              <button type="submit" className="primary-action" disabled={passwordLoading}>
                {passwordLoading && <LoaderCircle className="spin" size={16} />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
