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
} from "lucide-react"
import { toast } from "sonner"

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
  const wsRef = useRef<WebSocket | null>(null)

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
    try {
      const res = await fetch(`${API_URL}/api/openvpn/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setVpnStatus({ has_config: false, username: null, ip: null })
      } else {
        const data = await res.json()
        setVpnStatus(data)
      }
    } catch {
      setVpnStatus({ has_config: false, username: null, ip: null })
    } finally {
      setStatusLoading(false)
    }
  }, [isPremium])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // WebSocket for live traffic
  useEffect(() => {
    if (!isPremium || !vpnStatus?.has_config) return

    const token = localStorage.getItem("access_token")
    if (!token) return

    const wsBase = API_URL.replace(/^http/, "ws")
    const wsUrl = `${wsBase}/api/openvpn/traffic/ws?token=${encodeURIComponent(token)}`

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data: VPNTrafficWs = JSON.parse(event.data)
          setTraffic(data)
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        // Reconnect after a short delay
        setTimeout(() => {
          if (wsRef.current === ws) {
            connect()
          }
        }, 5000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      const ws = wsRef.current
      wsRef.current = null
      ws?.close()
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

            {/* Live traffic stats */}
            {isConnected && traffic && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <ArrowDownToLine className="h-3 w-3" />
                    Download
                  </div>
                  <p className="text-sm font-mono font-medium text-foreground">
                    {traffic.bytes_received != null
                      ? formatBytes(traffic.bytes_received)
                      : "--"}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <ArrowUpFromLine className="h-3 w-3" />
                    Upload
                  </div>
                  <p className="text-sm font-mono font-medium text-foreground">
                    {traffic.bytes_sent != null
                      ? formatBytes(traffic.bytes_sent)
                      : "--"}
                  </p>
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
