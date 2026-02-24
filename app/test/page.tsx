"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RestrictedAccessDialog } from "@/components/restricted-access-dialog"
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
  Plus,
  X,
  AlertCircle,
  Server,
  Globe,
  Database,
  Wifi,
  Code2,
  LayoutTemplate,
  ChevronDown,
  ChevronRight,
  History,
  Trash2,
} from "lucide-react"
import type { TestResult, TestStep } from "@/lib/types"

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  proxmox: { label: "Proxmox VM", icon: <Server className="h-3.5 w-3.5" /> },
  ubuntu: { label: "Ubuntu VM", icon: <Server className="h-3.5 w-3.5" /> },
  php: { label: "PHP", icon: <Code2 className="h-3.5 w-3.5" /> },
  web_server: { label: "Web Server", icon: <Globe className="h-3.5 w-3.5" /> },
  mysql: { label: "MySQL", icon: <Database className="h-3.5 w-3.5" /> },
  wordpress: { label: "WordPress", icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
  dns: { label: "DNS", icon: <Wifi className="h-3.5 w-3.5" /> },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
const HISTORY_KEY = "ukk_test_input_history"
const MAX_HISTORY = 5

type TestState = "idle" | "connecting" | "running" | "done" | "error"

interface RichStep extends TestStep {
  category?: string
  score?: number
  max_score?: number
}

interface TestConfig {
  vm_proxmox: {
    inputs: {
      name: string
      host: string
      user: string
      password: string
    }
    expected: {
      resources: {
        cores: number
        memory: number
        disk_size: string
      }
      vm_status: string
      vm_access: boolean
    }
  }
  vm_ubuntu: {
    inputs: {
      name: string
      host: string
      user: string
      password: string
    }
    expected: {
      resources: {
        cores: number
        memory: number
        disk_size: string
      }
      vm_status: string
      vm_access: boolean
    }
  }
  php: {
    expected: {
      binary: boolean
      modules: Record<string, boolean>
    }
  }
  web_server: {
    expected: {
      nginx_binary: boolean
      nginx_service: boolean
      nginx_config_syntax: boolean
    }
  }
  mysql: {
    inputs: {
      db_name: string
      db_user: string
      db_password: string
    }
    expected: {
      binary: boolean
      service: boolean
      database_exists: boolean
      user_exists: boolean
      db_connection: boolean
    }
  }
  wordpress: {
    inputs: {
      url: string
      username: string
      password: string
    }
    expected: {
      status_code: number
      login_success: boolean
    }
  }
  dns: {
    inputs: {
      domain: string
      ip: string
    }
    expected: {
      domain: string
      ip: string
    }
  }
}

type HistoryEntry = {
  label: string
  savedAt: number
  config: TestConfig
  phpModules: string[]
}

const DEFAULT_CONFIG: TestConfig = {
  vm_proxmox: {
    inputs: { name: "", host: "", user: "root", password: "" },
    expected: {
      resources: { cores: 6, memory: 8192, disk_size: "32G" },
      vm_status: "running",
      vm_access: true,
    },
  },
  vm_ubuntu: {
    inputs: { name: "", host: "", user: "", password: "" },
    expected: {
      resources: { cores: 6, memory: 6144, disk_size: "32G" },
      vm_status: "running",
      vm_access: true,
    },
  },
  php: {
    expected: {
      binary: true,
      modules: {
        mysqli: true,
        curl: true,
        gd: true,
        mbstring: true,
        xml: true,
        json: true,
        zip: true,
        openssl: true,
      },
    },
  },
  web_server: {
    expected: {
      nginx_binary: true,
      nginx_service: true,
      nginx_config_syntax: true,
    },
  },
  mysql: {
    inputs: { db_name: "wordpress", db_user: "", db_password: "" },
    expected: {
      binary: true,
      service: true,
      database_exists: true,
      user_exists: true,
      db_connection: true,
    },
  },
  wordpress: {
    inputs: { url: "", username: "admin", password: "" },
    expected: { status_code: 200, login_success: true },
  },
  dns: {
    inputs: { domain: "", ip: "" },
    expected: { domain: "", ip: "" },
  },
}

// Disk size validation: must be a number followed by exactly one G or M (case-insensitive), e.g. 32G, 512M
function validateDiskSize(value: string): string | null {
  if (!value) return null
  if (!/^\d+[GM]$/i.test(value)) {
    return "Must be a number followed by G or M (e.g. 32G, 512M)"
  }
  return null
}

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
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case "fail":
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "checking":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function StepRow({ step, forceExpand }: { step: RichStep; forceExpand?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isPass = step.status === "pass" || step.status === "success"
  const isFail = step.status === "fail" || step.status === "failed"
  const hasDetail = Boolean(step.detail)

  const isExpanded = forceExpand || expanded

  return (
    <div className={`transition-colors ${
      isPass ? "bg-success/[0.03]" : isFail ? "bg-destructive/[0.03]" : "bg-transparent"
    }`}>
      <div
        className={`flex items-start gap-3 px-3 py-2.5 ${hasDetail && !forceExpand ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}`}
        onClick={() => { if (hasDetail && !forceExpand) setExpanded((v) => !v) }}
        role={hasDetail && !forceExpand ? "button" : undefined}
        aria-expanded={hasDetail && !forceExpand ? isExpanded : undefined}
      >
        <div className="mt-0.5 shrink-0">
          <StepStatusIcon status={step.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground leading-snug">{step.label}</p>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{step.step}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {step.max_score != null && step.max_score > 0 && (
            <span className={`text-xs font-mono font-semibold ${isPass ? "text-success" : isFail ? "text-destructive" : "text-muted-foreground"}`}>
              {step.score ?? 0}/{step.max_score}
            </span>
          )}
          {hasDetail && !forceExpand && (
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
      </div>
      {isExpanded && hasDetail && (
        <div className="px-3 pb-2.5 -mt-1">
          <pre className="text-xs text-muted-foreground bg-muted/50 border border-border rounded px-3 py-2 font-mono whitespace-pre-wrap break-words">
            {step.detail}
          </pre>
        </div>
      )}
    </div>
  )
}

function CategoryGroup({
  cat,
  catSteps,
  showScore = false,
  autoExpand = true,
}: {
  cat: string
  catSteps: RichStep[]
  showScore?: boolean
  autoExpand?: boolean
}) {
  const meta = CATEGORY_META[cat]
  const catPass = catSteps.filter((s) => s.status === "pass" || s.status === "success").length
  const catFail = catSteps.filter((s) => s.status === "fail" || s.status === "failed").length
  const catScore = catSteps.reduce((sum, s) => sum + (s.score ?? 0), 0)
  const catMax = catSteps.reduce((sum, s) => sum + (s.max_score ?? 0), 0)
  const [isOpen, setIsOpen] = useState(autoExpand)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border hover:bg-muted/70 transition-colors text-left"
      >
        <span className="text-muted-foreground">{meta?.icon}</span>
        <span className="text-xs font-semibold text-foreground">{meta?.label ?? cat}</span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          {showScore ? (
            <>
              <span className="text-muted-foreground">{catPass}/{catSteps.length} passed</span>
              {catMax > 0 && (
                <span className="font-mono font-medium text-foreground">{catScore}/{catMax} pts</span>
              )}
            </>
          ) : (
            <>
              <span className="text-success">{catPass} passed</span>
              {catFail > 0 && <span className="text-destructive">{catFail} failed</span>}
            </>
          )}
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="divide-y divide-border">
          {catSteps.map((step) => (
            <StepRow key={step.step} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}

function TestContent() {
  const { isBlacklisted, user } = useAuth()
  const isGuest = user?.role === "GUEST"
  const [state, setState] = useState<TestState>("idle")
  const [steps, setSteps] = useState<RichStep[]>([])
  const [finalResult, setFinalResult] = useState<TestResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [restrictedDialogOpen, setRestrictedDialogOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [autoExpandCats, setAutoExpandCats] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const stepsEndRef = useRef<HTMLDivElement>(null)

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG)
  const [phpModules, setPhpModules] = useState<string[]>(Object.keys(DEFAULT_CONFIG.php.expected.modules))
  const [newModule, setNewModule] = useState("")

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const parsed: HistoryEntry[] = JSON.parse(raw)
        setHistory(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  const saveHistory = useCallback((cfg: TestConfig, mods: string[]) => {
    const label = [
      cfg.vm_proxmox.inputs.name,
      cfg.vm_proxmox.inputs.host,
    ]
      .filter(Boolean)
      .join(" / ") || "Unnamed config"

    const entry: HistoryEntry = {
      label,
      savedAt: Date.now(),
      config: cfg,
      phpModules: mods,
    }

    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.label !== entry.label)].slice(0, MAX_HISTORY)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const loadHistory = useCallback((entry: HistoryEntry) => {
    setConfig(entry.config)
    setPhpModules(entry.phpModules)
    setShowHistory(false)
    setValidationErrors({})
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      // ignore
    }
    setShowHistory(false)
  }, [])

  const clearAllFields = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
    setPhpModules(Object.keys(DEFAULT_CONFIG.php.expected.modules))
    setNewModule("")
    setValidationErrors({})
  }, [])

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [steps])


  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    // Proxmox VM — required fields
    if (!config.vm_proxmox.inputs.name.trim()) {
      errors["prox-name"] = "VM Name is required"
    }
    if (!config.vm_proxmox.inputs.host.trim()) {
      errors["prox-host"] = "Host IP is required"
    }
    if (!config.vm_proxmox.inputs.user.trim()) {
      errors["prox-user"] = "User is required"
    }
    if (!config.vm_proxmox.inputs.password.trim()) {
      errors["prox-password"] = "Password is required"
    }

    // disk_size validation for both VMs
    const proxDiskErr = validateDiskSize(config.vm_proxmox.expected.resources.disk_size)
    if (proxDiskErr) errors["prox-disk"] = proxDiskErr

    const ubuntuDiskErr = validateDiskSize(config.vm_ubuntu.expected.resources.disk_size)
    if (ubuntuDiskErr) errors["ubuntu-disk"] = ubuntuDiskErr

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [config])

  const startTest = useCallback(() => {
    if (!validateForm()) return

    // Save current config to history before running
    saveHistory(config, phpModules)

    setState("connecting")
    setSteps([])
    setFinalResult(null)
    setErrorMsg(null)
    setAutoExpandCats(new Set())

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const wsBase = API_URL.replace(/^http/, "ws")
    const wsUrl = `${wsBase}/api/ukk/test/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close()
        setState("error")
        setErrorMsg("Connection timeout - unable to reach test server")
      }
    }, 10000)

    ws.onopen = () => {
      clearTimeout(connectionTimeout)

      const phpModulesObj: Record<string, boolean> = {}
      phpModules.forEach((mod) => { phpModulesObj[mod] = true })

      const configToSend = {
        ...config,
        php: { expected: { binary: true, modules: phpModulesObj } },
        dns: {
          inputs: config.dns.inputs,
          expected: { domain: config.dns.inputs.domain, ip: config.dns.inputs.ip },
        },
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const payload: Record<string, unknown> = { data: configToSend }
      if (token) payload.token = token
      ws.send(JSON.stringify(payload))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.event === "start") {
          setState("running")
          return
        }

        if (data.event === "finished" && data.summary) {
          const s = data.summary
          setFinalResult({
            total_score: s.total ?? 0,
            max_score: s.max ?? 0,
            percentage: s.percentage ?? null,
            grade: s.grade ?? null,
            results: [],
          })
          setState("done")
          return
        }

        if (data.event === "error") {
          setErrorMsg(data.message || "An unknown error occurred")
          setState("error")
          return
        }

        if (data.step_code && data.step_name) {
          const normalized: TestStep["status"] =
            data.status === "success" ? "pass" : data.status === "failed" ? "fail" : data.status

          const step: RichStep = {
            step: data.step_code,
            label: `${data.step_name}`,
            status: normalized,
            detail: data.message ?? null,
            category: data.category ?? undefined,
            score: data.score ?? undefined,
            max_score: data.max_score ?? undefined,
          }

          setState((prev) => (prev === "connecting" ? "running" : prev))
          setSteps((prev) => {
            const existing = prev.findIndex((s) => s.step === data.step_code)
            if (existing >= 0) {
              const next = [...prev]
              next[existing] = step
              return next
            }
            return [...prev, step]
          })
          return
        }

        if (data.type === "result") {
          setFinalResult(data)
          setState("done")
          if (data.results?.length > 0) setSteps(data.results)
          return
        }

        if (data.type === "progress" && data.step && data.label) {
          const step: RichStep = {
            step: data.step,
            label: data.label,
            status: data.status as TestStep["status"],
            detail: data.detail ?? null,
          }
          setSteps((prev) => {
            const existing = prev.findIndex((s) => s.step === data.step)
            if (existing >= 0) {
              const next = [...prev]
              next[existing] = step
              return next
            }
            return [...prev, step]
          })
          return
        }

        if (data.type === "error") {
          setErrorMsg(data.message || "An unknown error occurred")
          setState("error")
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = (event) => {
      clearTimeout(connectionTimeout)
      setState((prev) => {
        if (prev === "running" || prev === "connecting") {
          if (event.code === 1000 || event.code === 1001) return "done"
          setErrorMsg((prevMsg) => prevMsg || `Connection closed unexpectedly (code: ${event.code})`)
          return "error"
        }
        return prev
      })
    }

    ws.onerror = () => {
      clearTimeout(connectionTimeout)
      setState("error")
      setErrorMsg("Failed to connect to the test server - check your network connection")
      ws.close()
    }
  }, [config, phpModules, validateForm, saveHistory])

  const handleReset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState("idle")
    setSteps([])
    setFinalResult(null)
    setErrorMsg(null)
    setAutoExpandCats(new Set())
  }, [])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  const passCount = steps.filter((s) => s.status === "pass" || s.status === "success").length
  const failCount = steps.filter((s) => s.status === "fail" || s.status === "failed").length
  const totalScore = steps.reduce((sum, s) => sum + (s.score ?? 0), 0)
  const maxScore = steps.reduce((sum, s) => sum + (s.max_score ?? 0), 0)

  const groupedSteps = steps.reduce<Record<string, RichStep[]>>((acc, step) => {
    const cat = step.category ?? "other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(step)
    return acc
  }, {})

  const hasValidationErrors = Object.keys(validationErrors).length > 0

  const fieldClass = (id: string) =>
    `h-9 text-sm ${validationErrors[id] ? "border-destructive focus-visible:ring-destructive" : ""}`

  if (isBlacklisted) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">UKK Test Service</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Test your Proxmox, Ubuntu, WordPress, and DNS configuration
            </p>
          </div>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">Access Restricted</p>
                <p className="text-sm text-muted-foreground">
                  Your account is currently restricted from accessing test service
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
            featureName="Test Service"
          />
        </div>
      </AppShell>
    )
  }

  if (isGuest) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">UKK Test Service</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Test your Proxmox, Ubuntu, WordPress, and DNS configuration
            </p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">Access Not Available</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Guest accounts cannot run the test service. Please contact your admin to upgrade your account.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">UKK Test Service</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test your Proxmox, Ubuntu, WordPress, and DNS configuration
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <FlaskConical className="h-4 w-4 text-primary" />
                Competency Test
              </CardTitle>

              {state === "idle" && (
                <div className="flex items-center gap-2">
                  {/* History button */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setShowHistory((v) => !v)}
                    >
                      <History className="h-3.5 w-3.5" />
                      History
                      {history.length > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] font-mono">
                          {history.length}
                        </Badge>
                      )}
                    </Button>

                    {showHistory && (
                      <div className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-border bg-card shadow-lg">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <span className="text-xs font-semibold text-foreground">Previous Inputs</span>
                          {history.length > 0 && (
                            <button
                              onClick={clearHistory}
                              className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Clear all
                            </button>
                          )}
                        </div>
                        {history.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            No saved history yet
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto">
                            {history.map((entry, i) => (
                              <button
                                key={i}
                                onClick={() => loadHistory(entry)}
                                className="w-full flex flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
                              >
                                <span className="text-xs font-medium text-foreground truncate">
                                  {entry.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(entry.savedAt).toLocaleString()}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clear all fields */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={clearAllFields}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear fields
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* Click outside to close history dropdown */}
            {showHistory && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowHistory(false)}
              />
            )}

            {state === "idle" && (
              <div className="space-y-6">

                {/* Global validation error banner */}
                {hasValidationErrors && (
                  <div className="flex items-start gap-3 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">
                      Please fix the errors below before starting the test.
                    </p>
                  </div>
                )}

                {/* Proxmox VM */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Proxmox VM Configuration
                    </h3>
                    <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive px-1.5 py-0">
                      Required
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-name" className="text-xs">
                        VM Name
                      </Label>
                      <Input
                        id="prox-name"
                        value={config.vm_proxmox.inputs.name}
                        onChange={(e) => {
                          setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, inputs: { ...config.vm_proxmox.inputs, name: e.target.value } } })
                          if (validationErrors["prox-name"]) setValidationErrors((prev) => { const n = { ...prev }; delete n["prox-name"]; return n })
                        }}
                        placeholder="test-proxmox"
                        className={fieldClass("prox-name")}
                      />
                      {validationErrors["prox-name"] && (
                        <p className="text-[10px] text-destructive">{validationErrors["prox-name"]}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-host" className="text-xs">
                        Host IP
                      </Label>
                      <Input
                        id="prox-host"
                        value={config.vm_proxmox.inputs.host}
                        onChange={(e) => {
                          setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, inputs: { ...config.vm_proxmox.inputs, host: e.target.value } } })
                          if (validationErrors["prox-host"]) setValidationErrors((prev) => { const n = { ...prev }; delete n["prox-host"]; return n })
                        }}
                        placeholder="10.10.10.65"
                        className={fieldClass("prox-host")}
                      />
                      {validationErrors["prox-host"] && (
                        <p className="text-[10px] text-destructive">{validationErrors["prox-host"]}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-user" className="text-xs">
                        User
                      </Label>
                      <Input
                        id="prox-user"
                        value={config.vm_proxmox.inputs.user}
                        onChange={(e) => {
                          setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, inputs: { ...config.vm_proxmox.inputs, user: e.target.value } } })
                          if (validationErrors["prox-user"]) setValidationErrors((prev) => { const n = { ...prev }; delete n["prox-user"]; return n })
                        }}
                        placeholder="root"
                        className={fieldClass("prox-user")}
                      />
                      {validationErrors["prox-user"] && (
                        <p className="text-[10px] text-destructive">{validationErrors["prox-user"]}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-password" className="text-xs">
                        Password
                      </Label>
                      <Input
                        id="prox-password"
                        type="text"
                        value={config.vm_proxmox.inputs.password}
                        onChange={(e) => {
                          setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, inputs: { ...config.vm_proxmox.inputs, password: e.target.value } } })
                          if (validationErrors["prox-password"]) setValidationErrors((prev) => { const n = { ...prev }; delete n["prox-password"]; return n })
                        }}
                        placeholder="password"
                        className={fieldClass("prox-password")}
                      />
                      {validationErrors["prox-password"] && (
                        <p className="text-[10px] text-destructive">{validationErrors["prox-password"]}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Proxmox expected resources */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prox-cores" className="text-xs">Cores (expected)</Label>
                    <Input
                      id="prox-cores"
                      type="number"
                      value={config.vm_proxmox.expected.resources.cores}
                      onChange={(e) =>
                        setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, expected: { ...config.vm_proxmox.expected, resources: { ...config.vm_proxmox.expected.resources, cores: Number(e.target.value) } } } })
                      }
                      placeholder="6"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prox-memory" className="text-xs">Memory MB (expected)</Label>
                    <Input
                      id="prox-memory"
                      type="number"
                      value={config.vm_proxmox.expected.resources.memory}
                      onChange={(e) =>
                        setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, expected: { ...config.vm_proxmox.expected, resources: { ...config.vm_proxmox.expected.resources, memory: Number(e.target.value) } } } })
                      }
                      placeholder="8192"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prox-disk" className="text-xs">Disk Size (expected)</Label>
                    <Input
                      id="prox-disk"
                      value={config.vm_proxmox.expected.resources.disk_size}
                      onChange={(e) => {
                        setConfig({ ...config, vm_proxmox: { ...config.vm_proxmox, expected: { ...config.vm_proxmox.expected, resources: { ...config.vm_proxmox.expected.resources, disk_size: e.target.value } } } })
                        const err = validateDiskSize(e.target.value)
                        setValidationErrors((prev) => {
                          const n = { ...prev }
                          if (err) n["prox-disk"] = err
                          else delete n["prox-disk"]
                          return n
                        })
                      }}
                      placeholder="32G"
                      className={fieldClass("prox-disk")}
                    />
                    {validationErrors["prox-disk"] ? (
                      <p className="text-[10px] text-destructive">{validationErrors["prox-disk"]}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Format: 32G or 512M</p>
                    )}
                  </div>
                </div>

                {/* Ubuntu VM */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Ubuntu VM Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-name" className="text-xs">VM Name</Label>
                      <Input
                        id="ubuntu-name"
                        value={config.vm_ubuntu.inputs.name}
                        onChange={(e) => setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, inputs: { ...config.vm_ubuntu.inputs, name: e.target.value } } })}
                        placeholder="jns23-ubuntu"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-host" className="text-xs">Host IP</Label>
                      <Input
                        id="ubuntu-host"
                        value={config.vm_ubuntu.inputs.host}
                        onChange={(e) => setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, inputs: { ...config.vm_ubuntu.inputs, host: e.target.value } } })}
                        placeholder="10.10.10.20"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-user" className="text-xs">User</Label>
                      <Input
                        id="ubuntu-user"
                        value={config.vm_ubuntu.inputs.user}
                        onChange={(e) => setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, inputs: { ...config.vm_ubuntu.inputs, user: e.target.value } } })}
                        placeholder="jns23"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-password" className="text-xs">Password</Label>
                      <Input
                        id="ubuntu-password"
                        type="text"
                        value={config.vm_ubuntu.inputs.password}
                        onChange={(e) => setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, inputs: { ...config.vm_ubuntu.inputs, password: e.target.value } } })}
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Ubuntu expected resources */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-cores" className="text-xs">Cores (expected)</Label>
                      <Input
                        id="ubuntu-cores"
                        type="number"
                        value={config.vm_ubuntu.expected.resources.cores}
                        onChange={(e) => setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, expected: { ...config.vm_ubuntu.expected, resources: { ...config.vm_ubuntu.expected.resources, cores: Number(e.target.value) } } } })}
                        placeholder="6"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-memory" className="text-xs">Memory MB (expected)</Label>
                      <Input
                        id="ubuntu-memory"
                        type="number"
                        value={config.vm_ubuntu.expected.resources.memory}
                        onChange={(e) => setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, expected: { ...config.vm_ubuntu.expected, resources: { ...config.vm_ubuntu.expected.resources, memory: Number(e.target.value) } } } })}
                        placeholder="6144"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-disk" className="text-xs">Disk Size (expected)</Label>
                      <Input
                        id="ubuntu-disk"
                        value={config.vm_ubuntu.expected.resources.disk_size}
                        onChange={(e) => {
                          setConfig({ ...config, vm_ubuntu: { ...config.vm_ubuntu, expected: { ...config.vm_ubuntu.expected, resources: { ...config.vm_ubuntu.expected.resources, disk_size: e.target.value } } } })
                          const err = validateDiskSize(e.target.value)
                          setValidationErrors((prev) => {
                            const n = { ...prev }
                            if (err) n["ubuntu-disk"] = err
                            else delete n["ubuntu-disk"]
                            return n
                          })
                        }}
                        placeholder="32G"
                        className={fieldClass("ubuntu-disk")}
                      />
                      {validationErrors["ubuntu-disk"] ? (
                        <p className="text-[10px] text-destructive">{validationErrors["ubuntu-disk"]}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Format: 32G or 512M</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PHP Modules */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">PHP Modules</h3>
                  <div className="flex flex-wrap gap-2">
                    {phpModules.map((mod) => (
                      <Badge
                        key={mod}
                        variant="secondary"
                        className="text-xs font-mono px-2 py-1 flex items-center gap-1.5"
                      >
                        {mod}
                        <button
                          onClick={() => setPhpModules(phpModules.filter((m) => m !== mod))}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newModule}
                      onChange={(e) => setNewModule(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newModule.trim()) {
                          if (!phpModules.includes(newModule.trim())) {
                            setPhpModules([...phpModules, newModule.trim()])
                          }
                          setNewModule("")
                        }
                      }}
                      placeholder="Add module (e.g., exif)"
                      className="h-9 text-sm"
                    />
                    <Button
                      onClick={() => {
                        if (newModule.trim() && !phpModules.includes(newModule.trim())) {
                          setPhpModules([...phpModules, newModule.trim()])
                          setNewModule("")
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* MySQL */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">MySQL Configuration</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="mysql-db" className="text-xs">Database Name</Label>
                      <Input
                        id="mysql-db"
                        value={config.mysql.inputs.db_name}
                        onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, inputs: { ...config.mysql.inputs, db_name: e.target.value } } })}
                        placeholder="wordpress"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mysql-user" className="text-xs">Database User</Label>
                      <Input
                        id="mysql-user"
                        value={config.mysql.inputs.db_user}
                        onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, inputs: { ...config.mysql.inputs, db_user: e.target.value } } })}
                        placeholder="jns23"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mysql-password" className="text-xs">Password</Label>
                      <Input
                        id="mysql-password"
                        type="text"
                        value={config.mysql.inputs.db_password}
                        onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, inputs: { ...config.mysql.inputs, db_password: e.target.value } } })}
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* WordPress */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">WordPress Configuration</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="wp-url" className="text-xs">URL</Label>
                      <Input
                        id="wp-url"
                        value={config.wordpress.inputs.url}
                        onChange={(e) => setConfig({ ...config, wordpress: { ...config.wordpress, inputs: { ...config.wordpress.inputs, url: e.target.value } } })}
                        placeholder="http://10.10.10.20"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wp-username" className="text-xs">Username</Label>
                      <Input
                        id="wp-username"
                        value={config.wordpress.inputs.username}
                        onChange={(e) => setConfig({ ...config, wordpress: { ...config.wordpress, inputs: { ...config.wordpress.inputs, username: e.target.value } } })}
                        placeholder="admin"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wp-password" className="text-xs">Password</Label>
                      <Input
                        id="wp-password"
                        type="text"
                        value={config.wordpress.inputs.password}
                        onChange={(e) => setConfig({ ...config, wordpress: { ...config.wordpress, inputs: { ...config.wordpress.inputs, password: e.target.value } } })}
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* DNS */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">DNS Configuration</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="dns-domain" className="text-xs">Domain</Label>
                      <Input
                        id="dns-domain"
                        value={config.dns.inputs.domain}
                        onChange={(e) => setConfig({ ...config, dns: { ...config.dns, inputs: { ...config.dns.inputs, domain: e.target.value } } })}
                        placeholder="ukk-jhuan.net"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dns-ip" className="text-xs">IP Address</Label>
                      <Input
                        id="dns-ip"
                        value={config.dns.inputs.ip}
                        onChange={(e) => setConfig({ ...config, dns: { ...config.dns, inputs: { ...config.dns.inputs, ip: e.target.value } } })}
                        placeholder="10.10.10.20"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={startTest}
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Test
                </Button>
              </div>
            )}

            {state === "connecting" && (
              <div className="flex items-center gap-3 rounded-lg bg-muted border border-border p-4">
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Connecting to test server...</p>
                  <p className="text-xs text-muted-foreground">Establishing connection, please wait.</p>
                </div>
              </div>
            )}

            {state === "running" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {steps.length === 0 ? "Test is starting..." : "Test in progress..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {steps.length === 0
                        ? "The server is initializing your test."
                        : `${steps.length} step${steps.length !== 1 ? "s" : ""} completed so far`}
                    </p>
                  </div>
                  {steps.length > 0 && (
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" /> {passCount}
                      </span>
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" /> {failCount}
                      </span>
                    </div>
                  )}
                </div>

                {Object.keys(groupedSteps).length > 0 && (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {Object.entries(groupedSteps).map(([cat, catSteps]) => (
                      <CategoryGroup
                        key={cat}
                        cat={cat}
                        catSteps={catSteps}
                        autoExpand={autoExpandCats.has(cat)}
                      />
                    ))}
                    <div ref={stepsEndRef} />
                  </div>
                )}
              </div>
            )}

            {state === "done" && (
              <div className="space-y-5">
                <div className="rounded-lg bg-muted/40 border border-border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 shrink-0">
                      <Trophy className="h-6 w-6 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Final Score</p>
                      <p className="text-2xl font-bold font-mono text-foreground">
                        {finalResult?.total_score ?? totalScore}
                        <span className="text-base text-muted-foreground font-normal"> / {finalResult?.max_score ?? maxScore}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {finalResult?.grade && <GradeBadge grade={finalResult.grade} />}
                      {finalResult?.percentage != null && (
                        <p className="text-sm font-semibold font-mono text-foreground">{finalResult.percentage.toFixed(1)}%</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3 w-3" /> {passCount} passed
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-3 w-3" /> {failCount} failed
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" /> {steps.length} total checks
                    </span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {Object.entries(groupedSteps).map(([cat, catSteps]) => (
                    <CategoryGroup
                      key={cat}
                      cat={cat}
                      catSteps={catSteps}
                      showScore
                      autoExpand={autoExpandCats.has(cat)}
                    />
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
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Connection Error</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {errorMsg || "An unexpected error occurred."}
                    </p>
                  </div>
                </div>

                {steps.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(groupedSteps).map(([cat, catSteps]) => (
                      <CategoryGroup
                        key={cat}
                        cat={cat}
                        catSteps={catSteps}
                        autoExpand={autoExpandCats.has(cat)}
                      />
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-accent"
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
