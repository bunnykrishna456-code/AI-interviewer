import { NextRequest, NextResponse } from "next/server"
import { analyseResume } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/analyze-resume
 *
 * Runs Groq AI analysis server-side (keeps API key private).
 * Does NOT write to Firestore here — the client saves the result
 * using its own authenticated Firebase session, avoiding the
 * "Missing or insufficient permissions" error that occurs when
 * a server-side client SDK call has no auth token.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, uid } = await req.json()

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text too short or missing. Please upload a text-based PDF or plain text file." },
        { status: 400 }
      )
    }
    if (!uid) {
      return NextResponse.json({ error: "User ID required." }, { status: 400 })
    }

    // Run AI analysis (server-side — Groq key never exposed to browser)
    const data = await analyseResume(text, uid)

    // Return data to client — client saves to Firestore with its own auth token
    return NextResponse.json({ success: true, resume: data })

  } catch (err: any) {
    console.error("[analyze-resume]", err?.message ?? err)

    if (err?.message?.includes("Groq AI is not configured") || err?.message?.includes("Gemini AI is not configured")) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add GROQ_API_KEY to .env.local and restart the server." },
        { status: 503 }
      )
    }
    if (err?.message?.includes("API_KEY_INVALID") || err?.message?.includes("401") || err?.message?.includes("invalid_api_key")) {
      return NextResponse.json(
        { error: "AI API key is invalid. Please check your GROQ_API_KEY in .env.local." },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: err.message ?? "Failed to analyse resume. Please try again." },
      { status: 500 }
    )
  }
}
