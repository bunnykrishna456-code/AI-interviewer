"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Brain, Mic, Code2, Shield, BarChart3, FileText,
  Star, ChevronRight, Play, ArrowRight, CheckCircle2,
  Users, Award, TrendingUp, Zap, Globe, BookOpen,
  Camera, MessageSquare, Download, Bell, Menu, X,
  Moon, Sun
} from "lucide-react"

// ── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-blue-100/50" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">InterviewAI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-[#4FA3FF] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#4FA3FF] transition-colors">How it Works</a>
            <a href="#stats" className="hover:text-[#4FA3FF] transition-colors">Results</a>
            <a href="#pricing" className="hover:text-[#4FA3FF] transition-colors">Pricing</a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4 text-[#4FA3FF]" /> : <Moon className="w-4 h-4 text-slate-500" />}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#4FA3FF] rounded-xl border border-[#4FA3FF]/30 hover:bg-[#4FA3FF]/10 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login?tab=signup"
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] hover:shadow-lg hover:shadow-blue-300/40 hover:-translate-y-0.5 transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-white/20 px-4 py-4 space-y-3">
          <a href="#features" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#4FA3FF]" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#4FA3FF]" onClick={() => setMobileOpen(false)}>How it Works</a>
          <a href="#stats" className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#4FA3FF]" onClick={() => setMobileOpen(false)}>Results</a>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="flex-1 text-center py-2 text-sm font-semibold text-[#4FA3FF] border border-[#4FA3FF]/30 rounded-xl">Sign In</Link>
            <Link href="/login?tab=signup" className="flex-1 text-center py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] rounded-xl">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── Hero Section ─────────────────────────────────────────────────────────────
// Questions Alex cycles through in the preview card
const ALEX_QUESTIONS = [
  "Tell me about a challenging project you worked on. What was your role and how did you handle the technical obstacles?",
  "How do you approach debugging a production issue under time pressure?",
  "Explain the difference between REST and GraphQL. When would you choose one over the other?",
  "Walk me through how you would design a scalable notification system for 10 million users.",
  "What is your experience with CI/CD pipelines? Describe your most recent setup.",
]

