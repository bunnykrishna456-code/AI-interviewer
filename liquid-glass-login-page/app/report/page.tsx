"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Brain, ArrowLeft, BarChart3, CheckCircle2, Clock,
  ChevronRight, Loader2, Play, TrendingUp, Award,
  AlertCircle, FileText
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getUserSessions, type InterviewSession } from "@/lib/firebase"

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 60 ? "text-blue-600 bg-blue-50 border-blue-200"
    : score >= 40 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200"
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-extrabold border ${color}`}>
      {score}%
    </span>
  )
}

function RecommendationBadge({ rec }: { rec: string }) {
  const map: Record<string, string> = {
    "Highly Recommended": "bg-emerald-100 text-emerald-700 border-emerald-300",
    "Recommended":        "bg-blue-100 text-blue-700 border-blue-300",
    "Needs Improvement":  "bg-amber-100 text-amber-700 border-amber-300",
    "Not Ready Yet":      "bg-red-100 text-red-700 border-red-300",
  }
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${map[rec] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {rec}
    </span>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    getUserSessions(user.uid)
      .then(setSessions)
      .finally(() => setDataLoading(false))
  }, [user])

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-interview-hero">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg">
        <Brain className="w-6 h-6 text-white animate-pulse"/>
      </div>
    </div>
  )

  const completed = sessions.filter(s => s.status === "completed")
  const avgScore  = completed.length
    ? Math.round(completed.reduce((sum, s) => sum + (s.report?.totalScore ?? 0), 0) / completed.length)
    : 0
  const best = completed.length
    ? Math.max(...completed.map(s => s.report?.totalScore ?? 0))
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f4ff] via-[#dbeeff] to-[#f0f7ff] dark:from-[#0a1628] dark:to-[#1a3a7c]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#4FA3FF] transition-colors">
              <ArrowLeft className="w-4 h-4"/> Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center">
                <Brain className="w-4 h-4 text-white"/>
              </div>
              <span className="font-bold text-gradient">InterviewAI</span>
            </div>
          </div>
          <Link href="/interview/new"
            className="ripple inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow hover:-translate-y-0.5 transition-all">
            <Play className="w-4 h-4 fill-white"/> New Interview
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Interview Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">All your past interview sessions and performance analysis.</p>
        </div>

        {/* Summary stats */}
        {completed.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Interviews", value: sessions.length, icon: FileText,   color: "text-[#4FA3FF]"  },
              { label: "Completed",        value: completed.length, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Average Score",    value: `${avgScore}%`,   icon: TrendingUp, color: "text-blue-500"   },
              { label: "Best Score",       value: `${best}%`,       icon: Award,      color: "text-amber-500"  },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5"/>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-white">{value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sessions list */}
        {dataLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin"/> Loading reports…
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-card rounded-3xl p-16 text-center space-y-4">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto"/>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No interviews yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Complete your first interview to see your report here.</p>
            <Link href="/interview/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow-lg hover:-translate-y-0.5 transition-all">
              <Play className="w-4 h-4 fill-white"/> Start First Interview
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(s => (
              <div key={s.id} className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.status === "completed" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}/>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-slate-800 dark:text-white">{s.role}</p>
                      <span className="px-2 py-0.5 rounded-lg bg-[#4FA3FF]/10 text-[#1a6fd4] dark:text-[#87CEEB] text-xs font-semibold">{s.difficulty}</span>
                      {s.status === "active" && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold">In Progress</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5"/>
                        {s.createdAt?.seconds
                          ? new Date(s.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "Recent"}
                      </span>
                      <span>{s.messages.filter(m => m.role === "agent").length} questions</span>
                      {s.report && <RecommendationBadge rec={s.report.recommendation}/>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {s.report && <ScoreBadge score={s.report.totalScore}/>}
                  {s.status === "completed" ? (
                    <Link href={`/report/${s.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] text-white text-sm font-bold hover:-translate-y-0.5 transition-all shadow">
                      View Report <ChevronRight className="w-4 h-4"/>
                    </Link>
                  ) : (
                    <Link href={`/interview/${s.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:-translate-y-0.5 transition-all shadow">
                      Continue <ChevronRight className="w-4 h-4"/>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
