'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Plus, Search, FolderKanban, MessageSquare,
  CheckCircle2, Clock3, AlertCircle, X, Send,
  Pencil, Save, Trash2, Users, Activity, LogOut, Loader2, WifiOff,
  Printer, FileText, BarChart2, Filter,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ============================================================
// ✏️  TEAM MEMBERS
// ============================================================
const TEAM_MEMBERS = ['Eyad', 'Hartini', 'Sabu']

// ============================================================
// ✏️  OWNER (ADMIN) EMAIL
// This person has full access: create, edit, and delete.
// All other users can only view and comment.
// ============================================================
const OWNER_EMAIL = 'eyad@aralsane.com'

// ============================================================
// ✏️  STATUSES
// ============================================================
const STATUSES = ['Pending', 'Active', 'Creative', 'Completed']

// ============================================================
// ✏️  PRIORITIES
// ============================================================
const PRIORITIES = ['Low', 'Medium', 'High']

// ============================================================
// 🎨  STATUS CONFIG
// ============================================================
const STATUS_CONFIG: Record<string, {
  icon: React.ElementType; color: string; bg: string; border: string
}> = {
  Pending:   { icon: Clock3,       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
  Active:    { icon: AlertCircle,  color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)'  },
  Creative:  { icon: Activity,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)'  },
  Completed: { icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)'  },
}

const PRIORITY_COLOR: Record<string, string> = {
  Low: '#6B7280', Medium: '#F59E0B', High: '#EF4444',
}

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6']

// ============================================================
// TYPES
// ============================================================
type Comment = {
  id: string; project_id: string; by_name: string; text: string; created_at: string
}

type Project = {
  id: string; name: string; opened_date: string; expected_close: string
  owner: string; status: string; priority: string; created_at: string
  comments: Comment[]; unread: boolean
}

type FormData = {
  name: string; openedDate: string; expectedClose: string
  owner: string; status: string; priority: string
}

// ============================================================
// SMALL COMPONENTS
// ============================================================
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Pending']
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon size={11} strokeWidth={2.5} />{status}
    </span>
  )
}

function Avatar({ name = '', size = 28 }: { name?: string; size?: number }) {
  const idx   = TEAM_MEMBERS.indexOf(name)
  const color = AVATAR_COLORS[idx >= 0 ? idx : 0]
  return (
    <span style={{ background: color, width: size, height: size, fontSize: size * 0.36, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
      {(name || 'U').slice(0, 2).toUpperCase()}
    </span>
  )
}

const S = {
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 11, fontSize: 13, fontFamily: 'inherit', color: '#374151', background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
  label: { fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 7, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
}

const emptyForm = (): FormData => ({
  name: '', openedDate: '', expectedClose: '', owner: '', status: 'Pending', priority: 'Medium',
})

async function notify(type: string, projectName: string, actor: string, extra?: Record<string, string>) {
  try {
    await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, projectName, actor, extra }),
    })
  } catch {}
}

