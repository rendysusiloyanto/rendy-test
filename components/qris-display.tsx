"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { SupportResponse } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, X } from "lucide-react"

export function QrisDisplay() {
  const [support, setSupport] = useState<SupportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchSupport()
  }, [])

  const fetchSupport = async () => {
    try {
      setLoading(true)
      const data = await api.getSupport()
      setSupport(data)
    } catch (error) {
      console.error("[v0] Failed to fetch QRIS:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !support?.image_url) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-4 left-4 z-40 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 text-sm font-medium"
          title="QRIS Payment"
        >
          <QrCode className="h-5 w-5" />
          <span className="hidden sm:inline">QRIS</span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QRIS Payment
          </DialogTitle>
          {support.description && (
            <DialogDescription>{support.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex justify-center py-6">
          <img
            src={support.image_url}
            alt="QRIS Code"
            className="w-64 h-64 object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
