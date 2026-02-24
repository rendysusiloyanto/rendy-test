"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { UserResponse, UserUpdate } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Users, Pencil, Loader2, Search, Crown, Shield, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export function AdminUsers() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
  const [editForm, setEditForm] = useState<UserUpdate>({})
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await api.listUsers()
      setUsers(data)
    } catch (error) {
      console.error("[v0] Failed to fetch users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleEdit = (user: UserResponse) => {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name,
      class_name: user.class_name,
      attendance_number: user.attendance_number,
      role: user.role,
      is_premium: user.is_premium,
    })
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingUser) return

    setSaving(true)
    try {
      const updated = await api.updateUser(editingUser.id, editForm)
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)))
      toast.success("User updated successfully")
      setEditDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      console.error("[v0] Failed to update user:", error)
      toast.error("Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.class_name &&
        user.class_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            User Management
          </h2>
        </div>
        <Badge variant="secondary" className="font-mono">
          {users.length} users
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or class..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-40">Name</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Class</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-32">Status</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-border h-12 hover:bg-accent/30 ${
                        user.is_blacklisted ? "bg-destructive/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {user.is_blacklisted && (
                            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          )}
                          {user.full_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.class_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {user.role === "ADMIN" && (
                            <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                          {user.is_premium && (
                            <Crown className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                          )}
                          {user.is_blacklisted && (
                            <Badge variant="outline" className="text-[10px] border-destructive text-destructive px-1.5">
                              blocked
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs">
                  Full Name
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-class" className="text-xs">
                    Class Name
                  </Label>
                  <Input
                    id="edit-class"
                    value={editForm.class_name || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, class_name: e.target.value })
                    }
                    placeholder="e.g. XII RPL 1"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-attendance" className="text-xs">
                    Attendance No.
                  </Label>
                  <Input
                    id="edit-attendance"
                    value={editForm.attendance_number || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        attendance_number: e.target.value,
                      })
                    }
                    placeholder="e.g. 23"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-xs">
                  Role
                </Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger id="edit-role" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUEST">Guest</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-premium" className="text-xs">
                  Premium Status
                </Label>
                <Select
                  value={editForm.is_premium ? "true" : "false"}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, is_premium: value === "true" })
                  }
                >
                  <SelectTrigger id="edit-premium" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Regular</SelectItem>
                    <SelectItem value="true">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <Label htmlFor="edit-blacklist" className="text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Blacklist User</span>
                  </div>
                </Label>
                <Switch
                  id="edit-blacklist"
                  checked={editForm.is_blacklisted ?? false}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, is_blacklisted: checked })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
