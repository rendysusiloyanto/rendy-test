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
            {/* Connection Details - Grid Layout */}
            {isConnected && traffic && (
              <div className="space-y-3">
                {/* Main Connection Info Grid */}
                <div className="rounded-lg bg-secondary p-4">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                    {/* Common Name */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Common Name
                      </div>
                      <div className="font-mono text-sm text-foreground">
                        {vpnStatus?.username || "--"}
                      </div>
                    </div>

                    {/* Real IP */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Real IP
                      </div>
                      <div className="font-mono text-sm text-primary">
                        {traffic.real_ip || "--"}
                      </div>
                    </div>

                    {/* Virtual IP */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Virtual IP
                      </div>
                      <div className="font-mono text-sm text-primary">
                        {vpnStatus?.ip || "--"}
                      </div>
                    </div>

                    {/* Download Total */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Download
                      </div>
                      <div className="font-mono text-sm text-success">
                        {traffic.bytes_sent != null
                          ? formatBytes(traffic.bytes_sent)
                          : "--"}
                      </div>
                    </div>

                    {/* Upload Total */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Upload
                      </div>
                      <div className="font-mono text-sm text-primary">
                        {traffic.bytes_received != null
                          ? formatBytes(traffic.bytes_received)
                          : "--"}
                      </div>
                    </div>

                    {/* Connected Since */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Connected Since
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        {traffic.connected_since || "--"}
                      </div>
                    </div>
                  </div>

                  {/* Current Speed - Inline Display */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="font-mono text-sm">
                      <span className="text-success">↓ </span>
                      <span className="text-success">
                        {traffic.speed_out_kbps != null
                          ? `${traffic.speed_out_kbps.toFixed(2)} Kbps`
                          : "0.00 Kbps"}
                      </span>
                      <span className="text-muted-foreground mx-2">|</span>
                      <span className="text-primary">↑ </span>
                      <span className="text-primary">
                        {traffic.speed_in_kbps != null
                          ? `${traffic.speed_in_kbps.toFixed(2)} Kbps`
                          : "0.00 Kbps"}
                      </span>
                    </div>
                  </div>

                  {/* Cipher */}
                  {traffic.cipher && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Cipher
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        {traffic.cipher}
                      </div>
                    </div>
                  )}
                </div>

                {/* Speed Chart */}
                {speedHistory.length > 0 && (() => {
                  // Calculate dynamic Y-axis domain
                  const allSpeeds = speedHistory.flatMap(h => [h.downloadKbps, h.uploadKbps])
                  const maxSpeed = Math.max(...allSpeeds, 1)
                  const minSpeed = Math.min(...allSpeeds, 0)
                  const padding = (maxSpeed - minSpeed) * 0.2 || 1
                  const yMin = Math.max(0, minSpeed - padding)
                  const yMax = maxSpeed + padding
                  
                  return (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">
                        Grafik traffic (saat VPN aktif)
                      </h3>
                      <div className="rounded-lg bg-card/50 border border-border p-3">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={speedHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                              opacity={0.2}
                            />
                            <XAxis
                              dataKey="timestamp"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              stroke="hsl(var(--border))"
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              domain={[yMin, yMax]}
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              stroke="hsl(var(--border))"
                              width={45}
                              tickFormatter={(value) => `${value.toFixed(2)}`}
                              label={{
                                value: "Kbps",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "hsl(var(--popover-foreground))",
                              }}
                              labelStyle={{
                                color: "hsl(var(--popover-foreground))",
                                marginBottom: "4px",
                              }}
                              formatter={(value: number) => `${value.toFixed(2)} Kbps`}
                            />
                            <Legend
                              wrapperStyle={{
                                fontSize: "11px",
                              }}
                              iconSize={12}
                            />
                            <Line
                              type="monotone"
                              dataKey="downloadKbps"
                              stroke="#06b6d4"
                              strokeWidth={2.5}
                              name="Download"
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="uploadKbps"
                              stroke="#3b82f6"
                              strokeWidth={2.5}
                              name="Upload"
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                })()}
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
