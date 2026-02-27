"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import type { UserResponse, UserUpdate } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "border-primary bg-primary/10 text-primary font-medium",
  STUDENT: "border-chart-2/60 bg-chart-2/10 text-chart-2",
  GUEST: "border-muted-foreground/50 bg-muted/50 text-muted-foreground",
}

const CLASS_COLORS = [
  "border-blue-500/60 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "border-violet-500/60 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "border-cyan-500/60 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
]

function getClassColor(className: string | null): string {
  if (!className) return "text-muted-foreground"
  let n = 0
  for (let i = 0; i < className.length; i++) n = (n * 31 + className.charCodeAt(i)) >>> 0
  return CLASS_COLORS[n % CLASS_COLORS.length]
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterClass, setFilterClass] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("oldest")
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

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>()
    users.forEach((u) => {
      if (u.class_name?.trim()) set.add(u.class_name.trim())
    })
    return Array.from(set).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    let list = users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.class_name &&
          user.class_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    if (filterRole !== "all") list = list.filter((u) => u.role === filterRole)
    if (filterStatus === "premium") list = list.filter((u) => u.is_premium && !u.is_blacklisted)
    else if (filterStatus === "regular") list = list.filter((u) => !u.is_premium && !u.is_blacklisted)
    else if (filterStatus === "blocked") list = list.filter((u) => u.is_blacklisted)
    if (filterClass !== "all") list = list.filter((u) => u.class_name?.trim() === filterClass)
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sortOrder === "newest" ? db - da : da - db
    })
    return list
  }, [users, searchQuery, filterRole, filterStatus, filterClass, sortOrder])

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

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="STUDENT">STUDENT</SelectItem>
            <SelectItem value="GUEST">GUEST</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {uniqueClasses.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(v: "newest" | "oldest") => setSortOrder(v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-1">
          {filteredUsers.length} of {users.length}
        </span>
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
                    <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-3 w-10">#</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-40">Name</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Class</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-32">Status</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`border-b border-border h-12 hover:bg-accent/30 ${
                        user.is_blacklisted ? "bg-destructive/5" : ""
                      }`}
                    >
                      <td className="px-3 py-3 text-center text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {user.is_blacklisted && (
                            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          )}
                          {user.full_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${ROLE_COLORS[user.role] ?? "border-border"}`}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.class_name ? (
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${getClassColor(user.class_name)}`}
                          >
                            {user.class_name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
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
