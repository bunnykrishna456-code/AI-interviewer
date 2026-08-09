"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Brain, Users, Calendar, Plus, LogOut, BarChart3,
  CheckCircle2, AlertCircle, Loader2, ChevronRight,
  User, X, Search, ThumbsUp, ThumbsDown, Pause,
  Star, Award, Eye, ChevronDown, Clock, TrendingUp,
  Monitor, RefreshCw, Bell
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  logout, getAllCandidates, getAllSchedules, getAllSessions,
  getAllApprovals, saveApproval, createSchedule, cancelSchedule,
  getActivityLogs, logActivity,
  type UserProfile, type ScheduledInterview,
  type InterviewSession, type JobApproval, type ActivityLog
} from "@/lib/firebase"

const ROLES = ["Software Engineer","Frontend Developer","Backend Developer","Full Stack Developer","Data Scientist","DevOps Engineer","Product Manager","System Design Engineer","Mobile Developer"]
const DIFFICULTIES = ["Easy","Medium","Hard","Expert"]
const TYPES = ["Technical","HR","Behavioral","Coding","System Design","Mixed"]

function sColor(s: ScheduledInterview["status"]) {
  return s==="COMPLETED" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : s==="IN_PROGRESS"  ? "bg-blue-100 text-blue-700 border-blue-200"
    : s==="EXPIRED"      ? "bg-red-100 text-red-700 border-red-200"
    : s==="CANCELLED"    ? "bg-slate-100 text-slate-500 border-slate-200"
    : "bg-amber-100 text-amber-700 border-amber-200"
}
function aBadge(s?: JobApproval["status"]) {
  return s==="APPROVED" ? "bg-emerald-100 text-emerald-700 border-emerald-300"
    : s==="REJECTED"    ? "bg-red-100 text-red-700 border-red-300"
    : s==="ON_HOLD"     ? "bg-amber-100 text-amber-700 border-amber-300"
    : "bg-slate-100 text-slate-500 border-slate-200"
}
function actLabel(a: ActivityLog["action"]) {
  const m: Record<string,string> = {
    CANDIDATE_APPROVED:"✅ Approved", CANDIDATE_REJECTED:"❌ Rejected",
    INTERVIEW_SCHEDULED:"📅 Scheduled", INTERVIEW_RESCHEDULED:"🔄 Rescheduled",
    INTERVIEW_CANCELLED:"🚫 Cancelled", REPORT_VIEWED:"📊 Report viewed",
    CANDIDATE_ON_HOLD:"⏸ On Hold"
  }
  return m[a] ?? a
}

