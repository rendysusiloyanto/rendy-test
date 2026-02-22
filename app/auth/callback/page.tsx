"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Server } from "lucide-react"
import { Suspense } from "react"

function CallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { login } = useAuth()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const token = searchParams.get("token") || searchParams.get("access_token")
    const error = searchParams.get("error")

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`)
      return
    }

    if (token) {
      login(token).then(() => {
        router.push("/dashboard")
      })
    } else {
      router.push("/login")
    }
  }, [searchParams, login, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
        <Server className="h-6 w-6 text-primary" />
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Authenticating...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
