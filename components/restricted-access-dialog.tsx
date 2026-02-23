"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface RestrictedAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureName: string
}

export function RestrictedAccessDialog({
  open,
  onOpenChange,
  featureName,
}: RestrictedAccessDialogProps) {
  const { user } = useAuth()
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleRequestAccess = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request")
      return
    }

    if (!user?.email) {
      toast.error("User email not found")
      return
    }

    setSubmitting(true)
    try {
      await api.createAccessRequest(user.email, reason)
      setSubmitted(true)
      setReason("")
      toast.success("Access request sent to administrators")
      setTimeout(() => {
        setSubmitted(false)
        onOpenChange(false)
      }, 2000)
    } catch (error) {
      console.error("[v0] Failed to send access request:", error)
      toast.error("Failed to send access request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>Access Restricted</DialogTitle>
          </div>
          <DialogDescription>
            Your account is currently restricted from accessing {featureName}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Request sent successfully</p>
              <p className="text-sm text-muted-foreground mt-1">
                The administrators will review your request shortly
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Reason for access request
              </label>
              <Textarea
                placeholder="Explain why you need access to this feature..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 min-h-[100px] resize-none"
              />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800">
                Your request will be reviewed by the administrators. You'll be notified
                once a decision is made.
              </p>
            </div>
          </div>
        )}

        {!submitted && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestAccess}
              disabled={submitting || !reason.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send Request
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
