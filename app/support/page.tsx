"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { SupportResponse } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function SupportPage() {
  return (
    <AuthGuard>
      <AppShell>
        <SupportContent />
      </AppShell>
    </AuthGuard>
  )
}

function SupportContent() {
  const [support, setSupport] = useState<SupportResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSupport()
  }, [])

  const fetchSupport = async () => {
    try {
      setLoading(true)
      const data = await api.getSupport()
      setSupport(data)
    } catch (error) {
      console.error("[v0] Failed to fetch support data:", error)
      toast.error("Failed to load support information")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!support?.image_url) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No support information available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support & Payment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan the QR code below to make a payment
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            QRIS Payment Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <img
              src="https://ukk.jns23.cloud/api/support/image"
              alt="QRIS Payment Code"
              className="w-96 h-96 object-contain rounded-lg border border-border p-4 bg-white"
            />
          </div>

          {support.description && (
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {support.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
