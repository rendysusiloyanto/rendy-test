"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api"
import type { LearningResponse } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { BookOpen, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Upload, ImageIcon, Video } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export function AdminLearning() {
  const [items, setItems] = useState<LearningResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.adminListLearnings()
      setItems(data)
    } catch {
      toast.error("Failed to load learnings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setContent("")
    setVideoUrl("")
    setThumbnailUrl("")
    setIsPublished(false)
    setIsPremium(false)
    setThumbnailFile(null)
    setVideoFile(null)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
    if (videoInputRef.current) videoInputRef.current.value = ""
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (item: LearningResponse) => {
    setEditingId(item.id)
    setTitle(item.title)
    setDescription(item.description || "")
    setContent(item.content || "")
    setVideoUrl(item.video_url || "")
    setThumbnailUrl("")
    setIsPublished(item.is_published)
    setIsPremium(item.is_premium ?? false)
    setThumbnailFile(null)
    setVideoFile(null)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
    if (videoInputRef.current) videoInputRef.current.value = ""
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
      if (editingId) {
        await api.updateLearning(editingId, {
          title,
          description: description || null,
          content: content || null,
          video_url: videoUrl || null,
          thumbnail_url: thumbnailUrl || null,
          is_published: isPublished,
          is_premium: isPremium,
          thumbnail: thumbnailFile || undefined,
          video: videoFile || undefined,
        })
        toast.success("Learning updated")
      } else {
        await api.createLearning({
          title,
          description: description || null,
          content: content || null,
          video_url: videoUrl || null,
          thumbnail_url: thumbnailUrl || null,
          is_published: isPublished,
          is_premium: isPremium,
          thumbnail: thumbnailFile || undefined,
          video: videoFile || undefined,
        })
        toast.success("Learning created")
      }
      setDialogOpen(false)
      resetForm()
      fetchItems()
    } catch {
      toast.error("Failed to save learning")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteLearning(id)
      toast.success("Learning deleted")
      fetchItems()
    } catch {
      toast.error("Failed to delete learning")
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
            Learning Materials
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage tutorial videos and learning content
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
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingId ? "Edit Material" : "New Material"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Install Proxmox VE 8.x"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="bg-secondary border-border text-foreground resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Content (long-form)</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Optional long-form content..."
                  rows={3}
                  className="bg-secondary border-border text-foreground resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Thumbnail URL (external)</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://... or upload file below"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Thumbnail (image file)</Label>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-border"
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {thumbnailFile ? thumbnailFile.name : "Choose thumbnail image"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Video URL (external, e.g. YouTube)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Video (upload file, premium stream)</Label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-border"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {videoFile ? videoFile.name : "Choose video file"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Published</Label>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Premium</Label>
                <Switch
                  checked={isPremium}
                  onCheckedChange={setIsPremium}
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
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No learning materials yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm text-foreground">
                      {item.title}
                    </CardTitle>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        item.is_published
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {item.is_published ? (
                        <>
                          <Eye className="mr-1 h-2.5 w-2.5" />
                          Published
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1 h-2.5 w-2.5" />
                          Draft
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(item.updated_at), "dd MMM yyyy")}
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
                            Delete Learning?
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
