import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useAuthStore } from '../store'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await authAPI.updateProfile({ name, bio })
      updateUser(response.data.data)
      toast.success('Profile updated')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        <div
          className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 border-b backdrop-blur-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium transition-colors hover:text-amber-500"
            style={{ color: 'var(--text-primary)' }}
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>

        <form onSubmit={handleSave} className="px-4 py-6 flex flex-col gap-5 max-w-md">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:border-amber-500 transition-all"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:border-amber-500 transition-all resize-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="self-start text-sm font-semibold transition-colors hover:text-amber-500 disabled:opacity-40"
            style={{ color: 'var(--text-primary)' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}