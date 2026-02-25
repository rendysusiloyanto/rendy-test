"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { PremiumRequest } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export function PremiumRequestCard() {
  const { user } = useAuth()
  const [request, setRequest] = useState<PremiumRequest | null>(null)
  const [loading, setLoading] = useState(true)

  const isPremium = user?.is_premium ?? false

  useEffect(() => {
    if (isPremium) {
      setLoading(false)
      return
    }
    api
      .getMyPremiumRequest()
      .then(setRequest)
      .catch(() => toast.error("Failed to load premium request"))
      .finally(() => setLoading(false))
  }, [isPremium])

  if (isPremium) return null
  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  const statusBadge = () => {
    if (!request) return null
    switch (request.status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-xs">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">Request Premium</h3>
            {statusBadge()}
          </div>
          <Button asChild variant="default" size="sm" className="shrink-0">
            <Link href="/premium">
              {request?.status === "PENDING" ? "View / Update" : "Submit request"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
