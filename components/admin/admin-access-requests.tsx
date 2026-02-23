"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { AccessRequest } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, CheckCircle, XCircle, Clock, FileText } from "lucide-react"
import { toast } from "sonner"

export function AdminAccessRequests() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const data = await api.listAccessRequests()
      setRequests(data)
    } catch (error) {
      console.error("[v0] Failed to fetch access requests:", error)
      toast.error("Failed to load access requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleApprove = async (requestId: string) => {
    setActionLoading(true)
    try {
      const updated = await api.approveAccessRequest(requestId)
      setRequests(requests.map((r) => (r.id === requestId ? updated : r)))
      toast.success("Access request approved")
      setViewDialogOpen(false)
    } catch (error) {
      console.error("[v0] Failed to approve request:", error)
      toast.error("Failed to approve request")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeny = async (requestId: string) => {
    setActionLoading(true)
    try {
      const updated = await api.denyAccessRequest(requestId)
      setRequests(requests.map((r) => (r.id === requestId ? updated : r)))
      toast.success("Access request denied")
      setViewDialogOpen(false)
    } catch (error) {
      console.error("[v0] Failed to deny request:", error)
      toast.error("Failed to deny request")
    } finally {
      setActionLoading(false)
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending")
  const approvedRequests = requests.filter((r) => r.status === "approved")
  const deniedRequests = requests.filter((r) => r.status === "denied")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "denied":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>
      case "denied":
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Denied</Badge>
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
      {/* Pending Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">Pending Requests</h3>
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="font-mono">
                {pendingRequests.length}
              </Badge>
            )}
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <Card className="border-border/50 bg-secondary/50">
            <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">No pending requests</span>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="bg-secondary border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">
                          {request.user_full_name}
                        </h4>
                        {getStatusIcon(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {request.user_email}
                      </p>
                      <p className="text-xs text-foreground line-clamp-2 mb-3">
                        {request.reason}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Dialog open={viewDialogOpen && selectedRequest?.id === request.id} onOpenChange={setViewDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Access Request Details</DialogTitle>
                          </DialogHeader>
                          {selectedRequest && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">User</p>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedRequest.user_full_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedRequest.user_email}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Request Reason</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {selectedRequest.reason}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Submitted</p>
                                <p className="text-sm text-foreground">
                                  {new Date(selectedRequest.created_at).toLocaleString()}
                                </p>
                              </div>

                              {selectedRequest.status === "pending" && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDeny(selectedRequest.id)}
                                    disabled={actionLoading}
                                    className="flex-1"
                                  >
                                    {actionLoading ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Deny
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => handleApprove(selectedRequest.id)}
                                    disabled={actionLoading}
                                    className="flex-1"
                                  >
                                    {actionLoading ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approved Requests */}
      {approvedRequests.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-foreground">Approved Requests</h3>
              <Badge variant="secondary" className="font-mono">
                {approvedRequests.length}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3">
            {approvedRequests.map((request) => (
              <Card key={request.id} className="bg-secondary border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">
                          {request.user_full_name}
                        </h4>
                        {getStatusIcon(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {request.user_email}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Approved on {new Date(request.updated_at).toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Denied Requests */}
      {deniedRequests.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-foreground">Denied Requests</h3>
              <Badge variant="secondary" className="font-mono">
                {deniedRequests.length}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3">
            {deniedRequests.map((request) => (
              <Card key={request.id} className="bg-secondary border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">
                          {request.user_full_name}
                        </h4>
                        {getStatusIcon(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {request.user_email}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Denied on {new Date(request.updated_at).toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
