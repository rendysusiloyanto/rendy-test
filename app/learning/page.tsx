"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { LearningResponse } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RestrictedAccessDialog } from "@/components/restricted-access-dialog"
import {
  BookOpen,
  Play,
  Loader2,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

function LearningListContent() {
  const { isBlacklisted } = useAuth()
  const [learnings, setLearnings] = useState<LearningResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [restrictedDialogOpen, setRestrictedDialogOpen] = useState(false)

  useEffect(() => {
    api
      .listLearnings(false)
      .then(setLearnings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (isBlacklisted) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Learning</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tutorial videos to help you prepare for the competency exam
            </p>
          </div>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  Access Restricted
                </p>
                <p className="text-sm text-muted-foreground">
                  Your account is currently restricted from accessing learning materials
                </p>
              </div>
              <button
                onClick={() => setRestrictedDialogOpen(true)}
                className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Request Access
              </button>
            </CardContent>
          </Card>

          <RestrictedAccessDialog
            open={restrictedDialogOpen}
            onOpenChange={setRestrictedDialogOpen}
            featureName="Learning"
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tutorial videos to help you prepare for the competency exam
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : learnings.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  No materials available yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check back later for new learning content
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learnings.map((item) => {
              const isComingSoon = !item.is_published
              const cardContent = (
                <Card className={`border-border bg-card h-full group transition-colors ${isComingSoon ? "opacity-70 cursor-default" : "hover:bg-accent cursor-pointer"}`}>
                  <CardContent className="p-0">
                    {/* Video thumbnail area */}
                    <div className="relative aspect-video bg-secondary rounded-t-lg flex items-center justify-center overflow-hidden">
                      {isComingSoon ? (
                        <>
                          <div className="absolute inset-0 bg-secondary" />
                          <Badge className="relative text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            Coming Soon
                          </Badge>
                        </>
                      ) : item.video_url ? (
                        <>
                          <div className="absolute inset-0 bg-secondary" />
                          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 group-hover:bg-primary/30 transition-colors">
                            <Play className="h-4 w-4 text-primary ml-0.5" />
                          </div>
                        </>
                      ) : (
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 text-balance">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-border text-muted-foreground"
                        >
                          <Calendar className="mr-1 h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                          })}
                        </Badge>
                        {item.video_url && !isComingSoon && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-primary/30 text-primary"
                          >
                            <Play className="mr-1 h-2.5 w-2.5" />
                            Video
                          </Badge>
                        )}
                        {isComingSoon && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-muted-foreground/30 text-muted-foreground"
                          >
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )

              return isComingSoon ? (
                <div key={item.id}>{cardContent}</div>
              ) : (
                <Link key={item.id} href={`/learning/${item.id}`}>
                  {cardContent}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default function LearningPage() {
  return (
    <AuthGuard>
      <LearningListContent />
    </AuthGuard>
  )
}
