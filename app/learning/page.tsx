"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { LearningResponse } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { RestrictedAccessDialog } from "@/components/restricted-access-dialog"
import {
  BookOpen,
  Play,
  Loader2,
  Calendar,
  AlertCircle,
  Crown,
  Sparkles,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

function getLearningThumbnailSrc(item: LearningResponse): string | null {
  if (!item.thumbnail) return null
  return item.thumbnail.startsWith("http") ? item.thumbnail : `${API_URL}${item.thumbnail}`
}

const STATIC_VIDEO = {
  title: "UKK Full",
  thumbnailUrl: `${API_URL}/static/images/ukk-full-v1.png`,
  videoUrl: `${API_URL}/static/videos/ukk-full-v1.mp4`,
}

function LearningListContent() {
  const { isBlacklisted } = useAuth()
  const [learnings, setLearnings] = useState<LearningResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [restrictedDialogOpen, setRestrictedDialogOpen] = useState(false)
  const [staticVideoOpen, setStaticVideoOpen] = useState(false)
  const staticVideoRef = useRef<HTMLVideoElement>(null)

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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Static video card */}
            <Card
              className="border-border bg-card h-full group transition-colors hover:bg-accent cursor-pointer"
              onClick={() => setStaticVideoOpen(true)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-video bg-secondary rounded-t-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={STATIC_VIDEO.thumbnailUrl}
                    alt={STATIC_VIDEO.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 border border-primary/30 group-hover:bg-primary/30 transition-colors">
                    <Play className="h-5 w-5 text-primary ml-0.5" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 text-balance">
                    {STATIC_VIDEO.title}
                  </h3>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-primary/30 text-primary"
                    >
                      <Play className="mr-1 h-2.5 w-2.5" />
                      Video
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {learnings.length === 0 ? null : learnings.map((item) => {
              const isComingSoon = item.coming_soon === true || !item.is_published
              const thumbAndTitle = (
                <>
                  <div className="relative aspect-video bg-secondary rounded-t-lg flex items-center justify-center overflow-hidden">
                    {getLearningThumbnailSrc(item) && (
                      <img
                        src={getLearningThumbnailSrc(item)!}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {isComingSoon ? (
                      <>
                        <div className="absolute inset-0 bg-secondary/80" />
                        <Badge className="relative text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          Coming Soon
                        </Badge>
                      </>
                    ) : (item.video_url || item.video_id) ? (
                      <>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 group-hover:bg-primary/30 transition-colors">
                          <Play className="h-4 w-4 text-primary ml-0.5" />
                        </div>
                      </>
                    ) : !getLearningThumbnailSrc(item) ? (
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    )}
                  </div>
                  <div className="p-4 pb-2">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 text-balance">
                      {item.title}
                    </h3>
                  </div>
                </>
              )
              return (
                <Card
                  key={item.id}
                  className={`border-border bg-card h-full group transition-colors ${isComingSoon ? "opacity-70 cursor-default" : "hover:bg-accent cursor-pointer"}`}
                >
                  <CardContent className="p-0">
                    {isComingSoon ? (
                      thumbAndTitle
                    ) : (
                      <Link href={`/learning/${item.id}`} className="block">
                        {thumbAndTitle}
                      </Link>
                    )}
                    <div className="px-4 pb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-border text-muted-foreground"
                        >
                          <Calendar className="mr-1 h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                          })}
                        </Badge>
                        {(item.video_url || item.video_id) && !isComingSoon && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-primary/30 text-primary"
                          >
                            <Play className="mr-1 h-2.5 w-2.5" />
                            Video
                          </Badge>
                        )}
                        {item.is_premium && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-amber-500/50 text-amber-600 dark:text-amber-400"
                          >
                            <Crown className="mr-1 h-2.5 w-2.5" />
                            Premium
                          </Badge>
                        )}
                        {isComingSoon && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-muted-foreground/30 text-muted-foreground"
                          >
                            <Sparkles className="mr-1 h-2.5 w-2.5" />
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      {item.is_premium && !isComingSoon && (
                        <Link
                          href="/premium"
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Go premium now
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Static video popup - native controls include fullscreen */}
        <Dialog
          open={staticVideoOpen}
          onOpenChange={(open) => {
            setStaticVideoOpen(open)
            if (!open) staticVideoRef.current?.pause()
          }}
        >
          <DialogContent className="w-full max-w-4xl p-0 gap-0 overflow-hidden">
            <DialogTitle className="sr-only">{STATIC_VIDEO.title}</DialogTitle>
            <div className="aspect-video w-full bg-black">
              <video
                ref={staticVideoRef}
                src={STATIC_VIDEO.videoUrl}
                controls
                className="w-full h-full"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </DialogContent>
        </Dialog>
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
