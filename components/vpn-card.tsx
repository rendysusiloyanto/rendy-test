"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { VPNStatusResponse, VPNTrafficWs } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Download,
  Loader2,
  Wifi,
  WifiOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Globe,
  User,
  Activity,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function VpnCard() {
  const { isPremium } = useAuth()
  const [vpnStatus, setVpnStatus] = useState<VPNStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [traffic, setTraffic] = useState<VPNTrafficWs | null>(null)
  const [speedHistory, setSpeedHistory] = useState<
    Array<{
      timestamp: string
      downloadKbps: number
      uploadKbps: number
    }>
  >([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const [wsConnected, setWsConnected] = useState(false)

  // Fetch VPN status via REST
  const fetchStatus = useCallback(async () => {
    if (!isPremium) {
      setStatusLoading(false)
      return
    }
    const token = localStorage.getItem("access_token")
    if (!token) {
      setStatusLoading(false)
      return
    }

    console.log("[v0] Fetching VPN status...")
    try {
      const res = await fetch(`${API_URL}/api/openvpn/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        console.log("[v0] VPN status: no config")
        setVpnStatus({ has_config: false, username: null, ip: null })
      } else {
        const data = await res.json()
        console.log("[v0] VPN status:", data)
        setVpnStatus(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch VPN status:", error)
      setVpnStatus({ has_config: false, username: null, ip: null })
    } finally {
      setStatusLoading(false)
    }
  }, [isPremium])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // WebSocket for live traffic with improved reconnection logic
  useEffect(() => {
    if (!isPremium || !vpnStatus?.has_config) {
      console.log("[v0] VPN WebSocket: not starting (premium:", isPremium, "has_config:", vpnStatus?.has_config, ")")
      return
    }

    const token = localStorage.getItem("access_token")
    if (!token) {
      console.log("[v0] VPN WebSocket: no token found")
      return
    }

    const wsBase = API_URL.replace(/^http/, "ws")
    const wsUrl = `${wsBase}/api/openvpn/traffic/ws?token=${encodeURIComponent(token)}`
    let shouldReconnect = true

    function connect() {
      // Check if we've exceeded max reconnection attempts
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error("[v0] VPN WebSocket: max reconnection attempts reached")
        return
      }

      console.log(`[v0] VPN WebSocket: connecting (attempt ${reconnectAttemptsRef.current + 1})...`)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[v0] VPN WebSocket: connected")
        setWsConnected(true)
        reconnectAttemptsRef.current = 0 // Reset on successful connection
      }

      ws.onmessage = (event) => {
        try {
          const data: VPNTrafficWs = JSON.parse(event.data)
          console.log("[v0] VPN traffic update:", data)
          setTraffic(data)

          // Update speed history for chart (keep last 20 data points)
          if (data.speed_out_kbps != null && data.speed_in_kbps != null) {
            setSpeedHistory((prev) => {
              const now = new Date().toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
              const newEntry = {
                timestamp: now,
                downloadKbps: data.speed_out_kbps!,
                uploadKbps: data.speed_in_kbps!,
              }
              const updated = [...prev, newEntry]
              // Keep only last 20 data points
              return updated.slice(-20)
            })
          }
        } catch (error) {
          console.error("[v0] VPN WebSocket: failed to parse message:", error)
        }
      }

      ws.onclose = (event) => {
        console.log(`[v0] VPN WebSocket: closed (code: ${event.code}, reason: ${event.reason})`)
        setWsConnected(false)
        
        // Only reconnect if we should and haven't hit the limit
        if (shouldReconnect && wsRef.current === ws && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000) // Exponential backoff, max 30s
          console.log(`[v0] VPN WebSocket: reconnecting in ${delay}ms...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error("[v0] VPN WebSocket error:", error)
        setWsConnected(false)
        ws.close()
      }
    }

    connect()

    // Cleanup function
    return () => {
      console.log("[v0] VPN WebSocket: cleaning up...")
      shouldReconnect = false
      setWsConnected(false)
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      
      reconnectAttemptsRef.current = 0
    }
  }, [isPremium, vpnStatus?.has_config])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await api.createVpnConfig()
      toast.success("VPN config created successfully")
      fetchStatus()
    } catch {
      toast.error("Failed to create VPN config")
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async () => {
    try {
      const blob = await api.downloadVpnConfig()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "config.ovpn"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Failed to download config")
    }
  }

  if (!isPremium) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            VPN Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Premium Required
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                VPN access is available for premium accounts only. Contact your
                admin for access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (statusLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  const hasConfig = vpnStatus?.has_config ?? false
  const isConnected = traffic?.connected_since != null

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            VPN Access
          </CardTitle>
          {hasConfig && (
            <Badge
              variant="outline"
              className={`text-xs font-mono ${
                isConnected
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-muted-foreground/30 bg-muted text-muted-foreground"
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="mr-1 h-3 w-3" /> Connected
                </>
              ) : (
                <>
                  <WifiOff className="mr-1 h-3 w-3" /> Disconnected
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasConfig ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-sm text-muted-foreground text-center">
              Generate your OpenVPN configuration file to connect to the lab
              network.
            </p>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Generate VPN Config
            </Button>
          </div>
        ) : (
          <>
            {/* User info */}
            {(vpnStatus?.username || vpnStatus?.ip) && (
              <div className="rounded-lg bg-secondary p-3 space-y-1.5">
                {vpnStatus.username && (
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-mono text-foreground">
                      {vpnStatus.username}
                    </span>
                  </div>
                )}
                {vpnStatus.ip && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">IP:</span>
                    <span className="font-mono text-foreground">
                      {vpnStatus.ip}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Connection Details */}
            {isConnected && traffic && (
              <div className="space-y-3">
                {/* Connection Info */}
                <div className="rounded-lg bg-secondary p-3 space-y-1.5">
                  {traffic.real_ip && (
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Real IP:</span>
                      <span className="font-mono text-foreground">
                        {traffic.real_ip}
                      </span>
                    </div>
                  )}
                  {traffic.cipher && (
                    <div className="flex items-center gap-2 text-xs">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Cipher:</span>
                      <span className="font-mono text-foreground">
                        {traffic.cipher}
                      </span>
                    </div>
                  )}
                  {traffic.connected_since && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Connected Since:
                      </span>
                      <span className="font-mono text-foreground">
                        {traffic.connected_since}
                      </span>
                    </div>
                  )}
                </div>

                {/* Speed Chart */}
                {speedHistory.length > 0 && (
                  <div className="rounded-lg bg-secondary p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Network Speed (KB/s)
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={speedHistory}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 10 }} width={30} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px" }}
                          iconSize={10}
                        />
                        <Line
                          type="monotone"
                          dataKey="downloadKbps"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name="Download"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="uploadKbps"
                          stroke="hsl(var(--success))"
                          strokeWidth={2}
                          name="Upload"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Total Traffic */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <ArrowDownToLine className="h-3 w-3" />
                      Total Download
                    </div>
                    <p className="text-sm font-mono font-medium text-foreground">
                      {traffic.bytes_sent != null
                        ? formatBytes(traffic.bytes_sent)
                        : "--"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <ArrowUpFromLine className="h-3 w-3" />
                      Total Upload
                    </div>
                    <p className="text-sm font-mono font-medium text-foreground">
                      {traffic.bytes_received != null
                        ? formatBytes(traffic.bytes_received)
                        : "--"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isConnected && (
              <p className="text-xs text-muted-foreground text-center py-1">
                Connect using the .ovpn config file to see live traffic stats.
              </p>
            )}

            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full border-border text-foreground hover:bg-accent"
            >
              <Download className="mr-2 h-4 w-4" />
              Download .ovpn Config
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
