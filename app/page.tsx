"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Server } from "lucide-react"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      router.push(user ? "/dashboard" : "/login")
    }
  }, [loading, user, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
        <Server className="h-6 w-6 text-primary" />
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="font-mono text-sm text-muted-foreground">UKK Lab</p>
    </div>
  )
}
