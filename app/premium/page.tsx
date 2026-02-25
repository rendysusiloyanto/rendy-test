"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { PremiumRequest } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Upload, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { safeFormat } from "@/lib/utils"

export default function PremiumPage() {
  return (
    <AuthGuard>
      <AppShell>
        <PremiumContent />
      </AppShell>
    </AuthGuard>
  )
}

function PremiumContent() {
  const { user } = useAuth()
  const [request, setRequest] = useState<PremiumRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)

  const isPremium = user?.is_premium ?? false

  const fetchRequest = async () => {
    try {
      const data = await api.getMyPremiumRequest()
      setRequest(data)
    } catch {
      toast.error("Failed to load premium request")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequest()
  }, [])

  useEffect(() => {
    if (!request?.id) {
      setImageObjectUrl(null)
      return
    }
    let cancelled = false
    let url: string | null = null
    api
      .getPremiumRequestImageBlob(request.id)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImageObjectUrl(url)
      })
      .catch(() => {
        if (!cancelled) setImageObjectUrl(null)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [request?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error("Please select a transfer proof image")
      return
    }
    setSubmitting(true)
    try {
      const updated = await api.submitPremiumRequest(file, message || undefined)
      setRequest(updated)
      setMessage("")
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success(request ? "Request updated" : "Request submitted")
    } catch {
      toast.error("Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  if (isPremium) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-success" />
            <p className="mt-3 font-medium text-foreground">You are a premium user.</p>
            <p className="text-sm text-muted-foreground mt-1">No action needed.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statusBadge = () => {
    if (!request) return null
    switch (request.status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  const canUpdateRequest = request && (request.status === "PENDING" || request.status === "REJECTED")

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Request Premium</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your transfer proof and optional message. Admin will review your request.
        </p>
      </div>

      {request && (
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {statusBadge()}
            </div>
            {request.message && (
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Message: </span>
                {request.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Submitted: {safeFormat(request.created_at, "dd MMM yyyy HH:mm")}
              {request.updated_at != null && request.updated_at !== request.created_at &&
                ` · Updated: ${safeFormat(request.updated_at, "dd MMM yyyy HH:mm")}`}
            </p>
            {imageObjectUrl && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Transfer proof</p>
                <img
                  src={imageObjectUrl}
                  alt="Transfer proof"
                  className="rounded-lg border border-border max-h-48 object-contain bg-secondary"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Upload proof & message
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="premium-file" className="text-sm text-foreground">
                Transfer proof image (screenshot) <span className="text-destructive">*</span>
              </Label>
              <input
                id="premium-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : "Choose image"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-message" className="text-sm text-foreground">
                Message (optional)
              </Label>
              <Textarea
                id="premium-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Transfer date, bank name..."
                rows={3}
                className="bg-secondary border-border text-foreground resize-none"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {canUpdateRequest ? "Update request" : "Submit request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
