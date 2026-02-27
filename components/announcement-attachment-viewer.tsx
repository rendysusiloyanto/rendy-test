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
  const [docxReady, setDocxReady] = useState(false)
  const docxContainerRef = useRef<HTMLDivElement>(null)
  const blobUrlRef = useRef<string | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const ext = filename ? filename.split(".").pop()?.toLowerCase() : ""
  const isPdf = ext === "pdf"
  const isDocx = ext === "docx" || ext === "doc"

  // Fetch attachment and create blob URL
  useEffect(() => {
    if (!open || !announcementId) return
    setLoading(true)
    setError(false)
    setBlobUrl(null)
    setDocxReady(false)
    blobRef.current = null
    if (docxContainerRef.current) docxContainerRef.current.innerHTML = ""

    api
      .getAnnouncementAttachmentBlob(announcementId)
      .then(async (blob) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        blobRef.current = blob
        let blobToUse = blob
        if (isPdf && blob.type !== "application/pdf") {
          const ab = await blob.arrayBuffer()
          blobToUse = new Blob([ab], { type: "application/pdf" })
        }
        const url = URL.createObjectURL(blobToUse)
        blobUrlRef.current = url
        setBlobUrl(url)
        if (isDocx) setDocxReady(true)
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
      blobRef.current = null
    }
  }, [open, announcementId, isPdf, isDocx])

  // Render DOCX after container is in the DOM (blobUrl set → re-render → container mounted)
  useEffect(() => {
    if (!docxReady || !isDocx || !blobRef.current || !docxContainerRef.current) return
    const container = docxContainerRef.current
    const blob = blobRef.current
    let cancelled = false
    import("docx-preview")
      .then(({ renderAsync }) => {
        if (cancelled || !container) return
        container.innerHTML = ""
        return renderAsync(blob, container, undefined, {
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
        })
      })
      .then(() => {
        if (!cancelled) setDocxReady(false)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not preview this document – use Download")
          setDocxReady(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [docxReady, isDocx])

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
                <div className="flex flex-col gap-2">
                  <iframe
                    src={blobUrl}
                    title={filename}
                    className="w-full flex-1 min-h-[60vh] rounded-lg border border-border bg-white"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    If the document does not appear above, use the Download button below.
                  </p>
                </div>
              )}
              {isDocx && (
                <div
                  ref={docxContainerRef}
                  className="w-full overflow-auto rounded-lg border border-border bg-white p-6 min-h-[60vh] max-h-[70vh] text-left [&_.docx]:!bg-white [&_.docx]:!text-black [&_.docx]:!min-h-[50vh]"
                  style={{ color: "#000" }}
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
                  <a
                    href={blobUrl}
                    download={filename}
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
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
