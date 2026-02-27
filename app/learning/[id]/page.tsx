"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { LearningResponse } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RestrictedAccessDialog } from "@/components/restricted-access-dialog"
import Link from "next/link"
import { ArrowLeft, Calendar, Loader2, ExternalLink, AlertCircle, Crown, Sparkles } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

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
  const { isBlacklisted, isPremium } = useAuth()
  const [learning, setLearning] = useState<LearningResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [restrictedDialogOpen, setRestrictedDialogOpen] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [hlsStreamUrl, setHlsStreamUrl] = useState<string | null>(null)
  const [streamLoading, setStreamLoading] = useState(false)
  const streamBlobUrlRef = useRef<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<import("hls.js").default | null>(null)
  const router = useRouter()

  if (isBlacklisted) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/learning")}
              className="hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  Access Restricted
                </p>
                <p className="text-sm text-muted-foreground">
                  Your account is currently restricted from accessing this learning material
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

  useEffect(() => {
    api
      .getLearning(id)
      .then(setLearning)
      .catch(() => router.push("/learning"))
      .finally(() => setLoading(false))
  }, [id, router])

  // Fetch stream URL; prefer HLS/DASH for chunked streaming, else fallback to raw blob
  useEffect(() => {
    if (!learning?.video_stream_url) {
      if (streamBlobUrlRef.current) {
        URL.revokeObjectURL(streamBlobUrlRef.current)
        streamBlobUrlRef.current = null
      }
      setStreamUrl(null)
      setHlsStreamUrl(null)
      setStreamLoading(false)
      return
    }
    let cancelled = false
    setStreamLoading(true)
    setHlsStreamUrl(null)
    api
      .getLearningVideoStreamUrl(id)
      .then(async (res) => {
        if (cancelled) return
        const fullHls = res.hls_url ? (res.hls_url.startsWith("http") ? res.hls_url : `${API_BASE}${res.hls_url}`) : null
        if (fullHls) {
          setStreamUrl(null)
          setHlsStreamUrl(fullHls)
        } else if (res.auth_required) {
          const blob = await api.fetchStreamBlob(res.url)
          if (cancelled) return
          if (streamBlobUrlRef.current) URL.revokeObjectURL(streamBlobUrlRef.current)
          const blobUrl = URL.createObjectURL(blob)
          streamBlobUrlRef.current = blobUrl
          setStreamUrl(blobUrl)
          setHlsStreamUrl(null)
        } else {
          const fullUrl = res.url.startsWith("http") ? res.url : `${API_BASE}${res.url}`
          setStreamUrl(fullUrl)
          setHlsStreamUrl(null)
        }
      })
      .catch(() => {
        if (!cancelled) setStreamUrl(null)
        if (!cancelled) setHlsStreamUrl(null)
      })
      .finally(() => {
        if (!cancelled) setStreamLoading(false)
      })
    return () => {
      cancelled = true
      if (streamBlobUrlRef.current) {
        URL.revokeObjectURL(streamBlobUrlRef.current)
        streamBlobUrlRef.current = null
      }
    }
  }, [id, learning?.video_stream_url])

  // Attach HLS.js to video when hlsStreamUrl is set (sends Bearer token on playlist/segment requests)
  useEffect(() => {
    if (!hlsStreamUrl || !videoRef.current) return
    const video = videoRef.current
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    import("hls.js")
      .then((mod) => {
        const Hls = mod.default
        if (!Hls.isSupported()) return
        const hls = new Hls({
          xhrSetup(xhr) {
            if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
          },
        })
        hlsRef.current = hls
        hls.loadSource(hlsStreamUrl)
        hls.attachMedia(video)
      })
      .catch(() => {})
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [hlsStreamUrl])

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
  const hasUploadedVideo = !!learning.video_stream_url
  const isComingSoon = learning.coming_soon === true || !learning.is_published

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
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className="text-xs font-mono border-border text-muted-foreground"
            >
              <Calendar className="mr-1 h-3 w-3" />
              {formatDistanceToNow(new Date(learning.created_at), {
                addSuffix: true,
              })}
            </Badge>
            {learning.is_premium && (
              <Badge
                variant="outline"
                className="text-xs font-mono border-amber-500/50 text-amber-600 dark:text-amber-400"
              >
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
            {isComingSoon && (
              <Badge
                variant="outline"
                className="text-xs font-mono border-muted-foreground/30 text-muted-foreground"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Coming Soon
              </Badge>
            )}
          </div>
          {learning.is_premium && !isComingSoon && !isPremium && (
            <Button variant="outline" size="sm" className="mt-3 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" asChild>
              <Link href="/premium">
                <Crown className="mr-2 h-3.5 w-3.5" />
                Go premium now
              </Link>
            </Button>
          )}
        </div>

        {/* Video player: uploaded stream (premium) or external (YouTube / link) */}
        {hasUploadedVideo ? (
          <Card className="border-border bg-card overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center">
              {streamLoading ? (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              ) : streamUrl || hlsStreamUrl ? (
                <video
                  ref={videoRef}
                  src={streamUrl ?? undefined}
                  controls
                  className="w-full h-full"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load video. Check your premium access.</p>
              )}
            </div>
          </Card>
        ) : embedUrl ? (
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

        {/* Long-form content */}
        {learning.content && (
          <Card className="border-border bg-card">
            <CardContent className="py-5">
              <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none">
                {learning.content}
              </div>
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