export default function ManagerPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  type Tab = "candidates"|"sessions"|"approvals"|"schedule"|"analytics"|"monitoring"|"activity"
  const [tab, setTab]             = useState<Tab>("candidates")
  const [candidates, setCandidates] = useState<UserProfile[]>([])
  const [schedules,  setSchedules]  = useState<ScheduledInterview[]>([])
  const [sessions,   setSessions]   = useState<InterviewSession[]>([])
  const [approvals,  setApprovals]  = useState<JobApproval[]>([])
  const [logs,       setLogs]       = useState<ActivityLog[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [search,      setSearch]      = useState("")
  const [filterStatus,setFilterStatus]= useState("ALL")
  const [filterScore, setFilterScore] = useState("ALL")
  const [sortBy,      setSortBy]      = useState("newest")
  const [expandedUid, setExpandedUid] = useState<string|null>(null)
  const [appModal,  setAppModal]  = useState<{cand:UserProfile;ss:InterviewSession[]}|null>(null)
  const [appStatus, setAppStatus] = useState<JobApproval["status"]>("APPROVED")
  const [appNote,   setAppNote]   = useState("")
  const [appSaving, setAppSaving] = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [selCand,   setSelCand]   = useState("")
  const [selRole,   setSelRole]   = useState(ROLES[0])
  const [selDiff,   setSelDiff]   = useState("Medium")
  const [selDate,   setSelDate]   = useState("")
  const [selNotes,  setSelNotes]  = useState("")
  const [rounds, setRounds] = useState([
    { label:"Round 1 — HR",        type:"HR",        start:"09:00", end:"09:30" },
    { label:"Round 2 — Technical", type:"Technical", start:"10:00", end:"10:45" },
    { label:"Round 3 — Coding",    type:"Coding",    start:"11:00", end:"11:45" },
  ])
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState("")
  const [formOk,  setFormOk]  = useState("")
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
    if (!loading && profile && profile.role !== "manager") router.replace("/dashboard")
  }, [user, profile, loading, router])

  const loadAll = useCallback(async () => {
    if (!user) return
    const [c,sc,se,ap,al] = await Promise.all([
      getAllCandidates(), getAllSchedules(), getAllSessions(),
      getAllApprovals(), getActivityLogs()
    ])
    setCandidates(c); setSchedules(sc); setSessions(se); setApprovals(ap); setLogs(al)
  }, [user])

  useEffect(() => { loadAll().finally(() => setDataLoading(false)) }, [loadAll])

  const handleRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false) }
  const handleLogout  = async () => { await logout(); router.push("/login") }

  const handleSchedule = async () => {
    if (!selCand) { setFormErr("Select a candidate."); return }
    if (!selDate) { setFormErr("Select a date."); return }
    for (const r of rounds) if (r.start >= r.end) { setFormErr(`${r.label}: end must be after start.`); return }
    const [sy,sm,sd] = selDate.split("-").map(Number)
    const dayStart = new Date(sy,sm-1,sd,0,0).getTime()
    const dayEnd   = new Date(sy,sm-1,sd,23,59).getTime()
    const conflict = schedules.find(s =>
      s.candidateId===selCand && s.scheduledStart>=dayStart &&
      s.scheduledStart<=dayEnd && s.status!=="CANCELLED"
    )
    if (conflict) { setFormErr("This candidate already has a scheduled interview on that date."); return }
    setFormErr(""); setSaving(true)
    try {
      const cand = candidates.find(c => c.uid===selCand)!
      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i]
        const [sh,smin] = r.start.split(":").map(Number)
        const [eh,emin] = r.end.split(":").map(Number)
        await createSchedule({
          candidateId: selCand, candidateName: cand.name,
          managerId: user!.uid, managerName: profile?.name ?? "Manager",
          role: selRole, difficulty: selDiff, interviewType: r.type,
          scheduledStart: new Date(sy,sm-1,sd,sh,smin).getTime(),
          scheduledEnd:   new Date(sy,sm-1,sd,eh,emin).getTime(),
          roundNumber: i+1, roundLabel: r.label,
        } as any)
      }
      await logActivity({ managerId:user!.uid, managerName:profile?.name??"Manager",
        action:"INTERVIEW_SCHEDULED", candidateId:selCand, candidateName:cand.name,
        detail:`${selRole} · ${selDiff} · ${selDate}${selNotes?" · "+selNotes:""}`, ts:Date.now() })
      setFormOk("All 3 rounds scheduled!"); setShowForm(false); setSelNotes("")
      await loadAll(); setTimeout(() => setFormOk(""), 4000)
    } catch (err:any) { setFormErr(err.message ?? "Failed.") }
    finally { setSaving(false) }
  }

  const handleCancel = async (sc: ScheduledInterview) => {
    if (!confirm(`Cancel "${(sc as any).roundLabel ?? sc.interviewType}" for ${sc.candidateName}?`)) return
    await cancelSchedule(sc.id)
    await logActivity({ managerId:user!.uid, managerName:profile?.name??"Manager",
      action:"INTERVIEW_CANCELLED", candidateId:sc.candidateId, candidateName:sc.candidateName,
      detail:`Round ${(sc as any).roundNumber ?? 1} cancelled`, ts:Date.now() })
    await loadAll()
    setFormOk(`Interview cancelled for ${sc.candidateName}`); setTimeout(() => setFormOk(""), 3000)
  }

  const handleApprove = async () => {
    if (!appModal || !user) return; setAppSaving(true)
    try {
      const done  = appModal.ss.filter(s => s.status==="completed")
      const score = done.length ? Math.round(done.reduce((s,x)=>s+(x.report?.totalScore??0),0)/done.length) : 0
      await saveApproval({ candidateId:appModal.cand.uid, candidateName:appModal.cand.name,
        managerId:user.uid, status:appStatus, note:appNote, overallScore:score, role:done[0]?.role??"—" })
      const action = appStatus==="APPROVED"?"CANDIDATE_APPROVED":appStatus==="REJECTED"?"CANDIDATE_REJECTED":"CANDIDATE_ON_HOLD"
      await logActivity({ managerId:user.uid, managerName:profile?.name??"Manager",
        action, candidateId:appModal.cand.uid, candidateName:appModal.cand.name,
        detail:appNote||undefined, ts:Date.now() })
      setApprovals(prev => [...prev.filter(a=>a.candidateId!==appModal.cand.uid),
        { candidateId:appModal.cand.uid, candidateName:appModal.cand.name, managerId:user.uid,
          status:appStatus, note:appNote, overallScore:score, role:done[0]?.role??"—", updatedAt:null as any }])
      setFormOk(`${appModal.cand.name} → ${appStatus}`)
      setAppModal(null); setAppNote(""); await loadAll(); setTimeout(() => setFormOk(""), 4000)
    } catch (err:any) { setFormErr(err.message ?? "Failed.") }
    finally { setAppSaving(false) }
  }

  const fmt   = (ms:number) => new Date(ms).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})
  const today = () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime() }

  // Computed stats
  const todayMs      = today()
  const completed    = sessions.filter(s => s.status==="completed")
  const active       = sessions.filter(s => s.status==="active")
  const avgScore     = completed.length ? Math.round(completed.reduce((s,x)=>s+(x.report?.totalScore??0),0)/completed.length) : 0
  const todayScheds  = schedules.filter(s => s.scheduledStart>=todayMs && s.scheduledStart<todayMs+86_400_000)
  const passed       = approvals.filter(a => a.status==="APPROVED")
  const rejected     = approvals.filter(a => a.status==="REJECTED")
  const pending      = candidates.length - passed.length - rejected.length

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-interview-hero">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg">
        <Brain className="w-6 h-6 text-white animate-pulse"/>
      </div>
    </div>
  )

  // Filtered + sorted candidates
  let fc = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )
  if (filterStatus !== "ALL") {
    fc = fc.filter(c => {
      const a = approvals.find(x => x.candidateId===c.uid)
      return filterStatus==="PENDING" ? !a : a?.status===filterStatus
    })
  }
  if (filterScore !== "ALL") {
    fc = fc.filter(c => {
      const ds = sessions.filter(s=>s.candidateId===c.uid&&s.report)
      const av = ds.length ? Math.round(ds.reduce((s,x)=>s+(x.report?.totalScore??0),0)/ds.length) : null
      if (filterScore==="HIGH")   return av!==null && av>=70
      if (filterScore==="MEDIUM") return av!==null && av>=40 && av<70
      if (filterScore==="LOW")    return av!==null && av<40
      if (filterScore==="NONE")   return av===null
      return true
    })
  }
  fc = [...fc].sort((a,b) => {
    if (sortBy==="newest") return ((b.createdAt as any)?.seconds??0)-((a.createdAt as any)?.seconds??0)
    if (sortBy==="oldest") return ((a.createdAt as any)?.seconds??0)-((b.createdAt as any)?.seconds??0)
    const av = (uid:string) => { const d=sessions.filter(s=>s.candidateId===uid&&s.report); return d.length?Math.round(d.reduce((s,x)=>s+(x.report?.totalScore??0),0)/d.length):0 }
    if (sortBy==="highest") return av(b.uid)-av(a.uid)
    if (sortBy==="lowest")  return av(a.uid)-av(b.uid)
    return 0
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f4ff] via-[#dbeeff] to-[#f0f7ff] dark:from-[#0a1628] dark:to-[#1a3a7c]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow"><Brain className="w-4 h-4 text-white"/></div>
            <span className="font-bold text-gradient text-lg">InterviewAI</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#4FA3FF]/15 text-[#1a6fd4] text-xs font-bold">Manager</span>
          </div>
          <div className="flex items-center gap-3">
            {active.length>0 && <button onClick={()=>setTab("monitoring")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold animate-pulse"><Monitor className="w-3.5 h-3.5"/>{active.length} Live</button>}
            <button onClick={handleRefresh} disabled={refreshing} className="p-2 rounded-xl hover:bg-white/40 transition-all" title="Refresh"><RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing?"animate-spin":""}`}/></button>
            {/* Manager profile button */}
            <button onClick={()=>setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/40 dark:bg-white/10 border border-white/40 hover:bg-white/60 transition-all">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {profile?.name?.charAt(0)?.toUpperCase() ?? "M"}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300">{profile?.name}</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-500 transition-all"><LogOut className="w-4 h-4"/><span className="hidden sm:inline">Logout</span></button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* 8-stat overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            {label:"Candidates",value:candidates.length,     icon:Users,       color:"text-[#4FA3FF]"  },
            {label:"Scheduled", value:schedules.filter(s=>s.status==="SCHEDULED").length, icon:Calendar,color:"text-amber-500"},
            {label:"Today",     value:todayScheds.length,    icon:Clock,       color:"text-purple-500" },
            {label:"Completed", value:completed.length,      icon:CheckCircle2,color:"text-emerald-500"},
            {label:"Pending",   value:Math.max(0,pending),   icon:Bell,        color:"text-orange-500" },
            {label:"Avg Score", value:avgScore?`${avgScore}%`:"—", icon:Star,  color:"text-yellow-500" },
            {label:"Passed",    value:passed.length,         icon:ThumbsUp,    color:"text-emerald-600"},
            {label:"Rejected",  value:rejected.length,       icon:ThumbsDown,  color:"text-red-500"    },
          ].map(({label,value,icon:Icon,color}) => (
            <div key={label} className="glass-card rounded-2xl p-4 flex flex-col items-center text-center">
              <div className={`w-8 h-8 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center mb-2 flex-shrink-0 ${color}`}><Icon className="w-4 h-4"/></div>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white">{dataLoading?"…":value}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions — schedule only, others are in tabs below */}
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={()=>{setShowForm(true);setTab("schedule")}}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4"/> + Schedule Interview
          </button>
          {pending > 0 && (
            <button onClick={()=>setTab("approvals")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-50 border border-orange-200 text-orange-600 hover:-translate-y-0.5 transition-all">
              <Bell className="w-4 h-4"/> {pending} Pending {pending===1?"Approval":"Approvals"}
            </button>
          )}
          {active.length > 0 && (
            <button onClick={()=>setTab("monitoring")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-600 hover:-translate-y-0.5 transition-all animate-pulse">
              <Monitor className="w-4 h-4"/> {active.length} Live Interview{active.length>1?"s":""}
            </button>
          )}
        </div>

        {formOk && <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200"><CheckCircle2 className="w-5 h-5 text-emerald-500"/><p className="text-sm font-semibold text-emerald-700">{formOk}</p></div>}

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-1">
          {(["candidates","sessions","approvals","schedule","analytics","monitoring","activity"] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${tab===t?"bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] text-white shadow":"bg-white/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/80"}`}>
              {t==="candidates"?"👥 Candidates":t==="sessions"?"📊 Sessions":t==="approvals"?"✅ Approvals":t==="schedule"?"📅 Schedule":t==="analytics"?"📈 Analytics":t==="monitoring"?"🔴 Live":"📋 Activity"}
            </button>
          ))}
          {tab==="schedule"&&<button onClick={()=>setShowForm(true)} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow"><Plus className="w-4 h-4"/>Schedule</button>}
        </div>

        {/* ── CANDIDATES TAB ── */}
        {tab==="candidates" && (
          <div className="space-y-4">
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none focus:border-[#4FA3FF]/60"/>
              </div>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                className="py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none">
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="PENDING">Pending</option>
              </select>
              <select value={filterScore} onChange={e=>setFilterScore(e.target.value)}
                className="py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none">
                <option value="ALL">All Scores</option>
                <option value="HIGH">High (70%+)</option>
                <option value="MEDIUM">Medium (40-69%)</option>
                <option value="LOW">Low (&lt;40%)</option>
                <option value="NONE">No Score</option>
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                className="py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Score</option>
                <option value="lowest">Lowest Score</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">{fc.length} of {candidates.length} candidates</p>
            {dataLoading ? <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/>Loading…</div>
            : fc.length===0 ? <div className="glass-card rounded-2xl p-12 text-center"><Users className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-slate-500">No candidates found.</p></div>
            : <div className="space-y-3">{fc.map(c => {
              const cS  = sessions.filter(s => s.candidateId===c.uid)
              const cD  = cS.filter(s => s.status==="completed")
              const avg = cD.length ? Math.round(cD.reduce((s,x)=>s+(x.report?.totalScore??0),0)/cD.length) : null
              const apr = approvals.find(a => a.candidateId===c.uid)
              const open= expandedUid===c.uid
              const res = cS.find(s => s.status==="completed")
              return (
                <div key={c.uid} className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 dark:text-white">{c.name}</p>
                          {apr && <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${aBadge(apr.status)}`}>
                            {apr.status==="APPROVED"?<ThumbsUp className="w-3 h-3"/>:apr.status==="REJECTED"?<ThumbsDown className="w-3 h-3"/>:<Pause className="w-3 h-3"/>}{apr.status}
                          </span>}
                          {avg!==null && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${avg>=70?"bg-emerald-100 text-emerald-700":avg>=40?"bg-blue-100 text-blue-700":"bg-red-100 text-red-700"}`}>{avg}%</span>}
                        </div>
                        <p className="text-xs text-slate-400">{c.email}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cS.length} interviews · {cD.length} completed{avg!==null?` · Avg ${avg}%`:""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      <button onClick={()=>{setAppModal({cand:c,ss:cS});setAppStatus(apr?.status??"APPROVED");setAppNote(apr?.note??"")}}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow hover:-translate-y-0.5 transition-all">
                        <Award className="w-3.5 h-3.5"/>Decision
                      </button>
                      <button onClick={()=>setExpandedUid(open?null:c.uid)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/60 dark:bg-white/10 text-slate-600 hover:bg-white/80 transition-all">
                        <Eye className="w-3.5 h-3.5"/>{open?"Hide":"Details"}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${open?"rotate-180":""}`}/>
                      </button>
                      <button onClick={()=>{setSelCand(c.uid);setShowForm(true);setTab("schedule")}}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow hover:-translate-y-0.5 transition-all">
                        <Calendar className="w-3.5 h-3.5"/>Schedule
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t border-white/20 bg-white/20 dark:bg-white/5 p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interview History</p>
                      {cS.length===0 ? <p className="text-sm text-slate-400 text-center py-3">No interviews yet.</p>
                      : cS.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${s.status==="completed"?"bg-emerald-400":"bg-amber-400 animate-pulse"}`}/>
                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.role} · {s.difficulty}</p>
                              <p className="text-xs text-slate-400">{s.messages.filter(m=>m.role==="agent").length} questions</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.report && <span className="font-bold text-[#4FA3FF]">{s.report.totalScore}%</span>}
                            {s.report && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.report.recommendation==="Highly Recommended"||s.report.recommendation==="Recommended"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>{s.report.recommendation}</span>}
                            {s.status==="completed" && <Link href={`/report/${s.id}`} onClick={async()=>{ await logActivity({managerId:user.uid,managerName:profile?.name??"Manager",action:"REPORT_VIEWED",candidateId:c.uid,candidateName:c.name,ts:Date.now()}) }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow">Report<ChevronRight className="w-3 h-3"/></Link>}
                          </div>
                        </div>
                      ))}
                      {apr && <div className={`p-3 rounded-xl border ${aBadge(apr.status)}`}><p className="text-xs font-bold">{apr.status}</p>{apr.note&&<p className="text-xs mt-0.5 opacity-80">"{apr.note}"</p>}</div>}
                    </div>
                  )}
                </div>
              )
            })}</div>}
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab==="sessions" && (
          <div className="space-y-3">
            {dataLoading?<div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/>Loading…</div>
            :sessions.length===0?<div className="glass-card rounded-2xl p-12 text-center"><BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-slate-500">No sessions yet.</p></div>
            :sessions.map(s=>(
              <div key={s.id} className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.status==="completed"?"bg-emerald-400":"bg-amber-400 animate-pulse"}`}/>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{s.candidateName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.role} · {s.difficulty} · {s.messages.filter(m=>m.role==="agent").length} questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {s.report&&<span className="font-bold text-[#4FA3FF]">{s.report.totalScore}%</span>}
                  {s.report&&<span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.report.recommendation==="Highly Recommended"||s.report.recommendation==="Recommended"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>{s.report.recommendation}</span>}
                  {s.status==="completed"&&<Link href={`/report/${s.id}`} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow">Report<ChevronRight className="w-3 h-3"/></Link>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── APPROVALS TAB ── */}
        {tab==="approvals" && (
          <div className="space-y-3">
            {dataLoading?<div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/>Loading…</div>
            :approvals.length===0?(
              <div className="glass-card rounded-2xl p-12 text-center space-y-2">
                <Award className="w-10 h-10 text-slate-300 mx-auto"/>
                <p className="text-slate-500 font-semibold">No decisions yet.</p>
                <p className="text-xs text-slate-400">Go to Candidates → click Decision to approve or reject.</p>
              </div>
            ):approvals.map(a=>(
              <div key={a.candidateId} className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white font-bold flex-shrink-0 shadow">{a.candidateName.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{a.candidateName}</p>
                    <p className="text-xs text-slate-500">{a.role} · Score: {a.overallScore}%</p>
                    {a.note&&<p className="text-xs text-slate-400 mt-0.5 italic">"{a.note}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold border ${aBadge(a.status)}`}>
                    {a.status==="APPROVED"?<ThumbsUp className="w-4 h-4"/>:a.status==="REJECTED"?<ThumbsDown className="w-4 h-4"/>:<Pause className="w-4 h-4"/>}{a.status}
                  </span>
                  <button onClick={()=>{const c=candidates.find(x=>x.uid===a.candidateId);if(c){setAppModal({cand:c,ss:sessions.filter(s=>s.candidateId===a.candidateId)});setAppStatus(a.status);setAppNote(a.note)}}} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/60 dark:bg-white/10 text-slate-600 hover:bg-white/80 transition-all">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {tab==="schedule" && (
          <div className="space-y-3">
            {dataLoading?<div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/>Loading…</div>
            :schedules.length===0?(
              <div className="glass-card rounded-2xl p-12 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto"/>
                <p className="text-slate-500 font-semibold">No interviews scheduled.</p>
                <button onClick={()=>setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow"><Plus className="w-4 h-4"/>Schedule First</button>
              </div>
            ):schedules.map(sc=>(
              <div key={sc.id} className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center flex-shrink-0 shadow"><User className="w-5 h-5 text-white"/></div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">
                      {(sc as any).roundLabel??sc.candidateName}
                      {(sc as any).roundNumber&&<span className="ml-2 text-xs text-[#4FA3FF] font-bold">Round {(sc as any).roundNumber}</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{sc.candidateName} · {sc.role} · {sc.interviewType}</p>
                    <p className="text-xs text-[#4FA3FF] mt-0.5 font-semibold">{fmt(sc.scheduledStart)} → {new Date(sc.scheduledEnd).toLocaleTimeString("en-IN",{timeStyle:"short"})}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sColor(sc.status)}`}>{sc.status}</span>
                  {sc.sessionId&&<Link href={`/report/${sc.sessionId}`} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow">Report<ChevronRight className="w-3 h-3"/></Link>}
                  {sc.status==="SCHEDULED"&&<button onClick={()=>handleCancel(sc)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all">Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab==="analytics" && (
          <div className="space-y-5">
            {/* Score distribution */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#4FA3FF]"/>Score Distribution</h3>
              {completed.length===0 ? <p className="text-sm text-slate-400 text-center py-6">No completed interviews yet.</p> : (
                <div className="space-y-3">
                  {[["Highly Recommended / Recommended","bg-emerald-400",completed.filter(s=>s.report?.recommendation==="Highly Recommended"||s.report?.recommendation==="Recommended").length],
                    ["Needs Improvement","bg-amber-400",completed.filter(s=>s.report?.recommendation==="Needs Improvement").length],
                    ["Not Ready Yet","bg-red-400",completed.filter(s=>s.report?.recommendation==="Not Ready Yet").length],
                  ].map(([label,color,count])=>(
                    <div key={label as string} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500"><span>{label as string}</span><span className="font-bold">{count as number}</span></div>
                      <div className="h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{width:`${completed.length?(count as number/completed.length*100):0}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Approval stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {label:"Approved",value:passed.length,color:"from-emerald-400 to-emerald-600",icon:ThumbsUp},
                {label:"On Hold", value:approvals.filter(a=>a.status==="ON_HOLD").length,color:"from-amber-400 to-amber-600",icon:Pause},
                {label:"Rejected",value:rejected.length,color:"from-red-400 to-red-600",icon:ThumbsDown},
              ].map(({label,value,color,icon:Icon})=>(
                <div key={label} className={`glass-card rounded-2xl p-6 text-center bg-gradient-to-b`}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-3 shadow`}><Icon className="w-6 h-6 text-white"/></div>
                  <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{value}</p>
                  <p className="text-sm text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
            {/* Completion rate */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#4FA3FF]"/>Interview Completion Rate</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-4 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] rounded-full transition-all duration-700"
                    style={{width:`${sessions.length?Math.round(completed.length/sessions.length*100):0}%`}}/>
                </div>
                <span className="text-sm font-extrabold text-slate-700 dark:text-white w-12 text-right">
                  {sessions.length?Math.round(completed.length/sessions.length*100):0}%
                </span>
              </div>
              <p className="text-xs text-slate-400">{completed.length} completed out of {sessions.length} total sessions</p>
            </div>
            {/* Today's interviews */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-[#4FA3FF]"/>Today's Interviews</h3>
              {todayScheds.length===0 ? <p className="text-sm text-slate-400">No interviews scheduled for today.</p>
              : todayScheds.map(sc=>(
                <div key={sc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/30">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sc.candidateName}</p>
                    <p className="text-xs text-slate-400">{(sc as any).roundLabel} · {new Date(sc.scheduledStart).toLocaleTimeString("en-IN",{timeStyle:"short"})}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${sColor(sc.status)}`}>{sc.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE MONITORING TAB ── */}
        {tab==="monitoring" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-red-500"/> Live Interview Sessions
              </h2>
              <button onClick={handleRefresh} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/60 dark:bg-white/10 text-slate-600 hover:bg-white/80 transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing?"animate-spin":""}`}/>Refresh
              </button>
            </div>
            {active.length===0 ? (
              <div className="glass-card rounded-2xl p-12 text-center space-y-2">
                <Monitor className="w-10 h-10 text-slate-300 mx-auto"/>
                <p className="text-slate-500 font-semibold">No active interviews right now.</p>
                <p className="text-xs text-slate-400">Active sessions will appear here in real time.</p>
              </div>
            ) : active.map(s => (
              <div key={s.id} className="glass-card rounded-2xl p-5 border-l-4 border-red-400 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse flex-shrink-0"/>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{s.candidateName}</p>
                      <p className="text-xs text-slate-500">{s.role} · {s.difficulty}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">LIVE</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-white/5 text-center">
                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">{s.messages.filter(m=>m.role==="agent").length}</p>
                    <p className="text-xs text-slate-400">Questions</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-white/5 text-center">
                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">{s.messages.filter(m=>m.role==="candidate").length}</p>
                    <p className="text-xs text-slate-400">Answers</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-white/5 text-center">
                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">
                      {s.messages.filter(m=>m.role==="candidate"&&(m.score??0)>=6).length}
                    </p>
                    <p className="text-xs text-slate-400">Correct</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {tab==="activity" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-800 dark:text-white">Manager Activity Log</h2>
              <span className="text-xs text-slate-400">{logs.length} recent actions</span>
            </div>
            {dataLoading?<div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/>Loading…</div>
            :logs.length===0?<div className="glass-card rounded-2xl p-12 text-center"><Bell className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-slate-500">No activity yet.</p></div>
            :<div className="space-y-2">{logs.map((l,i)=>(
              <div key={l.id??i} className="glass-card rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{actLabel(l.action).split(" ")[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{actLabel(l.action).slice(2)}</p>
                  {l.candidateName&&<p className="text-xs text-slate-500">Candidate: {l.candidateName}</p>}
                  {l.detail&&<p className="text-xs text-slate-400 truncate">{l.detail}</p>}
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0 text-right">
                  {new Date(l.ts).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}
                </p>
              </div>
            ))}</div>}
          </div>
        )}
      </div>

      {/* ── Approval Modal ── */}
      {appModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Job Decision</h2>
              <button onClick={()=>setAppModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5 text-slate-500"/></button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white font-bold shadow">{appModal.cand.name.charAt(0)}</div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{appModal.cand.name}</p>
                <p className="text-xs text-slate-400">{appModal.cand.email}</p>
                <p className="text-xs text-[#4FA3FF] font-semibold mt-0.5">{appModal.ss.filter(s=>s.status==="completed").length} completed interviews</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Decision</label>
              <div className="grid grid-cols-3 gap-2">
                {([{v:"APPROVED",l:"✅ Approved",cls:"from-emerald-400 to-emerald-600"},{v:"ON_HOLD",l:"⏸ On Hold",cls:"from-amber-400 to-amber-600"},{v:"REJECTED",l:"❌ Rejected",cls:"from-red-400 to-red-600"}] as const).map(opt=>(
                  <button key={opt.v} type="button" onClick={()=>setAppStatus(opt.v)}
                    className={`py-3 rounded-xl text-xs font-extrabold transition-all ${appStatus===opt.v?`bg-gradient-to-r ${opt.cls} text-white shadow-lg scale-105`:"bg-white/60 dark:bg-white/10 text-slate-600 hover:bg-white/80"}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Note (optional)</label>
              <textarea value={appNote} onChange={e=>setAppNote(e.target.value)} rows={3}
                placeholder="Add feedback for the candidate or your team…"
                className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none focus:border-[#4FA3FF]/60 resize-none"/>
            </div>
            <button onClick={handleApprove} disabled={appSaving}
              className={`ripple w-full py-4 rounded-2xl font-extrabold text-white shadow-xl hover:-translate-y-0.5 disabled:opacity-60 transition-all flex items-center justify-center gap-2 ${appStatus==="APPROVED"?"bg-gradient-to-r from-emerald-400 to-emerald-600":appStatus==="REJECTED"?"bg-gradient-to-r from-red-400 to-red-600":"bg-gradient-to-r from-amber-400 to-amber-600"}`}>
              {appSaving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:<><Award className="w-4 h-4"/>Confirm {appStatus}</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Schedule Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 sm:p-8 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Schedule 3-Round Interview</h2>
              <button onClick={()=>{setShowForm(false);setFormErr("")}} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5 text-slate-500"/></button>
            </div>
            {formErr&&<div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/><p className="text-sm text-red-600">{formErr}</p></div>}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Candidate</label>
              <select value={selCand} onChange={e=>setSelCand(e.target.value)} className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none focus:border-[#4FA3FF]/60">
                <option value="">Select candidate…</option>
                {candidates.map(c=><option key={c.uid} value={c.uid}>{c.name} ({c.email})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Job Role</label>
                <select value={selRole} onChange={e=>setSelRole(e.target.value)} className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none">
                  {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Difficulty</label>
                <select value={selDiff} onChange={e=>setSelDiff(e.target.value)} className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none">
                  {DIFFICULTIES.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Interview Date</label>
              <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none focus:border-[#4FA3FF]/60"/>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Round Time Windows</label>
              {rounds.map((r,i)=>(
                <div key={i} className="p-4 rounded-xl border border-[#4FA3FF]/20 bg-white/30 dark:bg-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                    <input value={r.label} onChange={e=>setRounds(prev=>prev.map((x,j)=>j===i?{...x,label:e.target.value}:x))} className="flex-1 py-2 px-3 rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none font-semibold"/>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs text-slate-400 font-semibold block mb-1">Type</label>
                      <select value={r.type} onChange={e=>setRounds(prev=>prev.map((x,j)=>j===i?{...x,type:e.target.value}:x))} className="w-full py-2 px-2 rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-xs outline-none">
                        {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select></div>
                    <div><label className="text-xs text-slate-400 font-semibold block mb-1">Start</label>
                      <input type="time" value={r.start} onChange={e=>setRounds(prev=>prev.map((x,j)=>j===i?{...x,start:e.target.value}:x))} className="w-full py-2 px-2 rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-xs outline-none"/></div>
                    <div><label className="text-xs text-slate-400 font-semibold block mb-1">End</label>
                      <input type="time" value={r.end} onChange={e=>setRounds(prev=>prev.map((x,j)=>j===i?{...x,end:e.target.value}:x))} className="w-full py-2 px-2 rounded-lg border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-xs outline-none"/></div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400">Candidate can only start each round within its time window.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Notes (optional)</label>
              <textarea value={selNotes} onChange={e=>setSelNotes(e.target.value)} rows={2} placeholder="Any special instructions for this interview…"
                className="w-full py-3 px-4 rounded-xl border border-white/40 bg-white/60 dark:bg-white/10 text-slate-800 dark:text-white text-sm outline-none focus:border-[#4FA3FF]/60 resize-none"/>
            </div>
            <button onClick={handleSchedule} disabled={saving}
              className="ripple w-full py-4 rounded-2xl font-extrabold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow-xl hover:-translate-y-0.5 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Scheduling…</>:<><Calendar className="w-4 h-4"/>Schedule All 3 Rounds</>}
            </button>
          </div>
        </div>
      )}
      {/* ── Manager Profile Modal ── */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={()=>setShowProfile(false)}>
          <div className="glass-card rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Manager Profile</h2>
              <button onClick={()=>setShowProfile(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5 text-slate-500"/></button>
            </div>
            {/* Avatar + info */}
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white font-extrabold text-3xl shadow-xl avatar-ring">
                {profile?.name?.charAt(0)?.toUpperCase() ?? "M"}
              </div>
              <div className="text-center">
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{profile?.name ?? "Manager"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[#4FA3FF]/15 text-[#1a6fd4] text-xs font-bold">Manager</span>
              </div>
            </div>
            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:"Candidates Managed", value:candidates.length},
                {label:"Interviews Scheduled", value:schedules.length},
                {label:"Approvals Made", value:approvals.length},
                {label:"Actions Logged", value:logs.length},
              ].map(({label,value}) => (
                <div key={label} className="p-3 rounded-xl bg-white/40 dark:bg-white/5 text-center border border-white/30">
                  <p className="text-xl font-extrabold text-slate-800 dark:text-white">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <button onClick={async()=>{setShowProfile(false);await handleLogout()}}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
              <LogOut className="w-4 h-4"/> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
