import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../services/api'

function isPermanentAdmin(user) {
  return String(user?.username || '').trim().toLowerCase() === 'admin01'
}

const emptyProject = () => ({
  projectName: '',
  projectDescription: '',
  beneficiaries: '',
  stackUsed: '',
  projectLink: '',
})

const emptyAchievement = () => ({
  awardName: '',
  description: '',
  pocLink: '',
})

function parseProjects(value) {
  if (!value) return [emptyProject()]
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((project) => ({
          projectName: project.projectName || '',
          projectDescription: project.projectDescription || '',
          beneficiaries: project.beneficiaries || '',
          stackUsed: project.stackUsed || '',
          projectLink: project.projectLink || '',
        }))
      }
    } catch {
      return [{ ...emptyProject(), projectDescription: value }]
    }
  }

  return [emptyProject()]
}

function parseAchievements(value) {
  if (!value) return [emptyAchievement()]
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((achievement) => ({
          awardName: achievement.awardName || '',
          description: achievement.description || '',
          pocLink: achievement.pocLink || '',
        }))
      }
    } catch {
      return [{ ...emptyAchievement(), description: value }]
    }
  }

  return [emptyAchievement()]
}

function serializeProjects(projects) {
  const normalized = (projects || []).filter(
    (project) =>
      project.projectName?.trim() ||
      project.projectDescription?.trim() ||
      project.beneficiaries?.trim() ||
      project.stackUsed?.trim() ||
      project.projectLink?.trim(),
  )

  return JSON.stringify(normalized)
}

function serializeAchievements(achievements) {
  const normalized = (achievements || []).filter(
    (achievement) =>
      achievement.awardName?.trim() ||
      achievement.description?.trim() ||
      achievement.pocLink?.trim(),
  )

  return JSON.stringify(normalized)
}

