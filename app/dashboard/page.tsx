"use client"

import { useAuth } from "@/lib/auth-context"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { VpnCard } from "@/components/vpn-card"
import { AnnouncementsList } from "@/components/announcements-list"
import { AccessRequestCard } from "@/components/access-request-card"
import { PremiumRequestCard } from "@/components/premium-request-card"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  BookOpen,
  Trophy,
  ArrowRight,
  User,
  GraduationCap,
  Hash,
  FlaskConical,
  Crown,
} from "lucide-react"

function DashboardContent() {
  const { user } = useAuth()

  return (
    <AppShell>
      <div className="space-y-6">
        <AccessRequestCard />
        <PremiumRequestCard />
        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.full_name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your competency exam preparation
          </p>
        </div>

        {/* User info bar */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Role:</span>
            <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
              {user?.role}
            </Badge>
            {user?.is_premium && (
              <Badge variant="secondary" className="text-xs gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
                <Crown className="h-3 w-3" />
                PREMIUM
              </Badge>
            )}
          </div>
          {user?.class_name && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Class:</span>
              <span className="text-xs font-medium text-foreground">
                {user.class_name}
              </span>
            </div>
          )}
          {user?.attendance_number && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">No:</span>
              <span className="text-xs font-medium text-foreground">
                {user.attendance_number}
              </span>
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            <VpnCard />

            {/* Quick links */}
            <div className="grid gap-3 grid-cols-3">
              <Link href="/learning">
                <Card className="border-border bg-card hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Learning
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/test">
                <Card className="border-border bg-card hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                    <FlaskConical className="h-6 w-6 text-chart-2" />
                    <span className="text-sm font-medium text-foreground">
                      Test
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/leaderboard">
                <Card className="border-border bg-card hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                    <Trophy className="h-6 w-6 text-warning" />
                    <span className="text-sm font-medium text-foreground">
                      Leaderboard
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div>
            <AnnouncementsList />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
