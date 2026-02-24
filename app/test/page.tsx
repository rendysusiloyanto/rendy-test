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
} from "lucide-react"
import type { TestResult, TestStep } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

type TestState = "idle" | "running" | "done" | "error"

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
  const { isBlacklisted, user } = useAuth()
  const isGuest = user?.role === "GUEST"
  const [state, setState] = useState<TestState>("idle")
  const [steps, setSteps] = useState<TestStep[]>([])
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
    console.log("[v0] Starting UKK test...")
    
    // Reset state
    setState("running")
    setSteps([])
    setFinalResult(null)
    setErrorMsg(null)

    // Close existing connection
    if (wsRef.current) {
      console.log("[v0] Closing existing WebSocket connection...")
      wsRef.current.close()
      wsRef.current = null
    }

    const wsBase = API_URL.replace(/^http/, "ws")
    const wsUrl = `${wsBase}/api/ukk/test/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    // Connection timeout - if not opened in 10 seconds, fail
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error("[v0] WebSocket connection timeout")
        ws.close()
        setState("error")
        setErrorMsg("Connection timeout - unable to reach test server")
      }
    }, 10000)

    ws.onopen = () => {
      console.log("[v0] Test WebSocket: connected successfully")
      clearTimeout(connectionTimeout)

      // Send test configuration
      const phpModulesObj: Record<string, boolean> = {}
      phpModules.forEach((mod) => {
        phpModulesObj[mod] = true
      })

      // Update DNS expected with user inputs
      const configToSend = {
        ...config,
        php: {
          expected: {
            binary: true,
            modules: phpModulesObj,
          },
        },
        dns: {
          inputs: config.dns.inputs,
          expected: {
            domain: config.dns.inputs.domain,
            ip: config.dns.inputs.ip,
          },
        },
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      const payload: Record<string, unknown> = { data: configToSend }
      if (token) payload.token = token
      ws.send(JSON.stringify(payload))
    }

    ws.onmessage = (event) => {
      try {
        const data: TestResult = JSON.parse(event.data)
        console.log("[v0] Test message received:", data.type, data)

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
          console.log("[v0] Test completed with result:", data)
          setFinalResult(data)
          setState("done")
          // Also update steps from results array if provided
          if (data.results && data.results.length > 0) {
            setSteps(data.results)
          }
        } else if (data.type === "error") {
          console.error("[v0] Test error:", data.message)
          setErrorMsg(data.message || "An unknown error occurred")
          setState("error")
        }
      } catch (error) {
        console.error("[v0] Failed to parse test message:", error)
      }
    }

    ws.onclose = (event) => {
      console.log(`[v0] Test WebSocket closed (code: ${event.code}, reason: ${event.reason})`)
      clearTimeout(connectionTimeout)
      
      setState((prev) => {
        // Only set error if we were still running (unexpected close)
        if (prev === "running") {
          setErrorMsg((prevMsg) => prevMsg || `Connection closed unexpectedly (code: ${event.code})`)
          return "error"
        }
        return prev
      })
    }

    ws.onerror = (error) => {
      console.error("[v0] Test WebSocket error:", error)
      clearTimeout(connectionTimeout)
      setState("error")
      setErrorMsg("Failed to connect to the test server - check your network connection")
      ws.close()
    }
  }, [config, phpModules])

  const handleReset = useCallback(() => {
    console.log("[v0] Resetting test...")
    
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
      console.log("[v0] Test component unmounting, cleaning up WebSocket...")
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  const passCount = steps.filter((s) => s.status === "pass").length
  const failCount = steps.filter((s) => s.status === "fail").length

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
