"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { SupportResponse } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QrCode, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

export function AdminSupport() {
  const [support, setSupport] = useState<SupportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchSupport()
  }, [])

  const fetchSupport = async () => {
    try {
      setLoading(true)
      const data = await api.getSupport()
      setSupport(data)
      setDescription(data.description || "")
      if (data.image_url) {
        setPreviewUrl(data.image_url)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch support:", error)
      toast.error("Failed to load QRIS data")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!description && !selectedFile) {
      toast.error("Please provide at least a description or image")
      return
    }

    setSaving(true)
    try {
      await api.updateSupport(description, selectedFile || undefined)
      setSupport(null)
      setSelectedFile(null)
      await fetchSupport()
      toast.success("QRIS data updated successfully")
    } catch (error) {
      console.error("[v0] Failed to update support:", error)
      toast.error("Failed to update QRIS data")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QRIS Payment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter a description for the QRIS (e.g., payment instructions)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="qris-file" className="text-sm font-medium">
              QRIS Image
            </Label>
            <div className="flex flex-col gap-4">
              <input
                id="qris-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="qris-file"
                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-center">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Click to upload QRIS image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              </label>

              {/* Preview */}
              {previewUrl && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-foreground">Preview:</p>
                  <img
                    src={previewUrl}
                    alt="QRIS Preview"
                    className="w-48 h-48 object-contain border border-border rounded-lg p-2"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save QRIS Configuration"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
