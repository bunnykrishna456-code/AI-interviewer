import { NextRequest, NextResponse } from "next/server"
import { generateReport } from "@/lib/gemini"
import type { ResumeData, ChatMessage } from "@/lib/firebase"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/interview/report
 * Client sends messages + resume directly — no server-side Firestore read.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      sessionId, uid, role, messages, resume,
    }: {
      sessionId: string
      uid:       string
      role:      string
      messages:  ChatMessage[]
      resume:    ResumeData | null
    } = await req.json()

    if (!sessionId || !uid || !role) {
      return NextResponse.json({ error: "sessionId, uid, and role are required." }, { status: 400 })
    }

    const safeResume: ResumeData = resume ?? {
      uid, rawText: "", name: "Candidate",
      skills: [], languages: [], frameworks: [],
      experience: [], projects: [], education: [],
      achievements: [], score: 50, summary: "",
    }

    const report = await generateReport(safeResume, role, messages ?? [])
    return NextResponse.json({ report })

  } catch (err: any) {
    console.error("[interview/report]", err?.message ?? err)
    if (err?.message?.includes("Groq AI is not configured")) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add GROQ_API_KEY to .env.local." },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: err.message ?? "Failed to generate report." },
      { status: 500 }
    )
  }
}