function HeroSection() {
  // ── Heading typewriter ────────────────────────────────────────────────────
  const [typedText, setTypedText] = useState("")
  const [showCursor, setShowCursor] = useState(true)
  const animatedPart = "AI Interviewer"

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      while (!cancelled) {
        // type "AI Interviewer"
        for (let i = 0; i <= animatedPart.length; i++) {
          if (cancelled) return
          setTypedText(animatedPart.slice(0, i))
          await new Promise(r => setTimeout(r, 80))
        }
        // pause 3 seconds
        await new Promise(r => setTimeout(r, 3000))
        // erase
        for (let i = animatedPart.length; i >= 0; i--) {
          if (cancelled) return
          setTypedText(animatedPart.slice(0, i))
          await new Promise(r => setTimeout(r, 40))
        }
        await new Promise(r => setTimeout(r, 400))
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setShowCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  // ── AI card typewriter (only the question text animates) ──────────────────
  const [alexText, setAlexText]     = useState("")
  const [alexCursor, setAlexCursor] = useState(true)
  const [isTyping, setIsTyping]     = useState(true)   // true = dots shown, false = text shown
  const [qIndex, setQIndex]         = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      while (!cancelled) {
        const question = ALEX_QUESTIONS[qIndex % ALEX_QUESTIONS.length]

        // Show typing dots for 1 second before text appears
        setIsTyping(true)
        setAlexText("")
        await new Promise(r => setTimeout(r, 1000))
        if (cancelled) return

        // Type the question character by character
        setIsTyping(false)
        for (let i = 0; i <= question.length; i++) {
          if (cancelled) return
          setAlexText(question.slice(0, i))
          await new Promise(r => setTimeout(r, 28))
        }

        // Pause 3 seconds fully typed
        await new Promise(r => setTimeout(r, 3000))
        if (cancelled) return

        // Erase
        for (let i = question.length; i >= 0; i--) {
          if (cancelled) return
          setAlexText(question.slice(0, i))
          await new Promise(r => setTimeout(r, 15))
        }

        await new Promise(r => setTimeout(r, 300))
        setQIndex(q => q + 1)
      }
    }
    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex])

  useEffect(() => {
    const t = setInterval(() => setAlexCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative min-h-screen bg-interview-hero dark:bg-interview-deep flex items-center overflow-hidden pt-16">
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Extra decorative circles */}
      <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-[#4FA3FF]/60 animate-pulse" />
      <div className="absolute top-2/3 left-1/3 w-3 h-3 rounded-full bg-[#87CEEB]/50 animate-pulse delay-700" />
      <div className="absolute top-1/4 left-1/2 w-1.5 h-1.5 rounded-full bg-[#4FA3FF]/80 animate-pulse delay-300" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left: text */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-[#1a6fd4] dark:text-[#87CEEB] text-sm font-semibold">
            <Zap className="w-4 h-4" />
            AI-Powered Interview Practice
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-slate-800 dark:text-white">
            Meet Your
            <br />
            <span className="text-gradient">
              {typedText}
              <span
                className={`inline-block w-0.5 h-10 lg:h-14 bg-[#4FA3FF] ml-1 align-middle ${showCursor ? "opacity-100" : "opacity-0"} transition-opacity`}
              />
            </span>
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
            Practice realistic interviews with an AI that analyzes your resume, adapts questions in real time,
            evaluates your responses, and helps you become interview-ready.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login?tab=signup"
              className="ripple inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] shadow-xl shadow-blue-300/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-400/50 transition-all duration-300"
            >
              Start Interview Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="ripple inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-[#1a6fd4] dark:text-[#87CEEB] font-bold glass hover:-translate-y-1 transition-all duration-300">
              <Play className="w-5 h-5 fill-current" />
              Watch Demo
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            {[
              { icon: Users, label: "50k+ Users" },
              { icon: Star, label: "4.9/5 Rating" },
              { icon: Award, label: "95% Success Rate" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <Icon className="w-4 h-4 text-[#4FA3FF]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI avatar card */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            {/* Main card */}
            <div className="glass-card rounded-3xl p-6 space-y-5">
              {/* AI avatar */}
              <div className="flex items-center gap-4">
                <div className="avatar-ring w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center shadow-lg flex-shrink-0">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Alex — AI Interviewer</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-500 font-medium">Live Interview Session</span>
                  </div>
                </div>
              </div>

              {/* AI question bubble — only this text types, nothing else */}
              <div className="bg-gradient-to-r from-[#4FA3FF]/10 to-[#87CEEB]/10 rounded-2xl p-4 border border-[#4FA3FF]/20 min-h-[90px]">
                {isTyping ? (
                  /* Typing dots shown while Alex is "thinking" */
                  <div className="flex gap-1.5 mt-1">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                ) : (
                  /* Question types out character by character */
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    "{alexText}
                    <span
                      className="inline-block w-px h-3.5 bg-[#4FA3FF] ml-px align-middle"
                      style={{ opacity: alexCursor ? 1 : 0, transition: "opacity 0.1s" }}
                    />
                    "
                  </p>
                )}
              </div>

              {/* Score preview */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Technical", value: 87, color: "from-[#4FA3FF] to-[#1a6fd4]" },
                  { label: "Communication", value: 92, color: "from-[#87CEEB] to-[#4FA3FF]" },
                  { label: "Confidence", value: 78, color: "from-[#1a6fd4] to-[#87CEEB]" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-white/50 dark:bg-white/5">
                    <div className={`text-xl font-extrabold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>Interview Progress</span>
                  <span>3 / 8 questions</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="progress-fill h-full rounded-full" style={{ width: "37.5%" }} />
                </div>
              </div>
            </div>

            {/* Floating badge — top right */}
            <div className="absolute -top-4 -right-4 glass rounded-2xl px-3 py-2 shadow-lg">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-white">+23% this week</span>
              </div>
            </div>

            {/* Floating badge — bottom left */}
            <div className="absolute -bottom-4 -left-4 glass rounded-2xl px-3 py-2 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#4FA3FF]" />
                <span className="text-xs font-bold text-slate-700 dark:text-white">Integrity: 98%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Stats Section ─────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: "50K+", label: "Interviews Conducted", icon: Users },
    { value: "95%", label: "Success Rate", icon: Award },
    { value: "200+", label: "Companies Covered", icon: Globe },
    { value: "4.9★", label: "Average Rating", icon: Star },
  ]
  return (
    <section id="stats" className="py-16 bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-center text-white">
              <Icon className="w-7 h-7 mx-auto mb-3 opacity-80" />
              <div className="text-4xl font-extrabold">{value}</div>
              <div className="text-blue-100 mt-1 text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features Section ──────────────────────────────────────────────────────────
const FEATURES = [
  { icon: FileText, title: "AI Resume Analysis", desc: "Upload your resume and get instant skill extraction, scoring, and gap analysis against your target role.", color: "from-blue-400 to-blue-600" },
  { icon: Brain, title: "Adaptive Question Engine", desc: "Questions dynamically adjust based on your answers — harder when you excel, supportive when you struggle.", color: "from-indigo-400 to-blue-500" },
  { icon: Mic, title: "Live Voice Interview", desc: "Speak naturally. AI listens, transcribes in real time, and responds just like a human recruiter.", color: "from-sky-400 to-blue-500" },
  { icon: Code2, title: "Coding Interview", desc: "Integrated code editor with syntax highlighting, test cases, time/space complexity analysis, and AI code review.", color: "from-blue-500 to-cyan-500" },
  { icon: Camera, title: "Integrity Monitoring", desc: "Camera-based proctoring detects multi-person frames, tab switches, and suspicious behavior automatically.", color: "from-blue-400 to-indigo-600" },
  { icon: Shield, title: "Anti-Cheating System", desc: "Browser integrity checks log copy/paste attempts, window focus loss, and network interruptions.", color: "from-slate-500 to-blue-600" },
  { icon: MessageSquare, title: "Communication Analysis", desc: "Scores your confidence, fluency, grammar, vocabulary, and professional language in every response.", color: "from-blue-300 to-blue-500" },
  { icon: BarChart3, title: "Detailed Reports", desc: "Full PDF reports with skill radar charts, question-wise evaluation, and a 30-day improvement plan.", color: "from-indigo-500 to-blue-400" },
  { icon: Users, title: "Recruiter Dashboard", desc: "Invite candidates, compare performance side-by-side, filter by role, and export results as CSV.", color: "from-blue-600 to-sky-500" },
  { icon: TrendingUp, title: "Adaptive Difficulty", desc: "Expert → Hard → Medium → Easy — the AI continuously calibrates to keep you in the learning zone.", color: "from-blue-400 to-blue-700" },
  { icon: BookOpen, title: "Career Recommendations", desc: "Personalized course suggestions, project ideas, and skill-building roadmaps based on your weak areas.", color: "from-sky-500 to-indigo-500" },
  { icon: Download, title: "Interview History", desc: "Access every past interview, replay transcripts, compare your progress over time, and track milestones.", color: "from-blue-500 to-blue-400" },
]

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#4FA3FF] text-sm font-semibold">
            <Zap className="w-4 h-4" />
            Everything You Need
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white">
            Built for{" "}
            <span className="text-gradient">Interview Success</span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            From resume parsing to live voice sessions, coding challenges to recruiter dashboards —
            everything on one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="feature-card group p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-[#4FA3FF]/30 cursor-default"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { step: "01", title: "Upload Your Resume", desc: "Drop your PDF or DOCX. Our AI extracts skills, projects, and experience in seconds.", icon: FileText },
    { step: "02", title: "Choose Your Interview", desc: "Select company, role, difficulty, and interview type — HR, Technical, Coding, or Mixed.", icon: Brain },
    { step: "03", title: "Interview with AI", desc: "Face the AI interviewer in a full-screen session with voice, camera, and adaptive questions.", icon: Mic },
    { step: "04", title: "Get Your Report", desc: "Receive a detailed PDF report with scores, improvement plans, and hiring recommendations.", icon: BarChart3 },
  ]

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#4FA3FF] text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Simple Process
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white">
            Ready in <span className="text-gradient">4 Simple Steps</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line on large screens */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#4FA3FF]/20 via-[#4FA3FF]/60 to-[#4FA3FF]/20" />

          {steps.map(({ step, title, desc, icon: Icon }, idx) => (
            <div key={step} className="relative text-center group">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 border-2 border-[#4FA3FF]/30 group-hover:border-[#4FA3FF] shadow-xl flex items-center justify-center mx-auto transition-all duration-300 group-hover:shadow-blue-200/60 group-hover:scale-105">
                  <Icon className="w-8 h-8 text-[#4FA3FF]" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white text-xs font-extrabold shadow">
                  {idx + 1}
                </div>
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-lg mb-2">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const testimonials = [
    { name: "Riya Sharma", role: "SDE @ Google", text: "InterviewAI helped me crack my Google interview on the first attempt. The adaptive questions and voice simulation felt exactly like the real thing.", avatar: "RS" },
    { name: "Arjun Mehta", role: "Backend Engineer @ Microsoft", text: "The resume-based questions were incredibly targeted. When I said I knew Spring Boot, Alex went 5 levels deep. That preparation was invaluable.", avatar: "AM" },
    { name: "Priya Nair", role: "Data Scientist @ Amazon", text: "The communication analysis showed I was using too many filler words. Two weeks of practice and my confidence score jumped from 62 to 89.", avatar: "PN" },
    { name: "Kiran Reddy", role: "Full Stack @ Flipkart", text: "The coding interview module with AI code review is exceptional. It caught edge cases I would never have noticed on my own.", avatar: "KR" },
    { name: "Sneha Gupta", role: "Product Manager @ Razorpay", text: "Being able to practice system design interviews with a whiteboard and follow-up questions made me genuinely prepared for the panel round.", avatar: "SG" },
    { name: "Dev Patel", role: "DevOps @ Infosys", text: "The 30-day improvement plan it generated was spot-on. Every recommended course and project was exactly what I needed to fill my skill gaps.", avatar: "DP" },
  ]

  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#4FA3FF] text-sm font-semibold">
            <Star className="w-4 h-4" />
            Success Stories
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white">
            Candidates Who <span className="text-gradient">Got Hired</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, text, avatar }) => (
            <div key={name} className="feature-card p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center text-white text-sm font-bold">
                  {avatar}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{name}</p>
                  <p className="text-xs text-[#4FA3FF]">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      desc: "Perfect for getting started",
      features: ["3 interviews per month", "Basic resume analysis", "Text-based questions", "Standard report", "Email support"],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "₹499",
      period: "per month",
      desc: "For serious job seekers",
      features: ["Unlimited interviews", "Full resume analysis + JD matching", "Voice + video interview", "Coding interview module", "Advanced analytics", "PDF report download", "Priority support"],
      cta: "Start Pro Trial",
      highlighted: true,
    },
    {
      name: "Recruiter",
      price: "₹2,999",
      period: "per month",
      desc: "For hiring teams",
      features: ["Everything in Pro", "Unlimited candidate invites", "Recruiter dashboard", "Candidate comparison", "CSV export", "Custom question bank", "Dedicated support"],
      cta: "Contact Sales",
      highlighted: false,
    },
  ]

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#4FA3FF] text-sm font-semibold">
            <Bell className="w-4 h-4" />
            Simple Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white">
            Choose Your <span className="text-gradient">Plan</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map(({ name, price, period, desc, features, cta, highlighted }) => (
            <div
              key={name}
              className={`relative p-8 rounded-3xl transition-all duration-300 hover-lift ${
                highlighted
                  ? "bg-gradient-to-b from-[#4FA3FF] to-[#1a6fd4] text-white shadow-2xl shadow-blue-400/40 scale-105"
                  : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
              }`}
            >
              {highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-amber-400 text-white text-xs font-bold shadow">
                  Most Popular
                </div>
              )}
              <div className={`text-sm font-bold mb-1 ${highlighted ? "text-blue-100" : "text-[#4FA3FF]"}`}>{name}</div>
              <div className={`text-4xl font-extrabold mb-1 ${highlighted ? "text-white" : "text-slate-800 dark:text-white"}`}>{price}</div>
              <div className={`text-sm mb-2 ${highlighted ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>{period}</div>
              <p className={`text-sm mb-6 ${highlighted ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>{desc}</p>
              <ul className="space-y-3 mb-8">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlighted ? "text-blue-100" : "text-[#4FA3FF]"}`} />
                    <span className={highlighted ? "text-blue-50" : "text-slate-600 dark:text-slate-300"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className={`ripple block text-center py-3.5 rounded-2xl font-bold transition-all duration-300 ${
                  highlighted
                    ? "bg-white text-[#1a6fd4] hover:bg-blue-50 shadow-lg"
                    : "bg-gradient-to-r from-[#4FA3FF] to-[#1a6fd4] text-white hover:shadow-lg hover:shadow-blue-300/40 hover:-translate-y-0.5"
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-r from-[#0a1628] via-[#1a3a7c] to-[#0f2a5e] relative overflow-hidden">
      <div className="orb" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(79,163,255,0.15) 0%, transparent 70%)", top: -100, right: -100 }} />
      <div className="orb" style={{ width: 280, height: 280, background: "radial-gradient(circle, rgba(135,206,235,0.1) 0%, transparent 70%)", bottom: -80, left: -80 }} />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
          Ready to Ace Your <br />
          <span className="text-gradient">Next Interview?</span>
        </h2>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">
          Join 50,000+ candidates who have used InterviewAI to land their dream jobs at Google, Microsoft, Amazon, and more.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login?tab=signup"
            className="ripple inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[#1a6fd4] font-extrabold bg-white hover:bg-blue-50 shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            Start Interview Free
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="ripple inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold border-2 border-white/30 hover:bg-white/10 transition-all duration-300"
          >
            Sign In to Dashboard
          </Link>
        </div>
        <p className="text-blue-300 text-sm">No credit card required · Cancel anytime</p>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4FA3FF] to-[#1a6fd4] flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">InterviewAI</span>
            </div>
            <p className="text-sm leading-relaxed">
              AI-powered interview practice platform helping candidates land their dream jobs worldwide.
            </p>
          </div>

          {[
            { title: "Product", links: ["Features", "Pricing", "Demo", "Changelog"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-sm hover:text-[#4FA3FF] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">© 2026 InterviewAI. All rights reserved.</p>
          <p className="text-sm">Built with ❤️ to help you succeed</p>
        </div>
      </div>
    </footer>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  )
}
