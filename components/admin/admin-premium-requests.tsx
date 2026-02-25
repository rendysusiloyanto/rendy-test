"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { PremiumRequestListItem } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, CheckCircle, XCircle, Clock, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { safeFormat } from "@/lib/utils"

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED"

export function AdminPremiumRequests() {
  const [requests, setRequests] = useState<PremiumRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [imageDialogRequestId, setImageDialogRequestId] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cardImageUrls, setCardImageUrls] = useState<Record<string, string>>({})

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const data = await api.adminListPremiumRequests(
        statusFilter === "all" ? undefined : statusFilter
      )
      setRequests(data)
    } catch {
      toast.error("Failed to load premium requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  // Load thumbnail for each request (image on left)
  useEffect(() => {
    requests.forEach((req) => {
      const id = req.id
      api
        .getPremiumRequestImageBlob(id)
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          setCardImageUrls((prev) => (prev[id] ? prev : { ...prev, [id]: url }))
        })
        .catch(() => {})
    })
  }, [requests])

  // Load image when dialog opens
  useEffect(() => {
    if (!imageDialogRequestId) {
      setImageObjectUrl(null)
      return
    }
    let cancelled = false
    let url: string | null = null
    api
      .getPremiumRequestImageBlob(imageDialogRequestId)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImageObjectUrl(url)
      })
      .catch(() => {
        if (!cancelled) setImageObjectUrl(null)
        toast.error("Failed to load image")
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [imageDialogRequestId])

  const handleReview = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(true)
    try {
      const updated = await api.adminReviewPremiumRequest(requestId, { status })
      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)))
      toast.success(status === "APPROVED" ? "Request approved" : "Request rejected")
    } catch {
      toast.error("Failed to update request")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Premium Requests</h2>
          <p className="text-sm text-muted-foreground">
            Review transfer proof and approve or reject
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[160px] border-border bg-card">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requests.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No premium requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="border-border bg-card overflow-hidden">
              <CardContent className="p-0 flex">
                {/* Proof image on the left */}
                <div
                  className="w-40 sm:w-48 flex-shrink-0 bg-secondary flex items-center justify-center cursor-pointer min-h-[120px]"
                  onClick={() => setImageDialogRequestId(req.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setImageDialogRequestId(req.id)}
                  aria-label="View full transfer proof"
                >
                  {cardImageUrls[req.id] ? (
                    <img
                      src={cardImageUrls[req.id]}
                      alt="Transfer proof"
                      className="w-full h-full object-contain max-h-40"
                    />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                </div>
                {/* User info and actions on the right */}
                <div className="flex-1 min-w-0 p-4 flex flex-wrap items-start justify-between gap-3 rounded-r-lg">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {req.user_full_name}
                      </h4>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{req.user_email}</p>
                    {req.message && (
                      <p className="text-xs text-foreground mt-1 line-clamp-2">
                        {req.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {safeFormat(req.created_at, "dd MMM yyyy HH:mm")}
                      {req.updated_at != null && req.updated_at !== req.created_at &&
                        ` · Updated ${safeFormat(req.updated_at, "dd MMM HH:mm")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border"
                      onClick={() => setImageDialogRequestId(req.id)}
                    >
                      <ImageIcon className="mr-1 h-3.5 w-3.5" />
                      View full
                    </Button>
                    {req.status === "PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReview(req.id, "REJECTED")}
                          disabled={actionLoading}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-success text-success-foreground hover:bg-success/90"
                          onClick={() => handleReview(req.id, "APPROVED")}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!imageDialogRequestId} onOpenChange={() => setImageDialogRequestId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer proof</DialogTitle>
            <DialogDescription>
              Uploaded transfer proof image. Click outside or close to dismiss.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center bg-secondary rounded-lg min-h-[200px] p-4">
            {imageObjectUrl ? (
              <img
                src={imageObjectUrl}
                alt="Transfer proof"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
