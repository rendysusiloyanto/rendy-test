"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"

export function BlacklistedUserAlert() {
  const { user, isBlacklisted } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user && isBlacklisted) {
      setOpen(true)
    }
  }, [user, isBlacklisted])

  if (!isBlacklisted) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive">Access Restricted</DialogTitle>
              <DialogDescription>
                Your account has been blacklisted
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account currently has restricted access to platform features. 
            If you believe this is a mistake, you can request access from the 
            dedicated page for blacklisted users.
          </p>

          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
            <p className="text-xs font-medium text-foreground">What you can do:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>View your account information</li>
              <li>Submit an access request to administrators</li>
              <li>Wait for administrators to review and approve your request</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Administrators will review your request and notify you of their decision.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
