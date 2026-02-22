"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FlaskConical,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trophy,
  RotateCcw,
} from "lucide-react"
import type { TestResult, TestStep } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

type TestState = "idle" | "running" | "done" | "error"

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "border-success/40 bg-success/10 text-success",
    B: "border-chart-2/40 bg-chart-2/10 text-chart-2",
    C: "border-warning/40 bg-warning/10 text-warning",
    D: "border-destructive/40 bg-destructive/10 text-destructive",
    F: "border-destructive/40 bg-destructive/10 text-destructive",
  }
  return (
    <Badge
      variant="outline"
      className={`text-lg font-mono font-bold px-3 py-1 ${colors[grade] || "border-muted-foreground/40 bg-muted text-muted-foreground"}`}
    >
      {grade}
    </Badge>
  )
}

function StepStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case "fail":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "checking":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function TestContent() {
  const [state, setState] = useState<TestState>("idle")
  const [steps, setSteps] = useState<TestStep[]>([])
  const [finalResult, setFinalResult] = useState<TestResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const stepsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [steps])

  const startTest = useCallback(() => {
    // Reset state
    setState("running")
    setSteps([])
    setFinalResult(null)
    setErrorMsg(null)

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const wsBase = API_URL.replace(/^http/, "ws")
    const ws = new WebSocket(`${wsBase}/api/ukk/test/ws`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data: TestResult = JSON.parse(event.data)

        if (data.type === "progress" && data.step && data.label && data.status) {
          setSteps((prev) => {
            const existing = prev.findIndex((s) => s.step === data.step)
            const updated: TestStep = {
              step: data.step!,
              label: data.label!,
              status: data.status as TestStep["status"],
              detail: data.detail ?? null,
            }
            if (existing >= 0) {
              const next = [...prev]
              next[existing] = updated
              return next
            }
            return [...prev, updated]
          })
        } else if (data.type === "result") {
          setFinalResult(data)
          setState("done")
          // Also update steps from results array if provided
          if (data.results && data.results.length > 0) {
            setSteps(data.results)
          }
        } else if (data.type === "error") {
          setErrorMsg(data.message || "An unknown error occurred")
          setState("error")
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      if (state === "running") {
        // Unexpected close
        setState((prev) => {
          if (prev === "running") return "error"
          return prev
        })
        setErrorMsg((prev) => prev || "Connection closed unexpectedly")
      }
    }

    ws.onerror = () => {
      setState("error")
      setErrorMsg("Failed to connect to the test server")
      ws.close()
    }
  }, [state])

  const handleReset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState("idle")
    setSteps([])
    setFinalResult(null)
    setErrorMsg(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  const passCount = steps.filter((s) => s.status === "pass").length
  const failCount = steps.filter((s) => s.status === "fail").length

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            UKK Test Service
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test your Proxmox, Ubuntu, WordPress, and DNS configuration
          </p>
        </div>

        {/* Start / Status card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <FlaskConical className="h-4 w-4 text-primary" />
              Competency Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state === "idle" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <FlaskConical className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Ready to test your configuration?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    This will check your VM setup including Proxmox
                    virtualization, Ubuntu server, WordPress installation, and
                    DNS configuration.
                  </p>
                </div>
                <Button
                  onClick={startTest}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Test
                </Button>
              </div>
            )}

            {state === "running" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Test in progress...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Checking your configuration. Please wait.
                    </p>
                  </div>
                </div>

                {/* Progress summary */}
                {steps.length > 0 && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      {passCount} passed
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-destructive" />
                      {failCount} failed
                    </span>
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {steps.filter((s) => s.status === "checking").length}{" "}
                      checking
                    </span>
                  </div>
                )}

                {/* Steps list */}
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {steps.map((step) => (
                    <div
                      key={step.step}
                      className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
                        step.status === "checking"
                          ? "bg-primary/5"
                          : step.status === "pass"
                            ? "bg-success/5"
                            : step.status === "fail"
                              ? "bg-destructive/5"
                              : "bg-secondary"
                      }`}
                    >
                      <div className="mt-0.5">
                        <StepStatusIcon status={step.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {step.label}
                        </p>
                        {step.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                            {step.detail}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono shrink-0 ${
                          step.status === "pass"
                            ? "border-success/30 text-success"
                            : step.status === "fail"
                              ? "border-destructive/30 text-destructive"
                              : step.status === "checking"
                                ? "border-primary/30 text-primary"
                                : "border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {step.status}
                      </Badge>
                    </div>
                  ))}
                  <div ref={stepsEndRef} />
                </div>
              </div>
            )}

            {state === "done" && finalResult && (
              <div className="space-y-5">
                {/* Score card */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <Trophy className="h-8 w-8 text-warning" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Your Score</p>
                    <p className="text-3xl font-bold font-mono text-foreground mt-1">
                      {finalResult.total_score}{" "}
                      <span className="text-lg text-muted-foreground">
                        / {finalResult.max_score}
                      </span>
                    </p>
                    {finalResult.percentage != null && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {finalResult.percentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  {finalResult.grade && (
                    <GradeBadge grade={finalResult.grade} />
                  )}
                </div>

                {/* Summary bar */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {passCount} passed
                  </span>
                  <span className="flex items-center gap-1.5 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {failCount} failed
                  </span>
                </div>

                {/* Results list */}
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {steps.map((step) => (
                    <div
                      key={step.step}
                      className={`flex items-start gap-3 rounded-lg p-2.5 ${
                        step.status === "pass"
                          ? "bg-success/5"
                          : step.status === "fail"
                            ? "bg-destructive/5"
                            : "bg-secondary"
                      }`}
                    >
                      <div className="mt-0.5">
                        <StepStatusIcon status={step.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {step.label}
                        </p>
                        {step.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                            {step.detail}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono shrink-0 ${
                          step.status === "pass"
                            ? "border-success/30 text-success"
                            : "border-destructive/30 text-destructive"
                        }`}
                      >
                        {step.status}
                      </Badge>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-accent"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Run Test Again
                </Button>
              </div>
            )}

            {state === "error" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Test Failed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {errorMsg || "An unexpected error occurred."}
                  </p>
                </div>

                {/* Show steps collected so far */}
                {steps.length > 0 && (
                  <div className="w-full space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {steps.map((step) => (
                      <div
                        key={step.step}
                        className={`flex items-start gap-3 rounded-lg p-2.5 ${
                          step.status === "pass"
                            ? "bg-success/5"
                            : step.status === "fail"
                              ? "bg-destructive/5"
                              : "bg-secondary"
                        }`}
                      >
                        <div className="mt-0.5">
                          <StepStatusIcon status={step.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {step.label}
                          </p>
                          {step.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-border text-foreground hover:bg-accent"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

export default function TestPage() {
  return (
    <AuthGuard>
      <TestContent />
    </AuthGuard>
  )
}
