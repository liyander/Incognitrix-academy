import { useEffect, useState } from 'react'
import { getAuthSession } from '../auth'
import { apiFetch } from '../services/api'

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
  if (!value) {
    return [emptyProject()]
  }

  if (Array.isArray(value)) {
    return value.length ? value : [emptyProject()]
  }

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
  if (!value) {
    return [emptyAchievement()]
  }

  if (Array.isArray(value)) {
    return value.length ? value : [emptyAchievement()]
  }

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

function SettingsPage() {
  const authSession = getAuthSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordSuccessModalOpen, setPasswordSuccessModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [form, setForm] = useState({
    username: authSession?.username || '',
    registration_number: authSession?.registrationNumber || '',
    first_name: '',
    last_name: '',
    email: authSession?.email || '',
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
    let cancelled = false

    const loadProfile = async () => {
      try {
        const data = await apiFetch('/users/me')
        if (!cancelled) {
          setForm({
            username: data.username || '',
            registration_number: data.registration_number || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
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
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load settings')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

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
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
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

      const updated = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      setForm((current) => ({
        ...current,
        email: updated.email || '',
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
      setSuccess('Settings saved successfully')
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordModalOpen(true)
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setChangingPassword(true)
    setError('')
    setSuccess('')

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      await apiFetch('/users/me/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      setPasswordModalOpen(false)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordSuccessModalOpen(true)
    } catch (passwordError) {
      setError(passwordError?.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <p className="text-on-surface-variant">Loading settings...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-24 px-6 md:px-10 py-10 bg-surface">
      <section className="max-w-5xl mx-auto">
        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 mb-8">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
            Player Settings
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
            Profile & Career Presence
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Update your public operator profile, challenge platform handles, resume link, projects, and achievements.
          </p>
        </header>

        {error ? (
          <div className="mb-6 bg-error/10 border-l-4 border-error p-4">
            <p className="text-error font-headline text-sm font-bold">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 bg-secondary/10 border-l-4 border-secondary p-4">
            <p className="text-secondary font-headline text-sm font-bold">{success}</p>
          </div>
        ) : null}

        <form className="space-y-8" onSubmit={handleSave}>
          <section className="bg-surface-container-lowest p-8 space-y-5">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  disabled
                  type="text"
                  value={form.registration_number}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            </div>
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Email</span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                onChange={(e) => updateField('email', e.target.value)}
                type="email"
                value={form.email}
              />
            </label>
          </section>

          <section className="bg-surface-container-lowest p-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Password</h2>
                <p className="text-sm text-on-surface-variant mt-2">
                  Change your account password by confirming your current password first.
                </p>
              </div>
              <button
                className="px-5 py-3 bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-widest"
                onClick={openPasswordModal}
                type="button"
              >
                Change Password
              </button>
            </div>
          </section>

          <section className="bg-surface-container-lowest p-8 space-y-5">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight">About & Portfolio</h2>
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Description About You</span>
              <textarea
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none resize-y"
                onChange={(e) => updateField('about_me', e.target.value)}
                rows={4}
                value={form.about_me}
              />
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Projects</span>
                <button
                  className="px-4 py-2 bg-primary text-on-primary font-headline text-[10px] font-bold uppercase tracking-widest"
                  onClick={addProject}
                  type="button"
                >
                  Add Project
                </button>
              </div>
              {form.projects.map((project, index) => (
                <div className="bg-surface-container-high p-4 space-y-3" key={`project-${index + 1}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-headline text-xs font-bold uppercase tracking-widest text-on-background">Project {index + 1}</p>
                    <button
                      className="px-3 py-1 bg-surface-container-highest text-on-surface-variant font-headline text-[10px] font-bold uppercase tracking-widest hover:text-error transition-colors"
                      onClick={() => removeProject(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateProjectField(index, 'projectName', e.target.value)}
                    placeholder="Project Name"
                    type="text"
                    value={project.projectName}
                  />
                  <textarea
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none resize-y"
                    onChange={(e) => updateProjectField(index, 'projectDescription', e.target.value)}
                    placeholder="Project Description"
                    rows={3}
                    value={project.projectDescription}
                  />
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateProjectField(index, 'beneficiaries', e.target.value)}
                    placeholder="Beneficiaries"
                    type="text"
                    value={project.beneficiaries}
                  />
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateProjectField(index, 'stackUsed', e.target.value)}
                    placeholder="Stack Used"
                    type="text"
                    value={project.stackUsed}
                  />
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateProjectField(index, 'projectLink', e.target.value)}
                    placeholder="Project Link"
                    type="url"
                    value={project.projectLink}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Achievements</span>
                <button
                  className="px-4 py-2 bg-primary text-on-primary font-headline text-[10px] font-bold uppercase tracking-widest"
                  onClick={addAchievement}
                  type="button"
                >
                  Add Achievement
                </button>
              </div>
              {form.achievements.map((achievement, index) => (
                <div className="bg-surface-container-high p-4 space-y-3" key={`achievement-${index + 1}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-headline text-xs font-bold uppercase tracking-widest text-on-background">Achievement {index + 1}</p>
                    <button
                      className="px-3 py-1 bg-surface-container-highest text-on-surface-variant font-headline text-[10px] font-bold uppercase tracking-widest hover:text-error transition-colors"
                      onClick={() => removeAchievement(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateAchievementField(index, 'awardName', e.target.value)}
                    placeholder="Achievement/Award Name"
                    type="text"
                    value={achievement.awardName}
                  />
                  <textarea
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none resize-y"
                    onChange={(e) => updateAchievementField(index, 'description', e.target.value)}
                    placeholder="Description"
                    rows={3}
                    value={achievement.description}
                  />
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(e) => updateAchievementField(index, 'pocLink', e.target.value)}
                    placeholder="Link to the POC"
                    type="url"
                    value={achievement.pocLink}
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="bg-surface-container-lowest p-8 space-y-5">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight">CTF Profiles</h2>
            <div className="space-y-4">
              <label className="block">
                <ProfileLabelWithLogo logo={profileLogos.htb} text="Hack The Box Profile" />
                <input
                  className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                  onChange={(e) => updateField('hackthebox_profile', e.target.value)}
                  placeholder="https://app.hackthebox.com/profile/..."
                  type="url"
                  value={form.hackthebox_profile}
                />
              </label>
              <label className="block">
                <ProfileLabelWithLogo logo={profileLogos.thm} text="TryHackMe Profile" />
                <input
                  className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                  onChange={(e) => updateField('tryhackme_profile', e.target.value)}
                  placeholder="https://tryhackme.com/p/..."
                  type="url"
                  value={form.tryhackme_profile}
                />
              </label>
              <label className="block">
                <ProfileLabelWithLogo logo={profileLogos.pico} text="picoCTF Profile" />
                <input
                  className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                  onChange={(e) => updateField('picoctf_profile', e.target.value)}
                  placeholder="https://play.picoctf.org/users/..."
                  type="url"
                  value={form.picoctf_profile}
                />
              </label>
              <label className="block">
                <ProfileLabelWithLogo logo={profileLogos.resume} text="Resume URL" />
                <input
                  className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                  onChange={(e) => updateField('resume_url', e.target.value)}
                  placeholder="https://drive.google.com/..."
                  type="url"
                  value={form.resume_url}
                />
              </label>
              <label className="block">
                <ProfileLabelWithLogo logo={profileLogos.github} text="GitHub Profile" />
                <input
                  className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                  onChange={(e) => updateField('github_profile', e.target.value)}
                  placeholder="https://github.com/username"
                  type="url"
                  value={form.github_profile}
                />
              </label>
              <label className="block">
                <ProfileLabelWithLogo logo={profileLogos.linkedin} text="LinkedIn Profile" />
                <input
                  className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                  onChange={(e) => updateField('linkedin_profile', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  type="url"
                  value={form.linkedin_profile}
                />
              </label>
            </div>
          </section>

          <button
            className="bg-primary text-on-primary px-8 py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </section>
      {passwordModalOpen ? (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <form className="w-full max-w-md bg-surface-container-lowest border border-outline-variant shadow-2xl" onSubmit={changePassword}>
            <div className="h-1 bg-primary"></div>
            <div className="p-7">
              <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold text-primary">
                Account Security
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-background">
                Change Password
              </h2>
              <p className="mt-3 text-sm text-on-surface-variant">
                Enter your current password and choose a new password with at least 8 characters.
              </p>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Current Password</span>
                  <input
                    className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-3 px-4 outline-none"
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    required
                    type="password"
                    value={passwordForm.currentPassword}
                  />
                </label>
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
                  onClick={() => setPasswordModalOpen(false)}
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
      {passwordSuccessModalOpen ? (
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
                Your password has been updated. Use the new password the next time you sign in.
              </p>
              <button
                className="mt-7 w-full px-5 py-3 bg-secondary text-on-secondary font-headline text-xs font-bold uppercase tracking-widest"
                onClick={() => setPasswordSuccessModalOpen(false)}
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

export default SettingsPage
