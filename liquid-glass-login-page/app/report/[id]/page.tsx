"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  Brain, ArrowLeft, CheckCircle2, AlertCircle, TrendingUp,
  Award, Target, BookOpen, ChevronRight, Play, Loader2,
  BarChart3, MessageSquare, Star
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getSession, type InterviewSession } from "@/lib/firebase"

export default function ReportDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user, loading } = useAuth()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !id) return
    getSession(id).then(s => {
      setSession(s)
      setPageLoading(false)
    })
  }, [user, id])

  if (loading || !user || pageLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-interview-hero">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg">
        <Brain className="w-6 h-6 text-white animate-pulse"/>
      </div>
    </div>
  )

  if (!session?.report) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-interview-hero gap-4">
      <AlertCircle className="w-10 h-10 text-amber-500"/>
      <p className="text-slate-700 font-semibold">Report not ready yet.</p>
      <Link href="/report" className="text-sm text-[#4FA3FF] hover:underline">← Back to Reports</Link>
    </div>
  )

  const r = session.report
  const qa = session.messages.reduce<{q:string;a:string;score:number;feedback?:string}[]>((acc, m, i) => {
    if (m.role === "agent" && session.messages[i+1]?.role === "candidate") {
      acc.push({ q: m.content, a: session.messages[i+1].content, score: session.messages[i+1].score ?? 0, feedback: session.messages[i+1].feedback })
    }
    return acc
  }, [])

  const recColor: Record<string, string> = {
    "Highly Recommended": "from-emerald-400 to-emerald-600",
    "Recommended":        "from-[#4FA3FF] to-[#1a6fd4]",
    "Needs Improvement":  "from-amber-400 to-amber-600",
    "Not Ready Yet":      "from-red-400 to-red-600",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f4ff] via-[#dbeeff] to-[#f0f7ff] dark:from-[#0a1628] dark:to-[#1a3a7c]">
      <nav className="sticky top-0 z-50 glass border-b border-white/30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/report" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#4FA3FF] transition-colors">
              <ArrowLeft className="w-4 h-4"/> All Reports
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
            <Play className="w-3.5 h-3.5 fill-white"/> New Interview
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Hero score card */}
        <div className={`rounded-3xl p-8 bg-gradient-to-r ${recColor[r.recommendation] ?? "from-[#4FA3FF] to-[#1a6fd4]"} text-white shadow-2xl`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-100 text-sm font-semibold">{session.role} · {session.difficulty}</p>
              <h1 className="text-4xl font-extrabold mt-1">{r.totalScore}<span className="text-2xl text-blue-100">/100</span></h1>
              <p className="text-blue-100 text-sm mt-1">Overall Score</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-2 rounded-2xl bg-white/20 border border-white/30 font-extrabold text-lg">
                {r.recommendation}
              </div>
              <p className="text-blue-100 text-xs mt-2">{r.questionsAsked} questions · {r.correctAnswers} correct answers</p>
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Technical Score",      value: r.technicalScore,      icon: Target },
            { label: "Communication Score",  value: r.communicationScore,  icon: MessageSquare },
            { label: "Correct Answers",      value: Math.round((r.correctAnswers / Math.max(r.questionsAsked, 1)) * 100), icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#4FA3FF]"/>{label}
                </span>
                <span className="font-extrabold text-slate-800 dark:text-white">{value}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="progress-fill h-full rounded-full" style={{ width: `${value}%` }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <h2 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500"/> Strengths
            </h2>
            {r.strengths.length === 0
              ? <p className="text-sm text-slate-400">No strengths recorded.</p>
              : r.strengths.map(s => (
                <div key={s} className="flex items-start gap-2.5">
                  <Star className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"/>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{s}</p>
                </div>
              ))}
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <h2 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500"/> Areas to Improve
            </h2>
            {r.weaknesses.length === 0
              ? <p className="text-sm text-slate-400">No weaknesses recorded.</p>
              : r.weaknesses.map(w => (
                <div key={w} className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"/>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{w}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Improvement plan */}
        {r.improvements.length > 0 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4FA3FF]"/> Improvement Plan
            </h2>
            <div className="space-y-4">
              {r.improvements.map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-white/30 space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">{i+1}</span>
                    {item.topic}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 pl-8">{item.suggestion}</p>
                  {item.resources.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-8">
                      {item.resources.map(res => (
                        <a key={res} href={res.startsWith("http") ? res : `https://${res}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-[#4FA3FF] hover:underline font-semibold">
                          <BookOpen className="w-3 h-3"/> {res}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A Review */}
        {qa.length > 0 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#4FA3FF]"/> Question-wise Review
            </h2>
            <div className="space-y-4">
              {qa.map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-white/30 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <span className="text-[#4FA3FF] font-extrabold mr-2">Q{i+1}.</span>{item.q}
                    </p>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold border ${item.score >= 6 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {item.score}/10
                    </span>
                  </div>
                  <div className="pl-4 border-l-2 border-slate-200 dark:border-white/20">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">Your Answer:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
                  </div>
                  {item.feedback && (
                    <div className={`px-3 py-2 rounded-lg text-xs ${item.score >= 6 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}`}>
                      <span className="font-bold">Feedback: </span>{item.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 pb-4">
          <Link href="/interview/new"
            className="ripple flex-1 inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-extrabold bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all">
            <Play className="w-5 h-5 fill-white"/> Practice Again
          </Link>
          <Link href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 glass hover:-translate-y-0.5 transition-all">
            <ArrowLeft className="w-4 h-4"/> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
