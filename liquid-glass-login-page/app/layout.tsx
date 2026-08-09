import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "InterviewAI — Your AI Interviewer",
  description:
    "Practice realistic interviews with an AI that analyzes your resume, adapts questions in real time, evaluates your responses, and helps you become interview-ready.",
  keywords: ["AI interview", "mock interview", "interview practice", "resume analysis", "coding interview"],
  authors: [{ name: "InterviewAI" }],
  openGraph: {
    title: "InterviewAI — Your AI Interviewer",
    description:
      "Practice realistic interviews with AI. Get personalized questions, live voice interaction, and detailed evaluation reports.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
