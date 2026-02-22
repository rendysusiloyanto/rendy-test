"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import type { AnnouncementResponse } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Megaphone, Plus, Pencil, Trash2, Loader2, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export function AdminAnnouncements() {
  const [items, setItems] = useState<AnnouncementResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.adminListAnnouncements()
      setItems(data)
    } catch {
      toast.error("Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const resetForm = () => {
    setTitle("")
    setContent("")
    setFile(null)
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (item: AnnouncementResponse) => {
    setEditingId(item.id)
    setTitle(item.title)
    setContent(item.content || "")
    setFile(null)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      toast.error("Title is required")
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("content", content)
      if (file) formData.append("file", file)

      if (editingId) {
        await api.updateAnnouncement(editingId, formData)
        toast.success("Announcement updated")
      } else {
        await api.createAnnouncement(formData)
        toast.success("Announcement created")
      }
      setDialogOpen(false)
      resetForm()
      fetchItems()
    } catch {
      toast.error("Failed to save announcement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAnnouncement(id)
      toast.success("Announcement deleted")
      fetchItems()
    } catch {
      toast.error("Failed to delete announcement")
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Announcements
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage announcements for students
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={openCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingId ? "Edit Announcement" : "New Announcement"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Announcement body..."
                  rows={4}
                  className="bg-secondary border-border text-foreground resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">
                  Attachment (optional)
                </Label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="bg-secondary border-border text-foreground file:text-foreground"
                />
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-primary-foreground"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No announcements yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm text-foreground flex items-center gap-2">
                    {item.title}
                    {item.has_attachment && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-border text-muted-foreground"
                      >
                        <Paperclip className="mr-1 h-2.5 w-2.5" />
                        {item.attachment_filename}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {item.content && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {item.content}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(item.updated_at), "dd MMM yyyy HH:mm")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">
                            Delete Announcement?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This will permanently delete &quot;{item.title}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border text-foreground">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
