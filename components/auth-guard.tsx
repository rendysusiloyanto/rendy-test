"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { Loader2, Server } from "lucide-react"

export function AuthGuard({
  children,
  requireAdmin = false,
  allowBlacklisted = false,
}: {
  children: ReactNode
  requireAdmin?: boolean
  allowBlacklisted?: boolean
}) {
  const { user, loading, isAdmin, isBlacklisted } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
    if (!loading && requireAdmin && !isAdmin) {
      router.push("/dashboard")
    }
    if (!loading && user && isBlacklisted && !allowBlacklisted) {
      router.push("/blacklisted")
    }
  }, [loading, user, isAdmin, isBlacklisted, requireAdmin, allowBlacklisted, router])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Server className="h-6 w-6 text-primary" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null
  if (requireAdmin && !isAdmin) return null
  if (isBlacklisted && !allowBlacklisted) return null

  return <>{children}</>
}
