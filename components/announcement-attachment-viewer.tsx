"use client"

import { useState, useEffect, useRef } from "react"
import { api } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Download, FileText } from "lucide-react"
import { toast } from "sonner"

type ViewerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcementId: string
  filename: string
}

export function AnnouncementAttachmentViewer({
  open,
  onOpenChange,
  announcementId,
  filename,
}: ViewerProps) {
  const [loading, setLoading] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const docxContainerRef = useRef<HTMLDivElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  const ext = filename ? filename.split(".").pop()?.toLowerCase() : ""
  const isPdf = ext === "pdf"
  const isDocx = ext === "docx" || ext === "doc"

  useEffect(() => {
    if (!open || !announcementId) return
    setLoading(true)
    setError(false)
    setBlobUrl(null)
    if (docxContainerRef.current) docxContainerRef.current.innerHTML = ""

    api
      .getAnnouncementAttachmentBlob(announcementId)
      .then((blob) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        setBlobUrl(url)
        if (isDocx && docxContainerRef.current) {
          import("docx-preview").then(({ renderAsync }) => {
            renderAsync(blob, docxContainerRef.current!, undefined, {
              breakPages: true,
              ignoreLastRenderedPageBreak: true,
            }).catch(() => {
              toast.error("Could not preview this document")
            })
          }).catch(() => {
            toast.error("Preview not available – use Download")
          })
        }
      })
      .catch(() => {
        setError(true)
        toast.error("Failed to load attachment")
      })
      .finally(() => setLoading(false))

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [open, announcementId, isDocx])

  const handleClose = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setBlobUrl(null)
    if (docxContainerRef.current) docxContainerRef.current.innerHTML = ""
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground truncate pr-8">
            {filename}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Could not load the attachment. Make sure you are logged in.
            </div>
          )}
          {!loading && !error && blobUrl && (
            <>
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={filename}
                  className="w-full flex-1 min-h-[60vh] rounded-lg border border-border bg-white"
                />
              )}
              {isDocx && (
                <div
                  ref={docxContainerRef}
                  className="w-full overflow-auto rounded-lg border border-border bg-white p-6 min-h-[60vh] max-h-[70vh] prose prose-sm max-w-none [&_.docx]:!bg-white [&_.docx]:!text-black"
                />
              )}
              {!isPdf && !isDocx && (
                <div className="py-8 text-center space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type.
                  </p>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-border"
                >
                  <a href={blobUrl} download={filename} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
