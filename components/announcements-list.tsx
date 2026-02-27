"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import type { AnnouncementResponse } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AnnouncementAttachmentViewer } from "@/components/announcement-attachment-viewer"
import { Megaphone, Paperclip, Loader2, ChevronRight, BookOpen } from "lucide-react"
import { safeFormatDistanceToNow } from "@/lib/utils"

/** Titles containing these keywords (case-insensitive) are shown in the "Prediksi Soal UKK" card. */
const FEATURED_KEYWORDS = ["ukk", "prediksi"]

function isFeaturedAnnouncement(a: AnnouncementResponse): boolean {
  const t = a.title.toLowerCase()
  return FEATURED_KEYWORDS.some((k) => t.includes(k))
}

function AnnouncementItem({
  a,
  expanded,
  onToggle,
  onOpenAttachment,
}: {
  a: AnnouncementResponse
  expanded: boolean
  onToggle: () => void
  onOpenAttachment: (id: string, filename: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">
              {a.title}
            </h3>
            {a.has_attachment && (
              <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {safeFormatDistanceToNow(a.created_at, { addSuffix: true })}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {a.content && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {a.content}
            </p>
          )}
          {a.has_attachment && a.attachment_filename && (
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground"
              onClick={() => onOpenAttachment(a.id, a.attachment_filename!)}
            >
              <Paperclip className="mr-1.5 h-3 w-3" />
              View / Download: {a.attachment_filename}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [attachmentViewer, setAttachmentViewer] = useState<{ id: string; filename: string } | null>(null)

  const { featured, rest } = useMemo(() => {
    const featured: AnnouncementResponse[] = []
    const rest: AnnouncementResponse[] = []
    for (const a of announcements) {
      if (isFeaturedAnnouncement(a)) featured.push(a)
      else rest.push(a)
    }
    return { featured, rest }
  }, [announcements])

  useEffect(() => {
    api
      .listAnnouncements()
      .then(setAnnouncements)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openAttachment = (id: string, filename: string) => {
    setAttachmentViewer({ id, filename })
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (announcements.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Megaphone className="h-4 w-4 text-primary" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No announcements yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {featured.length > 0 && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              Prediksi Soal UKK
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {featured.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {featured.map((a) => (
              <AnnouncementItem
                key={a.id}
                a={a}
                expanded={expanded === a.id}
                onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
                onOpenAttachment={openAttachment}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Megaphone className="h-4 w-4 text-primary" />
            Announcements
          <Badge variant="secondary" className="ml-auto font-mono text-xs">
            {rest.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rest.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No other announcements.
          </p>
        ) : (
          rest.map((a) => (
            <AnnouncementItem
              key={a.id}
              a={a}
              expanded={expanded === a.id}
              onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
              onOpenAttachment={openAttachment}
            />
          ))
        )}
      </CardContent>

      {attachmentViewer && (
        <AnnouncementAttachmentViewer
          open={!!attachmentViewer}
          onOpenChange={(open) => !open && setAttachmentViewer(null)}
          announcementId={attachmentViewer.id}
          filename={attachmentViewer.filename}
        />
      )}
    </div>
  )
}
