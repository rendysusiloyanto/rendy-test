"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AiAnalyzeModal } from "@/components/ai-analyze-modal"
import { api } from "@/lib/api"
import type { ExamResultResponse } from "@/lib/types"
import { ArrowLeft, Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react"

function ExamResultContent({ id }: { id: string }) {
  const router = useRouter()
  const [result, setResult] = useState<ExamResultResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzeModalOpen, setAnalyzeModalOpen] = useState(false)

  useEffect(() => {
    api
      .getExamResultOptional(id)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (!result) {
    return (
      <AppShell>
        <div className="max-w-xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Card className="border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              Result not found or you don&apos;t have access.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              {result.passed ? (
                <Badge className="gap-1 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Passed
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Not passed
                </Badge>
              )}
              {result.score != null && result.max_score != null && (
                <Badge variant="outline" className="font-mono">
                  {result.score} / {result.max_score}
                </Badge>
              )}
            </div>
            {result.details && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                {result.details}
              </p>
            )}
            {!result.passed && (
              <Button
                onClick={() => setAnalyzeModalOpen(true)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Analyze with AI
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <AiAnalyzeModal
        open={analyzeModalOpen}
        onOpenChange={setAnalyzeModalOpen}
        examResultId={id}
      />
    </AppShell>
  )
}

export default function ExamResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <AuthGuard>
      <ExamResultContent id={id} />
    </AuthGuard>
  )
}
