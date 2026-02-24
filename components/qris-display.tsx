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
} from "@/components/ui/dialog"

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
    <>
      <div
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-3 rounded-lg bg-card border-2 border-primary shadow-xl hover:shadow-2xl cursor-pointer transition-all duration-300 hover:scale-110 animate-pulse"
        title="Click to view QRIS payment"
      >
        <img
          src="https://ukk-api.jns23.cloud/api/support/image"
          alt="QRIS Payment Code"
          className="w-32 h-32 object-contain"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>QRIS Payment</DialogTitle>
            {support.description && (
              <DialogDescription>{support.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex justify-center py-6">
            <img
              src="https://ukk-api.jns23.cloud/api/support/image"
              alt="QRIS Code"
              className="w-80 h-80 object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
