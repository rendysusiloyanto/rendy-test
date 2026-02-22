"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api, ApiError } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Key } from "lucide-react"
import { toast } from "sonner"
import { AuthGuard } from "@/components/auth-guard"

function SettingsContent() {
  const { user } = useAuth()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      await api.setPassword({ new_password: newPassword })
      toast.success("Password updated successfully")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Failed to update password")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        <Card className="border-border bg-card mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Profile</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <p className="text-sm text-foreground">{user?.full_name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm text-foreground font-mono">{user?.email}</p>
            </div>
            {user?.class_name && (
              <div>
                <Label className="text-xs text-muted-foreground">Class</Label>
                <p className="text-sm text-foreground">{user.class_name}</p>
              </div>
            )}
            {user?.attendance_number && (
              <div>
                <Label className="text-xs text-muted-foreground">Attendance Number</Label>
                <p className="text-sm text-foreground">{user.attendance_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              Change Password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Set or update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm text-foreground">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm text-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                  placeholder="Re-enter password"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}