function ProfileLabelWithLogo({ logo, text }) {
  return (
    <span className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${logo.bgClass}`}>
        <img alt={logo.alt} className="h-3.5 w-3.5 object-contain" src={logo.src} />
      </span>
      {text}
    </span>
  )
}

const profileLogos = {
  htb: {
    src: 'https://cdn.simpleicons.org/hackthebox',
    alt: 'Hack The Box',
    bgClass: 'bg-[#9fef00]',
  },
  thm: {
    src: 'https://cdn.simpleicons.org/tryhackme',
    alt: 'TryHackMe',
    bgClass: 'bg-[#c11111]',
  },
  pico: {
    src: 'https://play.picoctf.org/favicon.ico',
    alt: 'picoCTF',
    bgClass: 'bg-white',
  },
  resume: {
    src: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/file-earmark-person.svg',
    alt: 'Resume',
    bgClass: 'bg-[#0ea5e9]',
  },
  github: {
    src: 'https://cdn.simpleicons.org/github',
    alt: 'GitHub',
    bgClass: 'bg-[#24292f]',
  },
  linkedin: {
    src: 'https://cdn.simpleicons.org/linkedin',
    alt: 'LinkedIn',
    bgClass: 'bg-[#0a66c2]',
  },
}

function AdminRegistrationDetailPage() {
  const navigate = useNavigate()
  const { userId } = useParams()

  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [passwordModal, setPasswordModal] = useState(null)
  const [passwordSuccessModal, setPasswordSuccessModal] = useState(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [form, setForm] = useState({
    username: '',
    registration_number: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'operator',
    is_active: true,
    hackthebox_profile: '',
    tryhackme_profile: '',
    picoctf_profile: '',
    github_profile: '',
    linkedin_profile: '',
    resume_url: '',
    about_me: '',
    projects: [emptyProject()],
    achievements: [emptyAchievement()],
  })

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        setError('Missing user id')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await apiFetch(`/users/admin/registrations/${userId}`)
        setUser(data)
        setForm({
          username: data.username || '',
          registration_number: data.registration_number || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          role: data.role || 'operator',
          is_active: Boolean(data.is_active),
          hackthebox_profile: data.hackthebox_profile || '',
          tryhackme_profile: data.tryhackme_profile || '',
          picoctf_profile: data.picoctf_profile || '',
          github_profile: data.github_profile || '',
          linkedin_profile: data.linkedin_profile || '',
          resume_url: data.resume_url || '',
          about_me: data.about_me || '',
          projects: parseProjects(data.projects),
          achievements: parseAchievements(data.achievements),
        })
        setError('')
      } catch (fetchError) {
        setError(fetchError?.message || 'Failed to load registration details')
      } finally {
        setLoading(false)
      }
    }

    void loadUser()
  }, [userId])

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateProjectField = (index, field, value) => {
    setForm((current) => ({
      ...current,
      projects: current.projects.map((project, projectIndex) =>
        projectIndex === index ? { ...project, [field]: value } : project,
      ),
    }))
  }

  const addProject = () => {
    setForm((current) => ({
      ...current,
      projects: [...current.projects, emptyProject()],
    }))
  }

  const removeProject = (index) => {
    setForm((current) => {
      const next = current.projects.filter((_, projectIndex) => projectIndex !== index)
      return { ...current, projects: next.length ? next : [emptyProject()] }
    })
  }

  const updateAchievementField = (index, field, value) => {
    setForm((current) => ({
      ...current,
      achievements: current.achievements.map((achievement, achievementIndex) =>
        achievementIndex === index ? { ...achievement, [field]: value } : achievement,
      ),
    }))
  }

  const addAchievement = () => {
    setForm((current) => ({
      ...current,
      achievements: [...current.achievements, emptyAchievement()],
    }))
  }

  const removeAchievement = (index) => {
    setForm((current) => {
      const next = current.achievements.filter((_, achievementIndex) => achievementIndex !== index)
      return { ...current, achievements: next.length ? next : [emptyAchievement()] }
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!userId) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        registration_number: form.registration_number,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
        hackthebox_profile: form.hackthebox_profile,
        tryhackme_profile: form.tryhackme_profile,
        picoctf_profile: form.picoctf_profile,
        github_profile: form.github_profile,
        linkedin_profile: form.linkedin_profile,
        resume_url: form.resume_url,
        about_me: form.about_me,
        projects: serializeProjects(form.projects),
        achievements: serializeAchievements(form.achievements),
      }

      const updated = await apiFetch(`/users/admin/registrations/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      setUser(updated)
      setForm((current) => ({
        ...current,
        registration_number: updated.registration_number || '',
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        email: updated.email || '',
        role: updated.role || 'operator',
        is_active: Boolean(updated.is_active),
        hackthebox_profile: updated.hackthebox_profile || '',
        tryhackme_profile: updated.tryhackme_profile || '',
        picoctf_profile: updated.picoctf_profile || '',
        github_profile: updated.github_profile || '',
        linkedin_profile: updated.linkedin_profile || '',
        resume_url: updated.resume_url || '',
        about_me: updated.about_me || '',
        projects: parseProjects(updated.projects),
        achievements: parseAchievements(updated.achievements),
      }))
      setSuccess('Player details updated successfully')
    } catch (saveError) {
      setError(saveError?.message || 'Failed to update player details')
    } finally {
      setSaving(false)
    }
  }

  const openPasswordModal = () => {
    setPasswordForm({ newPassword: '', confirmPassword: '' })
    setPasswordModal({
      target: user?.username || user?.registration_number || 'Selected user',
    })
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (!userId) return

    setChangingPassword(true)
    setError('')
    setSuccess('')

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      await apiFetch(`/users/admin/registrations/${userId}/password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: passwordForm.newPassword }),
      })

      setPasswordModal(null)
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setPasswordSuccessModal({
        target: user?.username || user?.registration_number || 'Selected user',
      })
    } catch (passwordError) {
      setError(passwordError?.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            className="px-4 py-2 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest"
            onClick={() => navigate('/admin/registrations')}
            type="button"
          >
            Back
          </button>
        </div>

        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
            Player Details
          </p>
          <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight mt-3 uppercase">
            {user?.registration_number || user?.username || 'Registration Profile'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Full player profile data from settings.
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Loading details...</div>
        ) : null}

        {error ? (
          <div className="bg-error/10 border-l-4 border-error p-4">
            <p className="text-error font-headline text-sm font-bold">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="bg-secondary/10 border-l-4 border-secondary p-4">
            <p className="text-secondary font-headline text-sm font-bold">{success}</p>
          </div>
        ) : null}

        {!loading && !error && user ? (
          <form className="space-y-4" onSubmit={handleSave}>
            <section className="bg-surface-container-lowest p-6 md:p-8 space-y-4">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Core Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Username (locked)</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-outline-variant border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    disabled
                    type="text"
                    value={form.username}
                  />
                </label>

                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Registration Number</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('registration_number', e.target.value)}
                    type="text"
                    value={form.registration_number}
                  />
                </label>

                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">First Name</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('first_name', e.target.value)}
                    type="text"
                    value={form.first_name}
                  />
                </label>

                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Last Name</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('last_name', e.target.value)}
                    type="text"
                    value={form.last_name}
                  />
                </label>

                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Email</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('email', e.target.value)}
                    type="email"
                    value={form.email}
                  />
                </label>

                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Role</span>
                  <select
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    disabled={isPermanentAdmin(user)}
                    onChange={(e) => updateField('role', e.target.value)}
                    value={form.role}
                  >
                    <option value="operator">operator</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <div className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Password</span>
                  <button
                    className="mt-2 w-full bg-primary text-on-primary py-3 px-4 font-headline text-xs font-bold uppercase tracking-widest"
                    onClick={openPasswordModal}
                    type="button"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input
                  checked={form.is_active}
                  className="h-4 w-4 accent-[#b6171e]"
                  disabled={isPermanentAdmin(user)}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  type="checkbox"
                />
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Account Active</span>
              </label>
              {isPermanentAdmin(user) ? (
                <p className="text-xs text-secondary font-bold uppercase tracking-widest">
                  admin01 is a permanent admin. Role and active status are locked.
                </p>
              ) : null}
            </section>

            <section className="bg-surface-container-lowest p-6 md:p-8 space-y-4">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight">CTF Profiles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <ProfileLabelWithLogo logo={profileLogos.htb} text="Hack The Box Profile" />
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('hackthebox_profile', e.target.value)}
                    type="url"
                    value={form.hackthebox_profile}
                  />
                </label>

                <label className="block">
                  <ProfileLabelWithLogo logo={profileLogos.thm} text="TryHackMe Profile" />
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('tryhackme_profile', e.target.value)}
                    type="url"
                    value={form.tryhackme_profile}
                  />
                </label>

                <label className="block">
                  <ProfileLabelWithLogo logo={profileLogos.pico} text="PicoCTF Profile" />
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('picoctf_profile', e.target.value)}
                    type="url"
                    value={form.picoctf_profile}
                  />
                </label>

                <label className="block">
                  <ProfileLabelWithLogo logo={profileLogos.github} text="GitHub Profile" />
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('github_profile', e.target.value)}
                    type="url"
                    value={form.github_profile}
                  />
                </label>

                <label className="block">
                  <ProfileLabelWithLogo logo={profileLogos.linkedin} text="LinkedIn Profile" />
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('linkedin_profile', e.target.value)}
                    type="url"
                    value={form.linkedin_profile}
                  />
                </label>

                <label className="block md:col-span-2">
                  <ProfileLabelWithLogo logo={profileLogos.resume} text="Resume URL" />
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateField('resume_url', e.target.value)}
                    type="url"
                    value={form.resume_url}
                  />
                </label>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-6 md:p-8 space-y-4">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight">About</h2>
              <textarea
                className="w-full min-h-32 bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none resize-y"
                onChange={(e) => updateField('about_me', e.target.value)}
                value={form.about_me}
              />
            </section>

            <section className="bg-surface-container-lowest p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Projects</h2>
                <button
                  className="px-3 py-2 bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-widest"
                  onClick={addProject}
                  type="button"
                >
                  Add Project
                </button>
              </div>

              <div className="space-y-4">
                {form.projects.map((project, index) => (
                  <article key={`project-edit-${index + 1}`} className="bg-surface-container-high p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-headline text-sm font-bold uppercase">Project {index + 1}</h3>
                      <button
                        className="px-2 py-1 bg-error/10 text-error text-[10px] uppercase tracking-widest font-bold"
                        onClick={() => removeProject(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      className="w-full bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none"
                      onChange={(e) => updateProjectField(index, 'projectName', e.target.value)}
                      placeholder="Project Name"
                      type="text"
                      value={project.projectName}
                    />
                    <textarea
                      className="w-full min-h-24 bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none resize-y"
                      onChange={(e) => updateProjectField(index, 'projectDescription', e.target.value)}
                      placeholder="Project Description"
                      value={project.projectDescription}
                    />
                    <input
                      className="w-full bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none"
                      onChange={(e) => updateProjectField(index, 'beneficiaries', e.target.value)}
                      placeholder="Beneficiaries"
                      type="text"
                      value={project.beneficiaries}
                    />
                    <input
                      className="w-full bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none"
                      onChange={(e) => updateProjectField(index, 'stackUsed', e.target.value)}
                      placeholder="Stack Used"
                      type="text"
                      value={project.stackUsed}
                    />
                    <input
                      className="w-full bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none"
                      onChange={(e) => updateProjectField(index, 'projectLink', e.target.value)}
                      placeholder="Project Link"
                      type="url"
                      value={project.projectLink}
                    />
                  </article>
                ))}
              </div>
            </section>

            <section className="bg-surface-container-lowest p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Achievements</h2>
                <button
                  className="px-3 py-2 bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-widest"
                  onClick={addAchievement}
                  type="button"
                >
                  Add Achievement
                </button>
              </div>

              <div className="space-y-4">
                {form.achievements.map((achievement, index) => (
                  <article key={`achievement-edit-${index + 1}`} className="bg-surface-container-high p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-headline text-sm font-bold uppercase">Achievement {index + 1}</h3>
                      <button
                        className="px-2 py-1 bg-error/10 text-error text-[10px] uppercase tracking-widest font-bold"
                        onClick={() => removeAchievement(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      className="w-full bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none"
                      onChange={(e) => updateAchievementField(index, 'awardName', e.target.value)}
                      placeholder="Award Name"
                      type="text"
                      value={achievement.awardName}
                    />
                    <textarea
                      className="w-full min-h-24 bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none resize-y"
                      onChange={(e) => updateAchievementField(index, 'description', e.target.value)}
                      placeholder="Description"
                      value={achievement.description}
                    />
                    <input
                      className="w-full bg-surface-container-highest border-l-2 border-l-primary py-2 px-3 outline-none"
                      onChange={(e) => updateAchievementField(index, 'pocLink', e.target.value)}
                      placeholder="Proof of Concept Link"
                      type="url"
                      value={achievement.pocLink}
                    />
                  </article>
                ))}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                className="px-6 py-3 bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
      {passwordModal ? (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <form className="w-full max-w-md bg-surface-container-lowest border border-outline-variant shadow-2xl" onSubmit={changePassword}>
            <div className="h-1 bg-primary"></div>
            <div className="p-7">
              <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold text-primary">
                Admin Password Reset
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-background">
                Change Password
              </h2>
              <p className="mt-3 text-sm text-on-surface-variant">
                Set a new password for {passwordModal.target}. Current password is not required for admin resets.
              </p>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">New Password</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    minLength={8}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    required
                    type="password"
                    value={passwordForm.newPassword}
                  />
                </label>
                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Confirm Password</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    minLength={8}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    required
                    type="password"
                    value={passwordForm.confirmPassword}
                  />
                </label>
              </div>
              <div className="mt-7 flex flex-col sm:flex-row sm:justify-end gap-3">
                <button
                  className="px-5 py-3 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  disabled={changingPassword}
                  onClick={() => setPasswordModal(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-3 bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  disabled={changingPassword}
                  type="submit"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
      {passwordSuccessModal ? (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant shadow-2xl">
            <div className="h-1 bg-secondary"></div>
            <div className="p-7">
              <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold text-secondary">
                Password Updated
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-background">
                Password Changed Successfully
              </h2>
              <p className="mt-4 text-sm text-on-surface-variant">
                The password for {passwordSuccessModal.target} has been updated.
              </p>
              <button
                className="mt-7 w-full px-5 py-3 bg-secondary text-on-secondary font-headline text-xs font-bold uppercase tracking-widest"
                onClick={() => setPasswordSuccessModal(null)}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default AdminRegistrationDetailPage
