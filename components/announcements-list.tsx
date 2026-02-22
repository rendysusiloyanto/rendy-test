"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { AnnouncementResponse } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Megaphone, Paperclip, Loader2, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api
      .listAnnouncements()
      .then(setAnnouncements)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Megaphone className="h-4 w-4 text-primary" />
          Announcements
          <Badge variant="secondary" className="ml-auto font-mono text-xs">
            {announcements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {announcements.map((a) => (
          <div
            key={a.id}
            className="rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary"
          >
            <button
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
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
                  {formatDistanceToNow(new Date(a.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 ${
                  expanded === a.id ? "rotate-90" : ""
                }`}
              />
            </button>
            {expanded === a.id && (
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
                    asChild
                    className="border-border text-foreground"
                  >
                    <a
                      href={api.getAnnouncementAttachmentUrl(a.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Paperclip className="mr-1.5 h-3 w-3" />
                      {a.attachment_filename}
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
