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

function StepRow({ step }: { step: RichStep }) {
  const isPass = step.status === "pass" || step.status === "success"
  const isFail = step.status === "fail" || step.status === "failed"
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
      isPass ? "bg-success/[0.03]" : isFail ? "bg-destructive/[0.03]" : "bg-transparent"
    }`}>
      <div className="mt-0.5 shrink-0">
        <StepStatusIcon status={step.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground leading-snug">{step.label}</p>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{step.step}</span>
        </div>
        {step.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{step.detail}</p>
        )}
      </div>
      {step.max_score != null && step.max_score > 0 && (
        <span className={`text-xs font-mono font-semibold shrink-0 ${isPass ? "text-success" : isFail ? "text-destructive" : "text-muted-foreground"}`}>
          {step.score ?? 0}/{step.max_score}
        </span>
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
  const wsRef = useRef<WebSocket | null>(null)
  const stepsEndRef = useRef<HTMLDivElement>(null)

  // Test configuration
  const [config, setConfig] = useState<TestConfig>({
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
  })

  const [phpModules, setPhpModules] = useState<string[]>(Object.keys(config.php.expected.modules))
  const [newModule, setNewModule] = useState("")

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [steps])

  const startTest = useCallback(() => {
    setState("connecting")
    setSteps([])
    setFinalResult(null)
    setErrorMsg(null)

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

        // Server signals test has started
        if (data.event === "start") {
          setState("running")
          return
        }

        // Server error event
        if (data.event === "error") {
          setErrorMsg(data.message || "An unknown error occurred")
          setState("error")
          return
        }

        // Step result — has step_code + step_name + status
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

        // Final result message
        if (data.type === "result") {
          setFinalResult(data)
          setState("done")
          if (data.results?.length > 0) setSteps(data.results)
          return
        }

        // Legacy progress format
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

        // Legacy error format
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
  }, [config, phpModules])

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

  // Group steps by category
  const groupedSteps = steps.reduce<Record<string, RichStep[]>>((acc, step) => {
    const cat = step.category ?? "other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(step)
    return acc
  }, {})

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
                <p className="text-lg font-semibold text-foreground">
                  Access Restricted
                </p>
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
                <p className="text-lg font-semibold text-foreground">
                  Access Not Available
                </p>
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
              <div className="space-y-6">
                {/* Proxmox VM */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Proxmox VM Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-name" className="text-xs">
                        VM Name
                      </Label>
                      <Input
                        id="prox-name"
                        value={config.vm_proxmox.inputs.name}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_proxmox: {
                              ...config.vm_proxmox,
                              inputs: {
                                ...config.vm_proxmox.inputs,
                                name: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="test-proxmox"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-host" className="text-xs">
                        Host IP
                      </Label>
                      <Input
                        id="prox-host"
                        value={config.vm_proxmox.inputs.host}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_proxmox: {
                              ...config.vm_proxmox,
                              inputs: {
                                ...config.vm_proxmox.inputs,
                                host: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="10.10.10.65"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-user" className="text-xs">
                        User
                      </Label>
                      <Input
                        id="prox-user"
                        value={config.vm_proxmox.inputs.user}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_proxmox: {
                              ...config.vm_proxmox,
                              inputs: {
                                ...config.vm_proxmox.inputs,
                                user: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="root"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prox-password" className="text-xs">
                        Password
                      </Label>
                      <Input
                        id="prox-password"
                        type="text"
                        value={config.vm_proxmox.inputs.password}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_proxmox: {
                              ...config.vm_proxmox,
                              inputs: {
                                ...config.vm_proxmox.inputs,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Ubuntu VM */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Ubuntu VM Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-name" className="text-xs">
                        VM Name
                      </Label>
                      <Input
                        id="ubuntu-name"
                        value={config.vm_ubuntu.inputs.name}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_ubuntu: {
                              ...config.vm_ubuntu,
                              inputs: {
                                ...config.vm_ubuntu.inputs,
                                name: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="jns23-ubuntu"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-host" className="text-xs">
                        Host IP
                      </Label>
                      <Input
                        id="ubuntu-host"
                        value={config.vm_ubuntu.inputs.host}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_ubuntu: {
                              ...config.vm_ubuntu,
                              inputs: {
                                ...config.vm_ubuntu.inputs,
                                host: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="10.10.10.20"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-user" className="text-xs">
                        User
                      </Label>
                      <Input
                        id="ubuntu-user"
                        value={config.vm_ubuntu.inputs.user}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_ubuntu: {
                              ...config.vm_ubuntu,
                              inputs: {
                                ...config.vm_ubuntu.inputs,
                                user: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="jns23"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ubuntu-password" className="text-xs">
                        Password
                      </Label>
                      <Input
                        id="ubuntu-password"
                        type="text"
                        value={config.vm_ubuntu.inputs.password}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            vm_ubuntu: {
                              ...config.vm_ubuntu,
                              inputs: {
                                ...config.vm_ubuntu.inputs,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* PHP Modules */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    PHP Modules
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {phpModules.map((mod) => (
                      <Badge
                        key={mod}
                        variant="secondary"
                        className="text-xs font-mono px-2 py-1 flex items-center gap-1.5"
                      >
                        {mod}
                        <button
                          onClick={() =>
                            setPhpModules(phpModules.filter((m) => m !== mod))
                          }
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
                        if (
                          newModule.trim() &&
                          !phpModules.includes(newModule.trim())
                        ) {
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
                  <h3 className="text-sm font-semibold text-foreground">
                    MySQL Configuration
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="mysql-db" className="text-xs">
                        Database Name
                      </Label>
                      <Input
                        id="mysql-db"
                        value={config.mysql.inputs.db_name}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            mysql: {
                              ...config.mysql,
                              inputs: {
                                ...config.mysql.inputs,
                                db_name: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="wordpress"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mysql-user" className="text-xs">
                        Database User
                      </Label>
                      <Input
                        id="mysql-user"
                        value={config.mysql.inputs.db_user}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            mysql: {
                              ...config.mysql,
                              inputs: {
                                ...config.mysql.inputs,
                                db_user: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="jns23"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mysql-password" className="text-xs">
                        Password
                      </Label>
                      <Input
                        id="mysql-password"
                        type="text"
                        value={config.mysql.inputs.db_password}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            mysql: {
                              ...config.mysql,
                              inputs: {
                                ...config.mysql.inputs,
                                db_password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* WordPress */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    WordPress Configuration
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="wp-url" className="text-xs">
                        URL
                      </Label>
                      <Input
                        id="wp-url"
                        value={config.wordpress.inputs.url}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            wordpress: {
                              ...config.wordpress,
                              inputs: {
                                ...config.wordpress.inputs,
                                url: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="http://10.10.10.20"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wp-username" className="text-xs">
                        Username
                      </Label>
                      <Input
                        id="wp-username"
                        value={config.wordpress.inputs.username}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            wordpress: {
                              ...config.wordpress,
                              inputs: {
                                ...config.wordpress.inputs,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="admin"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wp-password" className="text-xs">
                        Password
                      </Label>
                      <Input
                        id="wp-password"
                        type="text"
                        value={config.wordpress.inputs.password}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            wordpress: {
                              ...config.wordpress,
                              inputs: {
                                ...config.wordpress.inputs,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="password"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* DNS */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    DNS Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="dns-domain" className="text-xs">
                        Domain
                      </Label>
                      <Input
                        id="dns-domain"
                        value={config.dns.inputs.domain}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            dns: {
                              ...config.dns,
                              inputs: {
                                ...config.dns.inputs,
                                domain: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="ukk-jhuan.net"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dns-ip" className="text-xs">
                        IP Address
                      </Label>
                      <Input
                        id="dns-ip"
                        value={config.dns.inputs.ip}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            dns: {
                              ...config.dns,
                              inputs: {
                                ...config.dns.inputs,
                                ip: e.target.value,
                              },
                            },
                          })
                        }
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

            {(state === "connecting") && (
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
                {/* Status banner */}
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

                {/* Grouped steps */}
                {Object.keys(groupedSteps).length > 0 && (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {Object.entries(groupedSteps).map(([cat, catSteps]) => {
                      const meta = CATEGORY_META[cat]
                      const catPass = catSteps.filter((s) => s.status === "pass" || s.status === "success").length
                      const catFail = catSteps.filter((s) => s.status === "fail" || s.status === "failed").length
                      return (
                        <div key={cat} className="rounded-lg border border-border overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                            <span className="text-muted-foreground">{meta?.icon}</span>
                            <span className="text-xs font-semibold text-foreground">{meta?.label ?? cat}</span>
                            <div className="ml-auto flex items-center gap-2 text-[10px]">
                              <span className="text-success">{catPass} passed</span>
                              {catFail > 0 && <span className="text-destructive">{catFail} failed</span>}
                            </div>
                          </div>
                          <div className="divide-y divide-border">
                            {catSteps.map((step) => (
                              <StepRow key={step.step} step={step} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={stepsEndRef} />
                  </div>
                )}
              </div>
            )}

            {state === "done" && (
              <div className="space-y-5">
                {/* Score summary */}
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
                    <div className="text-right shrink-0">
                      {finalResult?.grade && <GradeBadge grade={finalResult.grade} />}
                      {finalResult?.percentage != null && (
                        <p className="text-xs text-muted-foreground mt-1">{finalResult.percentage.toFixed(1)}%</p>
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

                {/* Grouped results */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {Object.entries(groupedSteps).map(([cat, catSteps]) => {
                    const meta = CATEGORY_META[cat]
                    const catPass = catSteps.filter((s) => s.status === "pass" || s.status === "success").length
                    const catScore = catSteps.reduce((sum, s) => sum + (s.score ?? 0), 0)
                    const catMax = catSteps.reduce((sum, s) => sum + (s.max_score ?? 0), 0)
                    return (
                      <div key={cat} className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                          <span className="text-muted-foreground">{meta?.icon}</span>
                          <span className="text-xs font-semibold text-foreground">{meta?.label ?? cat}</span>
                          <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{catPass}/{catSteps.length} passed</span>
                            {catMax > 0 && (
                              <span className="font-mono font-medium text-foreground">{catScore}/{catMax} pts</span>
                            )}
                          </div>
                        </div>
                        <div className="divide-y divide-border">
                          {catSteps.map((step) => (
                            <StepRow key={step.step} step={step} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
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

                {/* Show steps collected so far */}
                {steps.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(groupedSteps).map(([cat, catSteps]) => {
                      const meta = CATEGORY_META[cat]
                      return (
                        <div key={cat} className="rounded-lg border border-border overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                            <span className="text-muted-foreground">{meta?.icon}</span>
                            <span className="text-xs font-semibold text-foreground">{meta?.label ?? cat}</span>
                          </div>
                          <div className="divide-y divide-border">
                            {catSteps.map((step) => (
                              <StepRow key={step.step} step={step} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
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
