"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Send, Loader2, CheckCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

function BlacklistedContent() {
  const { user } = useAuth()
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleRequestAccess = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request")
      return
    }

    setSubmitting(true)
    try {
      await api.createAccessRequest(reason)
      setSubmitted(true)
      setReason("")
      toast.success("Access request sent to administrators")
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    } catch (error) {
      console.error("[v0] Failed to send access request:", error)
      toast.error("Failed to send access request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Access Restricted</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is currently blacklisted
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Account Information</h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium text-foreground">
                    {user?.full_name}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium text-foreground">
                    {user?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="destructive">Blacklisted</Badge>
                </div>
              </div>
            </div>

            {/* Request access section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground">Request Access</h3>
              <p className="text-sm text-muted-foreground">
                If you believe this is a mistake or would like to appeal this decision, 
                please provide a reason below. Your request will be reviewed by the administrators.
              </p>

              <div className="space-y-3">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason for Access Request
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you should have access to the platform..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting || submitted}
                  className="min-h-32 resize-none"
                />
              </div>

              {submitted && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    Your request has been sent. Administrators will review it shortly.
                  </div>
                </div>
              )}

              <Button
                onClick={handleRequestAccess}
                disabled={submitting || submitted || !reason.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Access Request
                  </>
                )}
              </Button>
            </div>

            {/* Additional info */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Submitting a request will notify administrators. 
                You will be notified of the decision via the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function BlacklistedPage() {
  return (
    <AuthGuard allowBlacklisted={true}>
      <BlacklistedContent />
    </AuthGuard>
  )
}
