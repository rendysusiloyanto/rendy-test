"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import type { LearningResponse } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Play,
  Loader2,
  Calendar,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

function LearningListContent() {
  const [learnings, setLearnings] = useState<LearningResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listLearnings(true)
      .then(setLearnings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
            {learnings.map((item) => (
              <Link key={item.id} href={`/learning/${item.id}`}>
                <Card className="border-border bg-card hover:bg-accent transition-colors cursor-pointer h-full group">
                  <CardContent className="p-0">
                    {/* Video thumbnail area */}
                    <div className="relative aspect-video bg-secondary rounded-t-lg flex items-center justify-center overflow-hidden">
                      {item.video_url ? (
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
                        {item.video_url && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-primary/30 text-primary"
                          >
                            <Play className="mr-1 h-2.5 w-2.5" />
                            Video
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
