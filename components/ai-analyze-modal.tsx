"use client"

import { useAiAnalyze } from "@/hooks/use-ai-analyze"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, AlertCircle } from "lucide-react"
import { ApiError } from "@/lib/api"

interface AiAnalyzeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  examResultId: string
}

export function AiAnalyzeModal({ open, onOpenChange, examResultId }: AiAnalyzeModalProps) {
  const analyze = useAiAnalyze()
  const data = analyze.data
  const error = analyze.error instanceof ApiError ? analyze.error : null
  const limitExceeded = error?.status === 429
  const remaining = error?.body && typeof error.body === "object" && "remaining_today" in error.body
    ? (error.body as { remaining_today?: number }).remaining_today
    : null

  const handleAnalyze = () => {
    analyze.mutate(examResultId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Analyze with AI
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          {analyze.isPending && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your result...</p>
            </div>
          )}

          {limitExceeded && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Daily limit reached</p>
                {remaining != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Remaining analyses today: {remaining}
                  </p>
                )}
              </div>
            </div>
          )}

          {data && !analyze.isPending && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {data.from_cache && (
                  <Badge variant="secondary" className="text-xs">
                    Cached Result
                  </Badge>
                )}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {data.explanation}
              </div>
            </div>
          )}

          {error && !limitExceeded && !analyze.isPending && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!data && (
            <Button
              onClick={handleAnalyze}
              disabled={analyze.isPending}
              className="gap-2"
            >
              {analyze.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
