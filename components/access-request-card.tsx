"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { RestrictedAccessDialog } from "@/components/restricted-access-dialog"
import { AlertCircle } from "lucide-react"

export function AccessRequestCard() {
  const { isBlacklisted } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!isBlacklisted) return null

  return (
    <>
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Account Restricted
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your account has limited access. Some features are not available. 
                Request access from administrators to regain full functionality.
              </p>
              <button
                onClick={() => setDialogOpen(true)}
                className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Request Access
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <RestrictedAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        featureName="full platform access"
      />
    </>
  )
}
