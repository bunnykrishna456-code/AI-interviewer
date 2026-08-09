import { NextRequest, NextResponse } from "next/server"
import { evaluateAnswer } from "@/lib/gemini"
import type { ResumeData } from "@/lib/firebase"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/interview/evaluate
 * Client sends resume + role directly — no server-side Firestore read.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      sessionId, uid, question, answer, role, resume,
    }: {
      sessionId: string
      uid:       string
      question:  string
      answer:    string
      role:      string
      resume:    ResumeData | null
    } = await req.json()

    if (!sessionId || !uid || !question || !answer || !role) {
      return NextResponse.json(
        { error: "sessionId, uid, question, answer, and role are required." },
        { status: 400 }
      )
    }

    if (answer.trim().length < 3) {
      return NextResponse.json({
        score: 0, isCorrect: false,
        feedback: "No answer provided.",
        shortReply: "It seems you didn't answer. Let's move on.",
      })
    }

    const safeResume: ResumeData = resume ?? {
      uid, rawText: "", name: "Candidate",
      skills: [], languages: [], frameworks: [],
      experience: [], projects: [], education: [],
      achievements: [], score: 50, summary: "",
    }

    const evaluation = await evaluateAnswer(question, answer, safeResume, role)
    return NextResponse.json(evaluation)

  } catch (err: any) {
    console.error("[interview/evaluate]", err?.message ?? err)
    if (err?.message?.includes("Groq AI is not configured")) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add GROQ_API_KEY to .env.local." },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: err.message ?? "Failed to evaluate answer." },
      { status: 500 }
    )
  }
}
