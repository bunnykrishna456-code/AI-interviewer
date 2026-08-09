import { NextRequest, NextResponse } from "next/server"
import { generateFirstQuestion, generateNextQuestion } from "@/lib/gemini"
import type { ResumeData, ChatMessage } from "@/lib/firebase"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/interview/question
 *
 * Client sends session data + resume directly — no server-side Firestore read.
 * This avoids the "Missing or insufficient permissions" error that occurs
 * when the server-side client SDK has no Firebase Auth token.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      uid,
      role,
      difficulty,
      messages,
      resume,
      questionNumber,
    }: {
      sessionId:      string
      uid:            string
      role:           string
      difficulty:     string
      messages:       ChatMessage[]
      resume:         ResumeData | null
      questionNumber: number
    } = await req.json()

    if (!sessionId || !uid || !role) {
      return NextResponse.json({ error: "sessionId, uid, and role are required." }, { status: 400 })
    }

    const TOTAL_QUESTIONS = 8

    if (questionNumber > TOTAL_QUESTIONS) {
      return NextResponse.json({ done: true })
    }

    // Build a minimal resume if none uploaded
    const safeResume: ResumeData = resume ?? {
      uid,
      rawText:      "",
      name:         "Candidate",
      skills:       [],
      languages:    [],
      frameworks:   [],
      experience:   [],
      projects:     [],
      education:    [],
      achievements: [],
      score:        50,
      summary:      "No resume uploaded.",
    }

    let question: string
    if (questionNumber === 1) {
      question = await generateFirstQuestion(safeResume, role, difficulty)
    } else {
      question = await generateNextQuestion(
        safeResume, role, difficulty,
        messages, questionNumber, TOTAL_QUESTIONS
      )
    }

    return NextResponse.json({
      question,
      questionNumber,
      totalQuestions: TOTAL_QUESTIONS,
      done: false,
    })

  } catch (err: any) {
    console.error("[interview/question]", err?.message ?? err)
    if (err?.message?.includes("Groq AI is not configured")) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add GROQ_API_KEY to .env.local." },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: err.message ?? "Failed to generate question." },
      { status: 500 }
    )
  }
}
