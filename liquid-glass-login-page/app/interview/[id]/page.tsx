"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Brain, Send, Loader2, CheckCircle2, AlertCircle,
  BarChart3, ChevronRight, Mic, MicOff,
  Flag, Camera, CameraOff, Volume2, Maximize, Minimize
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  getSession, appendMessage, closeSession, logMonitoringEvent,
  type ChatMessage, type InterviewSession
} from "@/lib/firebase"

const TOTAL_QUESTIONS = 8

// ── Text-to-Speech helper ─────────────────────────────────────────────────────
// Voices load asynchronously — wait for them before speaking
function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const clean = text.replace(/["""'']/g, "").trim()
  if (!clean) return

  const doSpeak = () => {
    const utt   = new SpeechSynthesisUtterance(clean)
    utt.lang  = "en-US"
    utt.rate  = 0.9
    utt.pitch = 1.0
    utt.volume = 1.0
    const voices = window.speechSynthesis.getVoices()
    // Prefer a natural English voice; fall back to first available en-US
    const preferred =
      voices.find(v => v.name.includes("Google US English")) ||
      voices.find(v => v.name.includes("Samantha")) ||
      voices.find(v => v.lang === "en-US") ||
      voices.find(v => v.lang.startsWith("en"))
    if (preferred) utt.voice = preferred
    window.speechSynthesis.speak(utt)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    // Voices already loaded
    doSpeak()
  } else {
    // Wait for voices to load (fires once)
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      doSpeak()
    }
  }
}

function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel()
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function Timer({ endMs, onExpire }: { endMs: number | null; onExpire: () => void }) {
  const [rem, setRem] = useState(endMs ? endMs - Date.now() : null)
  useEffect(() => {
    if (!endMs) return
    const t = setInterval(() => {
      const left = endMs - Date.now()
      setRem(left)
      if (left <= 0) { clearInterval(t); onExpire() }
    }, 1000)
    return () => clearInterval(t)
  }, [endMs, onExpire])
  if (!rem || rem <= 0) return null
  const m = Math.floor(rem / 60_000)
  const s = Math.floor((rem % 60_000) / 1000)
  const urgent = rem < 5 * 60_000
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
      urgent ? "bg-red-500/30 text-red-300 animate-pulse" : "bg-white/10 text-white"
    }`}>
      <span>⏱</span>
      {m}:{s.toString().padStart(2,"0")}
    </div>
  )
}

export default function InterviewRoomPage() {
  const router = useRouter()
  const params = useParams()
  const id     = params.id as string
  const { user, loading } = useAuth()

  // ── core state ────────────────────────────────────────────────────────────
  const [session,        setSession]        = useState<InterviewSession | null>(null)
  const [messages,       setMessages]       = useState<ChatMessage[]>([])
  const [answer,         setAnswer]         = useState("")
  const [questionNum,    setQuestionNum]    = useState(0)
  const [currentQ,       setCurrentQ]       = useState("")
  const [displayedQ,     setDisplayedQ]     = useState("")
  const [agentTyping,    setAgentTyping]    = useState(false)
  const [evaluating,     setEvaluating]     = useState(false)
  const [lastEval,       setLastEval]       = useState<{score:number;feedback:string;isCorrect:boolean}|null>(null)
  const [done,           setDone]           = useState(false)
  const [finishing,      setFinishing]      = useState(false)
  const [error,          setError]          = useState("")
  const [sessionLoading, setSessionLoading] = useState(true)
  const [resume,         setResume]         = useState<any>(null)

  // ── camera / mic ─────────────────────────────────────────────────────────
  const [camOn,      setCamOn]      = useState(false)
  const [micOn,      setMicOn]      = useState(false)
  const [listening,  setListening]  = useState(false)
  const [micLevel,   setMicLevel]   = useState(0)

  // ── monitoring ────────────────────────────────────────────────────────────
  const [monEvents,    setMonEvents]    = useState<string[]>([])
  const [fsActive,     setFsActive]     = useState(false)
  const [showWarning,  setShowWarning]  = useState("")

  // ── timer ─────────────────────────────────────────────────────────────────
  const [endMs, setEndMs] = useState<number | null>(null)

  // ── refs ──────────────────────────────────────────────────────────────────
  const bottomRef     = useRef<HTMLDivElement>(null)
  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const videoRef      = useRef<HTMLVideoElement>(null)
  const camStreamRef  = useRef<MediaStream | null>(null)
  const recognitionRef= useRef<any>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const micFrameRef   = useRef<number>(0)
  const roomRef       = useRef<HTMLDivElement>(null)

  // ── auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  // ── load session + resume + schedule end time ────────────────────────────
  useEffect(() => {
    if (!user || !id) return
    getSession(id).then(async s => {
      if (!s) { router.replace("/dashboard"); return }
      setSession(s)
      const msgs = s.messages ?? []
      setMessages(msgs)
      setQuestionNum(msgs.filter((m: ChatMessage) => m.role === "agent").length)
      const { getResume, getUserSchedules } = await import("@/lib/firebase")
      const [r, schedules] = await Promise.all([
        getResume(user.uid),
        getUserSchedules(user.uid),
      ])
      setResume(r)
      // Use schedule end time as the interview timer
      const active = schedules.find(sc => sc.sessionId === id || sc.status === "IN_PROGRESS")
      if (active) setEndMs(active.scheduledEnd)
      setSessionLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  // fetch first question once loaded
  useEffect(() => {
    if (!sessionLoading && session && questionNum === 0) fetchNextQuestion()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading])

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, agentTyping, lastEval])

  // ── typewriter for AI question — speaks AFTER full text is displayed ────────
  useEffect(() => {
    if (!currentQ) return
    setDisplayedQ("")
    let i = 0
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      setDisplayedQ(currentQ.slice(0, i))
      if (i < currentQ.length) {
        i++
        setTimeout(tick, 18)
      } else {
        // Typewriter finished — now speak the complete question
        if (!cancelled) speakIfUnmuted(currentQ)
      }
    }
    tick()
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [currentQ])

  // ── cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    stopCamera()
    stopSpeaking()
    cancelAnimationFrame(micFrameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      camStreamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamOn(true)
    } catch { setError("Camera permission denied.") }
  }

  const stopCamera = () => {
    camStreamRef.current?.getTracks().forEach(t => t.stop())
    camStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamOn(false)
    if (session && user) {
      logMonitoringEvent({ sessionId: id, candidateId: user.uid, type: "CAMERA_DISABLED", ts: Date.now() })
      addMonEvent("⚠ Camera disabled")
    }
  }

  // ── mic visualiser ────────────────────────────────────────────────────────
  const startMicVisualiser = (stream: MediaStream) => {
    try {
      const ctx      = new AudioContext()
      const src      = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser
      const buf  = new Uint8Array(analyser.frequencyBinCount)
      const draw = () => {
        micFrameRef.current = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(buf)
        setMicLevel(Math.min(100, (buf.reduce((a,b) => a+b,0)/buf.length)*2))
      }
      draw()
    } catch { /* ignore */ }
  }

  // ── speech recognition — auto-submits when speech ends ──────────────────
  const toggleListen = async () => {
    if (listening) {
      recognitionRef.current?.stop()
      cancelAnimationFrame(micFrameRef.current)
      setMicLevel(0); setListening(false); setMicOn(false)
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setError("Speech recognition not supported. Please type your answer."); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicOn(true)
      startMicVisualiser(stream)
      const rec = new SR()
      rec.lang = "en-US"
      rec.interimResults = false   // only final results
      rec.continuous = false       // one utterance → auto-submit

      let spokenText = ""

      rec.onresult = (e: any) => {
        // Collect the final transcript — do NOT put it in the answer box
        spokenText = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join(" ")
          .trim()
      }

      rec.onend = () => {
        setListening(false); setMicOn(false); setMicLevel(0)
        cancelAnimationFrame(micFrameRef.current)
        // Auto-submit directly to AI if we got speech
        if (spokenText.length > 1) {
          submitVoiceAnswer(spokenText)
        }
      }

      rec.onerror = (e: any) => {
        setListening(false); setMicOn(false); setMicLevel(0)
        if (e.error !== "no-speech") setError("Mic error: " + e.error)
      }

      rec.start()
      recognitionRef.current = rec
      setListening(true)
    } catch { setError("Microphone permission denied. Please type your answer.") }
  }

  // ── fullscreen ────────────────────────────────────────────────────────────
  const enterFullscreen = async () => {
    try {
      await (roomRef.current?.requestFullscreen?.() ?? document.documentElement.requestFullscreen())
      setFsActive(true)
    } catch { /* browser may block */ }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
  }

  useEffect(() => {
    const onFsChange = () => {
      const active = !!document.fullscreenElement
      setFsActive(active)
      if (!active && !done && session) {
        addMonEvent("⚠ Fullscreen exited")
        logMonitoringEvent({ sessionId: id, candidateId: user?.uid ?? "", type: "FULLSCREEN_EXIT", ts: Date.now() })
        showWarn("⚠ Please return to fullscreen to continue the interview.")
      }
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, session])

  // ── tab / window blur monitoring ──────────────────────────────────────────
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && !done) {
        addMonEvent("⚠ Tab switched / window hidden")
        logMonitoringEvent({ sessionId: id, candidateId: user?.uid ?? "", type: "TAB_SWITCH", ts: Date.now() })
        showWarn("⚠ Tab switching detected. Please stay on this page.")
      }
    }
    const onBlur = () => {
      if (!done) {
        addMonEvent("⚠ Window lost focus")
        logMonitoringEvent({ sessionId: id, candidateId: user?.uid ?? "", type: "WINDOW_BLUR", ts: Date.now() })
      }
    }
    document.addEventListener("visibilitychange", onHidden)
    window.addEventListener("blur", onBlur)
    return () => {
      document.removeEventListener("visibilitychange", onHidden)
      window.removeEventListener("blur", onBlur)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, id])

  // ── enter fullscreen when interview loads ─────────────────────────────────
  useEffect(() => {
    if (!sessionLoading && !done) {
      setTimeout(enterFullscreen, 600)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading])

  // ── start camera automatically ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading) startCamera()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading])

  const addMonEvent = (msg: string) => {
    setMonEvents(prev => [...prev.slice(-9), msg])
  }
  const showWarn = (msg: string) => {
    setShowWarning(msg)
    setTimeout(() => setShowWarning(""), 5000)
  }

  const [muted, setMuted] = useState(false)

  const toggleMute = () => {
    if (!muted) { stopSpeaking(); setMuted(true) }
    else setMuted(false)
  }

  // Wrap speak to respect mute
  const speakIfUnmuted = (text: string) => {
    if (!muted) speak(text)
  }
  const handleTimerExpire = useCallback(() => {
    if (!done) {
      setDone(true)
      showWarn("⏱ Interview time expired. Generating your report…")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ── fetch next AI question ────────────────────────────────────────────────
  const fetchNextQuestion = useCallback(async () => {
    if (!user || !session) return
    setAgentTyping(true); setError("")
    try {
      const res  = await fetch("/api/interview/question", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessionId:      id,
          uid:            user.uid,
          role:           session.role,
          difficulty:     session.difficulty,
          messages,
          resume,
          questionNumber: questionNum + 1,
        }),
      })
      const data = await res.json()
      if (data.done) { setDone(true); return }
      if (!res.ok) throw new Error(data.error ?? "Failed to get question")
      setCurrentQ(data.question)
      setQuestionNum(data.questionNumber)
      const msg: ChatMessage = { role: "agent", content: data.question, ts: Date.now() }
      setMessages(prev => [...prev, msg])
      await appendMessage(id, msg)
    } catch (err: any) {
      setError(err.message ?? "Failed to load question. Please retry.")
    } finally { setAgentTyping(false) }
  }, [user, id, session, messages, resume, questionNum])

  // ── submit typed answer ───────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!answer.trim() || !user || evaluating || agentTyping) return
    const trimmed = answer.trim()
    setAnswer("")
    await processAnswer(trimmed)
  }

  // ── submit voice answer (bypasses text box completely) ────────────────────
  const submitVoiceAnswer = async (spokenText: string) => {
    if (!spokenText.trim() || !user || evaluating || agentTyping) return
    await processAnswer(spokenText.trim())
  }

  // ── shared answer processing ──────────────────────────────────────────────
  const processAnswer = async (trimmed: string) => {
    stopSpeaking()
    setLastEval(null); setEvaluating(true)

    const candidateMsg: ChatMessage = { role: "candidate", content: trimmed, ts: Date.now() }
    setMessages(prev => [...prev, candidateMsg])

    try {
      const res  = await fetch("/api/interview/evaluate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessionId: id, uid: user!.uid,
          question:  currentQ, answer: trimmed,
          role:      session?.role ?? "", resume,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed")

      await appendMessage(id, { ...candidateMsg, score: data.score, feedback: data.feedback })
      setLastEval({ score: data.score, feedback: data.feedback, isCorrect: data.isCorrect })

      const replyMsg: ChatMessage = { role: "agent", content: data.shortReply, ts: Date.now() }
      setMessages(prev => [...prev, replyMsg])
      await appendMessage(id, replyMsg)
      speakIfUnmuted(data.shortReply)

      setTimeout(() => {
        setLastEval(null); setEvaluating(false)
        if (questionNum >= TOTAL_QUESTIONS) setDone(true)
        else fetchNextQuestion()
      }, 2500)
    } catch (err: any) {
      setError(err.message ?? "Evaluation failed. Please try again.")
      setEvaluating(false)
    }
  }

  // ── finish + generate report ──────────────────────────────────────────────
  const finishInterview = async () => {
    if (!user || finishing) return
    setFinishing(true); stopSpeaking(); exitFullscreen()
    try {
      const res  = await fetch("/api/interview/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId: id, uid: user.uid, role: session?.role ?? "", messages, resume }),
      })
      if (!res.ok) throw new Error("Report generation failed")
      const data = await res.json()
      await closeSession(id, data.report)
      router.push(`/report/${id}`)
    } catch {
      setError("Failed to generate report. Please try again.")
      setFinishing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer() }
  }

  // ── loading screen ────────────────────────────────────────────────────────
  if (loading || !user || sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg avatar-ring">
          <Brain className="w-7 h-7 text-white animate-pulse"/>
        </div>
        <p className="text-slate-400 text-sm">Loading interview room…</p>
        <div className="flex gap-1.5">
          <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
        </div>
      </div>
    </div>
  )

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div ref={roomRef} className="min-h-screen bg-[#0a1628] flex flex-col overflow-hidden">

      {/* Warning overlay */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4"/> {showWarning}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0d1f3c] flex-shrink-0">
        {/* AI avatar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg avatar-ring">
              <Brain className="w-5 h-5 text-white"/>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0d1f3c]"/>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Alex — AI Interviewer</p>
            <p className="text-[#4FA3FF] text-xs mt-0.5">{session?.role} · {session?.difficulty}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Question counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold">
            Q {Math.min(questionNum, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </div>
          {/* Progress */}
          <div className="hidden sm:block w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="progress-fill h-full rounded-full transition-all duration-700"
              style={{ width: `${(Math.min(questionNum,TOTAL_QUESTIONS)/TOTAL_QUESTIONS)*100}%` }}/>
          </div>
          {/* Timer */}
          <Timer endMs={endMs} onExpire={handleTimerExpire}/>
          {/* Mute toggle */}
          <button onClick={toggleMute}
            title={muted ? "Unmute AI voice" : "Mute AI voice"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold
              ${muted ? "bg-red-500/30 text-red-400" : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-[#4FA3FF]"}`}>
            {muted ? "🔇" : "🔊"}
          </button>
          {/* Fullscreen toggle */}
          <button onClick={fsActive ? exitFullscreen : enterFullscreen}
            className="w-8 h-8 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 flex items-center justify-center transition-all"
            title={fsActive ? "Exit fullscreen" : "Enter fullscreen"}>
            {fsActive ? <Minimize className="w-4 h-4"/> : <Maximize className="w-4 h-4"/>}
          </button>
          {/* Camera toggle */}
          <button onClick={camOn ? stopCamera : startCamera}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${camOn ? "bg-[#4FA3FF]/20 text-[#4FA3FF]" : "bg-white/10 text-slate-400 hover:bg-white/20"}`}
            title={camOn ? "Turn off camera" : "Turn on camera"}>
            {camOn ? <Camera className="w-4 h-4"/> : <CameraOff className="w-4 h-4"/>}
          </button>
          {/* End */}
          {!done && (
            <button onClick={() => setDone(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold transition-all">
              <Flag className="w-3.5 h-3.5"/> End
            </button>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: AI question + candidate answer (separate areas) ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── AI Question panel (top, read-only) ── */}
          <div className="border-b border-white/10 bg-[#0d1f3c]/80 px-4 sm:px-6 py-4 flex-shrink-0 min-h-[110px]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                <Brain className="w-4 h-4 text-white"/>
              </div>
              <div className="flex-1">
                <p className="text-[#4FA3FF] text-xs font-bold mb-1.5 uppercase tracking-wider">Alex is asking</p>
                {agentTyping ? (
                  <div className="flex gap-1.5 mt-2">
                    <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                  </div>
                ) : currentQ ? (
                  <p className="text-white text-sm sm:text-base leading-relaxed font-medium">
                    {displayedQ}
                    <span className="inline-block w-0.5 h-4 bg-[#4FA3FF] ml-0.5 align-middle animate-pulse"/>
                  </p>
                ) : (
                  <p className="text-slate-500 text-sm italic">Waiting for question…</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Chat history (scrollable middle) ── */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
                {m.role === "agent" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow">
                    <Brain className="w-3.5 h-3.5 text-white"/>
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "agent"
                      ? "bg-[#1a3a7c]/60 border border-[#4FA3FF]/20 text-slate-200 rounded-tl-sm"
                      : "bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] text-white rounded-tr-sm"
                  }`}>
                    {m.content}
                  </div>
                  {m.role === "candidate" && m.score !== undefined && (
                    <div className={`self-end flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                      m.score >= 6 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : m.score === 0 ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
                      {m.score >= 6 ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                      {m.score}/10 — {m.score === 0 ? "Wrong answer" : m.score >= 6 ? "Correct" : "Partial"}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Feedback panel */}
            {lastEval && (
              <div className={`mx-auto max-w-lg p-4 rounded-2xl border text-sm ${
                lastEval.score === 0 ? "bg-red-900/40 border-red-500/40 text-red-300"
                : lastEval.isCorrect ? "bg-emerald-900/30 border-emerald-500/30 text-emerald-300"
                : "bg-amber-900/30 border-amber-500/30 text-amber-300"}`}>
                <p className="font-bold mb-1 flex items-center gap-2">
                  {lastEval.score === 0
                    ? <><AlertCircle className="w-4 h-4"/> Score: 0/10 — Incorrect</>
                    : lastEval.isCorrect
                    ? <><CheckCircle2 className="w-4 h-4"/> Score: {lastEval.score}/10 — Correct!</>
                    : <><AlertCircle className="w-4 h-4"/> Score: {lastEval.score}/10 — Partial</>}
                </p>
                <p className="text-xs opacity-90">{lastEval.feedback}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-sm max-w-xl mx-auto">
                <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                <span>{error}</span>
                <button onClick={() => setError("")} className="ml-auto text-xs underline">Dismiss</button>
              </div>
            )}

            {/* Monitoring log */}
            {monEvents.length > 0 && (
              <div className="mx-auto max-w-lg p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-amber-400 text-xs font-bold mb-1.5">🔍 Monitoring Log</p>
                {monEvents.map((e, i) => (
                  <p key={i} className="text-amber-300/80 text-xs">{e}</p>
                ))}
              </div>
            )}

            {/* Complete card */}
            {done && (
              <div className="glass-dark rounded-3xl p-8 text-center space-y-5 max-w-md mx-auto my-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-8 h-8 text-white"/>
                </div>
                <h3 className="text-xl font-extrabold text-white">Interview Complete!</h3>
                <p className="text-slate-400 text-sm">Generating your personalised performance report…</p>
                <button onClick={finishInterview} disabled={finishing}
                  className="ripple w-full py-3.5 rounded-2xl font-extrabold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow-lg hover:-translate-y-0.5 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                  {finishing
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Generating Report…</>
                    : <><BarChart3 className="w-4 h-4"/>View My Report<ChevronRight className="w-4 h-4"/></>}
                </button>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* ── Candidate answer box (bottom, clearly separate) ── */}
          {!done && (
            <div className="border-t border-[#4FA3FF]/20 bg-[#0a1628] px-4 sm:px-6 py-4 flex-shrink-0">
              <p className="text-[#4FA3FF] text-xs font-bold mb-2 uppercase tracking-wider">Your Answer</p>
              {listening && (
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0"/>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-100"
                      style={{ width: `${micLevel}%` }}/>
                  </div>
                  <span className="text-xs text-red-400 font-bold">Listening…</span>
                </div>
              )}
              <div className="flex gap-3 items-end">
                <button onClick={toggleListen} disabled={evaluating || agentTyping}
                  title={listening ? "Stop" : "Speak answer"}
                  className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                    listening ? "bg-red-500 text-white shadow-lg shadow-red-500/40 scale-105"
                    : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-[#4FA3FF]"}`}>
                  {listening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                </button>
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={agentTyping || evaluating}
                  rows={3}
                  placeholder={
                    agentTyping ? "Alex is thinking…"
                    : evaluating ? "Evaluating your answer…"
                    : listening  ? "Listening… speak your answer"
                    : "Type your answer and press Enter, or click the mic to speak"
                  }
                  className="flex-1 bg-white/8 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder:text-slate-500 text-sm outline-none focus:border-[#4FA3FF]/60 resize-none disabled:opacity-50 transition-all leading-relaxed"
                />
                <button onClick={submitAnswer}
                  disabled={!answer.trim() || agentTyping || evaluating}
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center disabled:opacity-40 hover:-translate-y-0.5 transition-all shadow-lg">
                  {evaluating ? <Loader2 className="w-5 h-5 text-white animate-spin"/> : <Send className="w-5 h-5 text-white"/>}
                </button>
              </div>
              <p className="text-xs text-slate-600 text-center mt-2">Enter to submit · Shift+Enter new line · 🎤 mic auto-submits when you stop speaking</p>
            </div>
          )}
        </div>

        {/* ── Right: camera panel ── */}
        {camOn && (
          <div className="hidden lg:flex flex-col w-64 border-l border-white/10 bg-[#0d1f3c] p-4 gap-4 flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-xs text-white font-semibold">
                <Camera className="w-3 h-3 text-emerald-400"/> You
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-slate-400 font-bold uppercase tracking-wider">Session Info</p>
              {[["Role",session?.role],["Difficulty",session?.difficulty],["Q",`${Math.min(questionNum,TOTAL_QUESTIONS)}/${TOTAL_QUESTIONS}`]].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200 font-semibold truncate ml-2">{v}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10">
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Monitoring</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"/>
                  <span className="text-slate-300">Camera Active</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${fsActive ? "bg-emerald-400" : "bg-amber-400"}`}/>
                  <span className="text-slate-300">{fsActive ? "Fullscreen" : "Windowed"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile camera overlay */}
        {camOn && (
          <div className="lg:hidden fixed bottom-28 right-4 w-28 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-30 aspect-video bg-slate-900">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
          </div>
        )}
      </div>
    </div>
  )
}