// ============================================================
// PRINT: Single project report
// ============================================================
function printProject(project: Project) {
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG['Pending']
  const priorityColor = PRIORITY_COLOR[project.priority] || '#6B7280'
  const daysLeft = Math.ceil((new Date(project.expected_close).getTime() - Date.now()) / 86400000)
  const daysLabel = daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`

  const commentsHtml = project.comments.length === 0
    ? '<p style="color:#9CA3AF;font-style:italic;">No updates posted yet.</p>'
    : project.comments.map(c => `
        <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:10px;background:#F9FAFB;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <strong style="color:#374151;font-size:13px;">${c.by_name}</strong>
            <span style="color:#9CA3AF;font-size:11px;">${new Date(c.created_at).toLocaleString()}</span>
          </div>
          <p style="color:#4B5563;font-size:13px;line-height:1.6;margin:0;">${c.text}</p>
        </div>
      `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Project Report — ${project.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; }
        @media print { body { padding: 20px; } @page { margin: 1.5cm; } }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:2px solid #6366F1;margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:800;font-size:18px;">P</span>
          </div>
          <div>
            <div style="font-weight:800;font-size:18px;color:#111;">ProjectFlow</div>
            <div style="font-size:11px;color:#9CA3AF;">Project Report</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#9CA3AF;">Generated</div>
          <div style="font-size:13px;font-weight:600;color:#374151;">${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
        </div>
      </div>

      <!-- Project name -->
      <h1 style="font-size:26px;font-weight:800;color:#111;letter-spacing:-0.5px;margin-bottom:16px;">${project.name}</h1>

      <!-- Badges -->
      <div style="display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap;">
        <span style="background:${statusCfg.bg};border:1px solid ${statusCfg.border};color:${statusCfg.color};padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">${project.status}</span>
        <span style="background:${priorityColor}18;border:1px solid ${priorityColor}30;color:${priorityColor};padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">${project.priority} Priority</span>
        <span style="background:#F3F4F6;color:#374151;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">${daysLabel}</span>
      </div>

      <!-- Info grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px;">
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">Responsible</div>
          <div style="font-size:15px;font-weight:700;color:#111;">${project.owner}</div>
        </div>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">Opened Date</div>
          <div style="font-size:15px;font-weight:700;color:#111;">${project.opened_date}</div>
        </div>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">Expected Close</div>
          <div style="font-size:15px;font-weight:700;color:#111;">${project.expected_close}</div>
        </div>
      </div>

      <!-- Comments -->
      <div style="border-top:1px solid #E5E7EB;padding-top:24px;">
        <h2 style="font-size:16px;font-weight:800;color:#111;margin-bottom:16px;">Updates & Comments (${project.comments.length})</h2>
        ${commentsHtml}
      </div>

      <!-- Footer -->
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;">
        <span>ProjectFlow — Confidential</span>
        <span>Printed on ${new Date().toLocaleString()}</span>
      </div>
    </body>
    </html>
  `

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ============================================================
// PRINT: Full report (multiple projects)
// ============================================================
function printReport(projects: Project[], reportTitle: string) {
  const rows = projects.map((p, i) => {
    const daysLeft = Math.ceil((new Date(p.expected_close).getTime() - Date.now()) / 86400000)
    const daysLabel = daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)}d overdue`
    const daysColor = daysLeft < 0 ? '#EF4444' : daysLeft < 7 ? '#F59E0B' : '#374151'
    const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['Pending']
    const priorityColor = PRIORITY_COLOR[p.priority] || '#6B7280'
    return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F9FAFB'};">
        <td style="padding:14px 16px;font-weight:600;color:#111;font-size:13px;border-bottom:1px solid #F3F4F6;">${p.name}</td>
        <td style="padding:14px 16px;font-size:13px;color:#374151;border-bottom:1px solid #F3F4F6;">${p.owner}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #F3F4F6;">
          <span style="background:${statusCfg.bg};color:${statusCfg.color};border:1px solid ${statusCfg.border};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${p.status}</span>
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #F3F4F6;">
          <span style="background:${priorityColor}18;color:${priorityColor};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${p.priority}</span>
        </td>
        <td style="padding:14px 16px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6;">${p.opened_date}</td>
        <td style="padding:14px 16px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6;">${p.expected_close}</td>
        <td style="padding:14px 16px;font-size:12px;font-weight:700;color:${daysColor};border-bottom:1px solid #F3F4F6;">${daysLabel}</td>
        <td style="padding:14px 16px;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6;">${p.comments.length}</td>
      </tr>
    `
  }).join('')

  // Summary counts
  const counts: Record<string, number> = {}
  STATUSES.forEach(s => { counts[s] = projects.filter(p => p.status === s).length })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${reportTitle}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #6366F1; color: #fff; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        th:first-child { border-radius: 10px 0 0 0; }
        th:last-child  { border-radius: 0 10px 0 0; }
        @media print { body { padding: 20px; } @page { margin: 1cm; size: landscape; } }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:3px solid #6366F1;margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:800;font-size:20px;">P</span>
          </div>
          <div>
            <div style="font-weight:800;font-size:20px;color:#111;">ProjectFlow</div>
            <div style="font-size:12px;color:#9CA3AF;">${reportTitle}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#9CA3AF;">Report Date</div>
          <div style="font-size:14px;font-weight:700;color:#374151;">${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
        </div>
      </div>

      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:32px;">
        <div style="background:#F5F3FF;border:1px solid #C4B5FD;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#6366F1;">${projects.length}</div>
          <div style="font-size:11px;color:#8B5CF6;font-weight:600;margin-top:4px;">TOTAL</div>
        </div>
        ${STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s]
          return `
          <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:${cfg.color};">${counts[s] || 0}</div>
            <div style="font-size:11px;color:${cfg.color};font-weight:600;margin-top:4px;">${s.toUpperCase()}</div>
          </div>`
        }).join('')}
      </div>

      <!-- Table -->
      ${projects.length === 0
        ? '<div style="text-align:center;padding:60px;color:#9CA3AF;font-size:16px;">No projects found for this report.</div>'
        : `<table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Opened</th>
                <th>Expected Close</th>
                <th>Timeline</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
      }

      <!-- Footer -->
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;">
        <span>ProjectFlow — ${reportTitle} — Confidential</span>
        <span>Generated: ${new Date().toLocaleString()}</span>
      </div>
    </body>
    </html>
  `

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [userEmail,     setUserEmail]     = useState('')
  const [projects,      setProjects]      = useState<Project[]>([])
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('All')
  const [activeTab,     setActiveTab]     = useState<'projects' | 'reports'>('projects')
  const [reportFilter,  setReportFilter]  = useState('All')
  const [showCreate,    setShowCreate]    = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [form,          setForm]          = useState<FormData>(emptyForm())
  const [formError,     setFormError]     = useState('')
  const [newComment,    setNewComment]    = useState('')
  const [commentAuthor, setCommentAuthor] = useState(TEAM_MEMBERS[0])
  const [loggingOut,    setLoggingOut]    = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [isLive,        setIsLive]        = useState(false)
  const [liveToast,     setLiveToast]     = useState('')

  // ── Load user ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email)
        const prefix = data.user.email.split('@')[0].toLowerCase()
        const match  = TEAM_MEMBERS.find(m => m.toLowerCase() === prefix)
        if (match) setCommentAuthor(match)
      }
    })
  }, [])

  // ── Load projects ──────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    const { data: projectRows, error } = await supabase
      .from('projects').select('*').order('created_at', { ascending: false })
    if (error) { console.error('Load error:', error); setLoading(false); return }
    const { data: commentRows } = await supabase
      .from('comments').select('*').order('created_at', { ascending: true })
    setProjects(prev => {
      const built: Project[] = (projectRows || []).map(p => ({
        ...p,
        comments: (commentRows || []).filter((c: Comment) => c.project_id === p.id),
        unread:   prev.find(pp => pp.id === p.id)?.unread ?? false,
      }))
      return built
    })
    setLoading(false)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  // ── Realtime ───────────────────────────────────────────────
  useEffect(() => {
    const showToast = (msg: string) => {
      setLiveToast(msg)
      setTimeout(() => setLiveToast(''), 3000)
    }
    const projectChannel = supabase.channel('projects-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
        const p: Project = { ...payload.new as Project, comments: [], unread: true }
        setProjects(prev => prev.find(x => x.id === p.id) ? prev : [p, ...prev])
        showToast(`📋 New project: ${(payload.new as Project).name}`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new, comments: p.comments } : p))
        showToast(`✏️ Updated: ${payload.new.name}`)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.filter(p => p.id !== payload.old.id))
        setSelectedId(prev => prev === payload.old.id ? null : prev)
      })
      .subscribe((status) => setIsLive(status === 'SUBSCRIBED'))

    const commentChannel = supabase.channel('comments-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const c = payload.new as Comment
        setProjects(prev => prev.map(p =>
          p.id === c.project_id
            ? { ...p, comments: p.comments.find(x => x.id === c.id) ? p.comments : [...p.comments, c], unread: true }
            : p
        ))
        showToast(`💬 New comment posted`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(projectChannel)
      supabase.removeChannel(commentChannel)
    }
  }, [])

  // ── Derived ────────────────────────────────────────────────
  const filtered = useMemo(() =>
    projects.filter(p => {
      const q = search.toLowerCase()
      return (p.name.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q)) &&
        (filterStatus === 'All' || p.status === filterStatus)
    }),
    [projects, search, filterStatus]
  )

  const reportProjects = useMemo(() =>
    reportFilter === 'All' ? projects : projects.filter(p => p.status === reportFilter),
    [projects, reportFilter]
  )

  const selected    = projects.find(p => p.id === selectedId) ?? null
  const unreadCount = projects.filter(p => p.unread).length

  const stats = [
    { label: 'Total',     value: projects.length,                                       icon: FolderKanban, color: '#8B5CF6' },
    { label: 'Pending',   value: projects.filter(p => p.status === 'Pending').length,   icon: Clock3,       color: '#F59E0B' },
    { label: 'Active',    value: projects.filter(p => p.status === 'Active').length,    icon: AlertCircle,  color: '#3B82F6' },
    { label: 'Completed', value: projects.filter(p => p.status === 'Completed').length, icon: CheckCircle2, color: '#10B981' },
  ]

  const displayName = userEmail
    ? userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1)
    : 'User'

  // Is current user the owner/admin?
  const isOwner = userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()

  const daysLeft = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)

  // ── Actions ────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const openProject = (id: string) => {
    setSelectedId(id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, unread: false } : p))
  }

  const validateForm = (): boolean => {
    if (!form.name.trim())   { setFormError('Project name is required.');   return false }
    if (!form.openedDate)    { setFormError('Opened date is required.');    return false }
    if (!form.expectedClose) { setFormError('Expected close is required.'); return false }
    if (!form.owner)         { setFormError('Please select an owner.');     return false }
    return true
  }

  const openCreateDialog = () => { setForm(emptyForm()); setFormError(''); setShowCreate(true) }

  const handleCreate = async () => {
    setFormError('')
    if (!validateForm()) return
    setSaving(true)
    const { data, error } = await supabase.from('projects')
      .insert({ name: form.name, opened_date: form.openedDate, expected_close: form.expectedClose, owner: form.owner, status: form.status, priority: form.priority })
      .select().single()
    if (error) { setFormError('Failed to save. Please try again.'); setSaving(false); return }
    const newProject: Project = { ...data, comments: [], unread: false }
    setProjects(prev => [newProject, ...prev])
    setSelectedId(newProject.id)
    setShowCreate(false); setSaving(false)
    await notify('project_created', form.name, displayName, { owner: form.owner })
  }

  const openEditDialog = () => {
    if (!selected) return
    setForm({ name: selected.name, openedDate: selected.opened_date, expectedClose: selected.expected_close, owner: selected.owner, status: selected.status, priority: selected.priority })
    setFormError(''); setShowEdit(true)
  }

  const handleSaveEdit = async () => {
    setFormError('')
    if (!validateForm()) return
    setSaving(true)
    const { error } = await supabase.from('projects')
      .update({ name: form.name, opened_date: form.openedDate, expected_close: form.expectedClose, owner: form.owner, status: form.status, priority: form.priority, updated_at: new Date().toISOString() })
      .eq('id', selectedId)
    if (error) { setFormError('Failed to update. Please try again.'); setSaving(false); return }
    setProjects(prev => prev.map(p => p.id === selectedId ? { ...p, name: form.name, opened_date: form.openedDate, expected_close: form.expectedClose, owner: form.owner, status: form.status, priority: form.priority } : p))
    setShowEdit(false); setSaving(false)
    await notify('project_updated', form.name, displayName, { changes: `Status → ${form.status}, Priority → ${form.priority}` })
  }

  const handleDelete = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    const remaining = projects.filter(p => p.id !== id)
    setProjects(remaining)
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selected) return
    const { data, error } = await supabase.from('comments')
      .insert({ project_id: selected.id, by_name: commentAuthor, text: newComment.trim() })
      .select().single()
    if (error) { console.error('Comment error:', error); return }
    setProjects(prev => prev.map(p =>
      p.id === selected.id
        ? { ...p, comments: p.comments.find(c => c.id === data.id) ? p.comments : [...p.comments, data] }
        : p
    ))
    const text = newComment.trim()
    setNewComment('')
    await notify('comment_added', selected.name, commentAuthor, { text })
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#F0F2F7', minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
        textarea { resize: vertical; }
        button { font-family: inherit; cursor: pointer; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        .project-card:hover { background: #F5F3FF !important; }
        .icon-btn:hover { opacity: 1 !important; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* LIVE TOAST */}
      <AnimatePresence>
        {liveToast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{ position: 'fixed', top: 76, left: '50%', zIndex: 9999, background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 40, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
            {liveToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderKanban size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#111', letterSpacing: '-0.3px' }}>ProjectFlow</span>
            {/* Live dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: isLive ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${isLive ? '#6EE7B7' : '#FECACA'}`, borderRadius: 20, padding: '3px 10px' }}>
              {isLive
                ? <><span style={{ width: 7, height: 7, background: '#10B981', borderRadius: '50%', animation: 'pulse 2s infinite', display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Live</span></>
                : <><WifiOff size={11} color="#EF4444" /><span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Offline</span></>
              }
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              <Users size={14} />{TEAM_MEMBERS.length} members
            </div>
            <div style={{ position: 'relative' }}>
              <Bell size={20} color="#6B7280" />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -7, width: 18, height: 18, background: '#EF4444', borderRadius: '50%', fontSize: 10, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16, borderLeft: '1px solid #E5E7EB' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111' }}>{displayName}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{userEmail}</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isOwner ? '#EDE9FE' : '#F3F4F6', color: isOwner ? '#7C3AED' : '#6B7280' }}>
                {isOwner ? '👑 Owner' : 'Member'}
              </span>
              </div>
              <button onClick={handleLogout} disabled={loggingOut} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FEF2F2', color: '#EF4444', border: '1px solid #FEE2E2', borderRadius: 9, padding: '7px 13px', fontSize: 12, fontWeight: 700, marginLeft: 4 }}>
                <LogOut size={13} />{loggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '30px 32px', display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* Page header + tabs */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 28, color: '#111', letterSpacing: '-0.5px' }}>
              {activeTab === 'projects' ? 'Projects' : 'Reports'}
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginTop: 5 }}>
              {activeTab === 'projects' ? 'Track ownership, timelines, and progress.' : 'Generate and print project reports.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 12, padding: 4, gap: 2 }}>
              <button onClick={() => setActiveTab('projects')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, background: activeTab === 'projects' ? '#fff' : 'transparent', color: activeTab === 'projects' ? '#6366F1' : '#6B7280', boxShadow: activeTab === 'projects' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                <FolderKanban size={14} />Projects
              </button>
              <button onClick={() => setActiveTab('reports')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, background: activeTab === 'reports' ? '#fff' : 'transparent', color: activeTab === 'reports' ? '#6366F1' : '#6B7280', boxShadow: activeTab === 'reports' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                <BarChart2 size={14} />Reports
              </button>
            </div>
            {activeTab === 'projects' && isOwner && (
              <button onClick={openCreateDialog} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                <Plus size={17} />New Project
              </button>
            )}
          </div>
        </div>

        {/* Stats — clickable */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {stats.map(stat => {
            const Icon      = stat.icon
            const filterKey = stat.label === 'Total' ? 'All' : stat.label
            const isActive  = filterStatus === filterKey && activeTab === 'projects'
            return (
              <button key={stat.label}
                onClick={() => {
                  setActiveTab('projects')
                  setFilterStatus(isActive ? 'All' : filterKey)
                }}
                style={{ background: isActive ? stat.color : '#fff', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, border: isActive ? `2px solid ${stat.color}` : '2px solid #F3F4F6', boxShadow: isActive ? `0 6px 24px ${stat.color}44` : '0 1px 6px rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', transform: isActive ? 'translateY(-3px)' : 'none', fontFamily: 'inherit' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: isActive ? 'rgba(255,255,255,0.22)' : stat.color + '16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={isActive ? '#fff' : stat.color} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: isActive ? 'rgba(255,255,255,0.8)' : '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>{stat.label}</p>
                  <p style={{ fontSize: 30, fontWeight: 800, color: isActive ? '#fff' : '#111', lineHeight: 1 }}>{stat.value}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ╔══════════════════════════════════╗
            ║        PROJECTS TAB              ║
            ╚══════════════════════════════════╝ */}
        {activeTab === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 22, alignItems: 'start' }}>

            {/* LEFT: list */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '18px 16px 0' }}>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or owner..."
                    style={{ ...S.input, paddingLeft: 38, background: '#F9FAFB', border: '1px solid #E5E7EB' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {['All', ...STATUSES].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, border: 'none', background: filterStatus === s ? '#6366F1' : '#F3F4F6', color: filterStatus === s ? '#fff' : '#6B7280', transition: 'all 0.15s' }}>{s}</button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 600, overflowY: 'auto', padding: '0 10px 12px' }}>
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: '#9CA3AF' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...
                  </div>
                )}
                {!loading && projects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <FolderKanban size={32} color="#D1D5DB" style={{ marginBottom: 10 }} />
                    <p style={{ color: '#9CA3AF', fontSize: 13 }}>No projects yet</p>
                    <p style={{ color: '#D1D5DB', fontSize: 12, marginTop: 4 }}>{isOwner ? 'Click "New Project" to create one' : 'Contact the owner to create projects'}</p>
                  </div>
                )}
                {!loading && filtered.map((project, i) => {
                  const days  = daysLeft(project.expected_close)
                  const isSel = selectedId === project.id
                  return (
                    <motion.div key={project.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={{ position: 'relative', marginBottom: 6 }}>
                      <button onClick={() => openProject(project.id)} style={{ width: '100%', textAlign: 'left', background: isSel ? '#F5F3FF' : '#FAFAFA', border: isSel ? '1.5px solid #A5B4FC' : '1.5px solid transparent', borderRadius: 14, padding: '14px 40px 14px 14px', display: 'block', transition: 'all 0.15s' }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111', lineHeight: 1.3, marginBottom: 8 }}>{project.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                          <Avatar name={project.owner} size={20} />
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{project.owner || '—'}</span>
                          {project.unread && <span style={{ marginLeft: 'auto', width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <StatusPill status={project.status} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: days < 0 ? '#EF4444' : days < 7 ? '#F59E0B' : '#9CA3AF' }}>
                            {days > 0 ? `${days}d left` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`}
                          </span>
                        </div>
                      </button>
                      {/* Delete — owner only */}
                      {isOwner && (
                        <button onClick={() => handleDelete(project.id)} className="icon-btn" title="Delete" style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', padding: 5, opacity: 0.2, transition: 'opacity 0.15s' }}>
                          <Trash2 size={13} color="#EF4444" />
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT: detail */}
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>

                  {/* Detail header */}
                  <div style={{ padding: '24px 32px', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.4px', marginBottom: 12 }}>{selected.name}</h2>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <StatusPill status={selected.status} />
                          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: PRIORITY_COLOR[selected.priority] + '14', color: PRIORITY_COLOR[selected.priority], border: `1px solid ${PRIORITY_COLOR[selected.priority]}28` }}>
                            {selected.priority} Priority
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* 🖨️ Print single project */}
                          <button onClick={() => printProject(selected)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, padding: '9px 15px', fontWeight: 700, fontSize: 13 }}>
                            <Printer size={14} />Print
                          </button>
                          <button onClick={openEditDialog}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366F1', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, boxShadow: '0 3px 10px rgba(99,102,241,0.3)' }}>
                            <Pencil size={13} />Edit
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={selected.owner} size={38} />
                          <div>
                            <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Responsible</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{selected.owner || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                    {[{ label: 'Opened Date', value: selected.opened_date }, { label: 'Expected Close', value: selected.expected_close }].map((item, i) => (
                      <div key={item.label} style={{ padding: '16px 32px', borderRight: i === 0 ? '1px solid #F3F4F6' : 'none' }}>
                        <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{item.label}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>{item.value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {/* Comments */}
                  <div style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                      <MessageSquare size={15} color="#6366F1" />
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Updates & Comments</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{selected.comments.length} entries</span>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {selected.comments.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>No updates yet.</p>
                      )}
                      <AnimatePresence>
                        {selected.comments.map(comment => (
                          <motion.div key={comment.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            style={{ background: '#F9FAFB', borderRadius: 14, padding: '14px 16px', border: '1px solid #F3F4F6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={comment.by_name} size={24} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{comment.by_name}</span>
                              </div>
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.65 }}>{comment.text}</p>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    {/* Add comment */}
                    <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                        <Avatar name={commentAuthor} size={22} />
                        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Posting as:</span>
                        <select value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
                          {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment() }}
                        placeholder="Write an update, blocker, decision, or note..." rows={3}
                        style={{ width: '100%', border: 'none', padding: '12px 14px', fontSize: 13, color: '#374151', background: 'transparent', fontFamily: 'inherit', lineHeight: 1.7, outline: 'none' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Ctrl + Enter to post</span>
                        <button onClick={handleAddComment} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366F1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>
                          <Send size={13} />Post
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                !loading && (
                  <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 440, gap: 14 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderKanban size={30} color="#D1D5DB" />
                    </div>
                    <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
                      {projects.length === 0 ? 'Create your first project to get started' : 'Select a project to view details'}
                    </p>
                  </div>
                )
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ╔══════════════════════════════════╗
            ║         REPORTS TAB              ║
            ╚══════════════════════════════════╝ */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Report controls */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: 18, color: '#111', marginBottom: 4 }}>Generate Report</h2>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>Select a status filter then print or preview your report.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Filter buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['All', ...STATUSES].map(s => {
                      const cfg = s !== 'All' ? STATUS_CONFIG[s] : null
                      const isActive = reportFilter === s
                      return (
                        <button key={s} onClick={() => setReportFilter(s)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${isActive ? (cfg?.color || '#6366F1') : '#E5E7EB'}`, background: isActive ? (cfg?.bg || '#EEF2FF') : '#fff', color: isActive ? (cfg?.color || '#6366F1') : '#6B7280', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                          {s === 'All' ? <Filter size={12} /> : null}
                          {s} {isActive && `(${reportProjects.length})`}
                        </button>
                      )
                    })}
                  </div>
                  {/* Print button */}
                  <button
                    onClick={() => printReport(reportProjects, `${reportFilter === 'All' ? 'All Projects' : reportFilter + ' Projects'} Report`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                    <Printer size={16} />Print Report
                  </button>
                </div>
              </div>
            </div>

            {/* Report preview table */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              {/* Table header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="#6366F1" />
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>
                    {reportFilter === 'All' ? 'All Projects' : `${reportFilter} Projects`}
                  </span>
                  <span style={{ background: '#EEF2FF', color: '#6366F1', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                    {reportProjects.length} {reportProjects.length === 1 ? 'project' : 'projects'}
                  </span>
                </div>
              </div>

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: 10, color: '#9CA3AF' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...
                </div>
              ) : reportProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>
                  <FileText size={32} color="#E5E7EB" style={{ marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, fontSize: 14 }}>No projects found</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Try selecting a different filter above.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        {['#', 'Project Name', 'Owner', 'Status', 'Priority', 'Opened', 'Expected Close', 'Timeline', 'Updates'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#6B7280', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #F3F4F6', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #F3F4F6' }}>Print</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportProjects.map((project, i) => {
                        const days  = daysLeft(project.expected_close)
                        const daysLabel = days > 0 ? `${days}d left` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`
                        const daysColor = days < 0 ? '#EF4444' : days < 7 ? '#F59E0B' : '#6B7280'
                        return (
                          <motion.tr key={project.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                            style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '14px 16px', fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14, color: '#111', maxWidth: 200 }}>{project.name}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Avatar name={project.owner} size={22} />
                                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{project.owner}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}><StatusPill status={project.status} /></td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: PRIORITY_COLOR[project.priority] + '14', color: PRIORITY_COLOR[project.priority] }}>
                                {project.priority}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{project.opened_date}</td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{project.expected_close}</td>
                            <td style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: daysColor, whiteSpace: 'nowrap' }}>{daysLabel}</td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{project.comments.length}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <button onClick={() => printProject(project)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                                <Printer size={12} />Print
                              </button>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE DIALOG */}
      <AnimatePresence>
        {showCreate && <ProjectDialog title="Create New Project" form={form} setForm={setForm} error={formError} onSave={handleCreate} onClose={() => setShowCreate(false)} saveLabel="Create Project" saving={saving} />}
      </AnimatePresence>

      {/* EDIT DIALOG */}
      <AnimatePresence>
        {showEdit && <ProjectDialog title="Edit Project" form={form} setForm={setForm} error={formError} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} saveLabel="Save Changes" saving={saving} />}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// SHARED DIALOG
// ============================================================
function ProjectDialog({ title, form, setForm, error, onSave, onClose, saveLabel, saving }: {
  title: string; form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>
  error: string; onSave: () => void; onClose: () => void; saveLabel: string; saving: boolean
}) {
  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
        style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 560, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{title}</h2>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>⚠️ {error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={S.label}>Project Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Office Expansion Q3" style={S.input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Opened Date *</label>
              <input type="date" value={form.openedDate} onChange={set('openedDate')} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Expected Close *</label>
              <input type="date" value={form.expectedClose} onChange={set('expectedClose')} style={S.input} />
            </div>
          </div>
          <div>
            <label style={S.label}>Responsible Person *</label>
            <select value={form.owner} onChange={set('owner')} style={{ ...S.input, cursor: 'pointer' }}>
              <option value="">— Select team member —</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Status</label>
              <select value={form.status} onChange={set('status')} style={{ ...S.input, cursor: 'pointer' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Priority</label>
              <select value={form.priority} onChange={set('priority')} style={{ ...S.input, cursor: 'pointer' }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button onClick={onSave} disabled={saving} style={{ marginTop: 26, width: '100%', background: saving ? '#A5B4FC' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontWeight: 800, fontSize: 15, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><Save size={16} />{saveLabel}</>}
        </button>
      </motion.div>
    </motion.div>
  )
}
