"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { PremiumRequest } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export function PremiumRequestCard() {
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
    if (isPremium) {
      setLoading(false)
      return
    }
    fetchRequest()
  }, [isPremium])

  // Load proof image as blob URL when we have a request (user can view own proof)
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

  if (isPremium) return null
  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
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

  const canUpdate = !request || request.status === "PENDING" || request.status === "REJECTED"

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground">Request Premium</h3>
          {request && statusBadge()}
        </div>

        {request && (
          <div className="space-y-2 text-sm">
            {request.message && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Message: </span>
                {request.message}
              </p>
            )}
            <p className="text-muted-foreground">
              Submitted: {format(new Date(request.created_at), "dd MMM yyyy HH:mm")}
              {request.updated_at !== request.created_at &&
                ` · Updated: ${format(new Date(request.updated_at), "dd MMM yyyy HH:mm")}`}
            </p>
            {imageObjectUrl && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Transfer proof</p>
                <img
                  src={imageObjectUrl}
                  alt="Transfer proof"
                  className="rounded-lg border border-border max-h-48 object-contain bg-secondary"
                />
              </div>
            )}
          </div>
        )}

        {canUpdate && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">
                Transfer proof image <span className="text-destructive">*</span>
              </Label>
              <input
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
              <Label className="text-sm text-foreground">Message (optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Transfer date, bank name..."
                rows={2}
                className="bg-secondary border-border text-foreground resize-none"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {request?.status === "PENDING" ? "Update request" : "Submit request"}
            </Button>
          </form>
        )}

      </CardContent>
    </Card>
  )
}
