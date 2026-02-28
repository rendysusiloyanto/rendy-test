"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown } from "lucide-react"

interface PremiumGuardProps {
  children: ReactNode
  /** Shown when user is not premium */
  fallback?: ReactNode
}

const defaultFallback = (
  <Card className="border-amber-500/30 bg-amber-500/5">
    <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40">
        <Crown className="h-7 w-7 text-amber-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Premium Feature</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upgrade to Premium to unlock this feature.
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link href="/premium">
          <Crown className="h-4 w-4" />
          Upgrade to Premium
        </Link>
      </Button>
    </CardContent>
  </Card>
)

export function PremiumGuard({ children, fallback = defaultFallback }: PremiumGuardProps) {
  const { isPremium, loading } = useAuth()

  if (loading) return null
  if (!isPremium) return <>{fallback}</>
  return <>{children}</>
}
