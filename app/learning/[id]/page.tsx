"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { LearningResponse } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Loader2, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // youtube.com/watch?v=xxx
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`
    }
    // youtu.be/xxx
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    // already embed
    if (u.pathname.startsWith("/embed/")) {
      return url
    }
  } catch {
    // not a valid URL
  }
  return null
}

function LearningDetailContent({ id }: { id: string }) {
  const [learning, setLearning] = useState<LearningResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    api
      .getLearning(id)
      .then(setLearning)
      .catch(() => router.push("/learning"))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (!learning) return null

  const embedUrl = learning.video_url
    ? getYouTubeEmbedUrl(learning.video_url)
    : null

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/learning")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Learning
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            {learning.title}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className="text-xs font-mono border-border text-muted-foreground"
            >
              <Calendar className="mr-1 h-3 w-3" />
              {formatDistanceToNow(new Date(learning.created_at), {
                addSuffix: true,
              })}
            </Badge>
          </div>
        </div>

        {/* Video player */}
        {embedUrl ? (
          <Card className="border-border bg-card overflow-hidden">
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={learning.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Card>
        ) : learning.video_url ? (
          <Card className="border-border bg-card">
            <CardContent className="py-6">
              <Button asChild variant="outline" className="border-border text-foreground">
                <a
                  href={learning.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Video Link
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Description */}
        {learning.description && (
          <Card className="border-border bg-card">
            <CardContent className="py-5">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {learning.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

export default function LearningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <AuthGuard>
      <LearningDetailContent id={id} />
    </AuthGuard>
  )
}
