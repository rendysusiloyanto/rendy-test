"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { SupportResponse } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export function QrisDisplay() {
  const { isPremium } = useAuth()
  const [support, setSupport] = useState<SupportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  
  const qrisImageUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/support/image`

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

  // Hide for premium users
  if (isPremium || loading || !support?.image_url) {
    return null
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-2 rounded-lg bg-card border-2 border-primary shadow-xl hover:shadow-2xl cursor-pointer transition-all duration-300 hover:scale-105 animate-pulse"
        title="Click to view QRIS payment"
      >
        <div className="relative">
          <img
            src={qrisImageUrl}
            alt="QRIS Payment Code"
            className="w-48 h-48 object-contain"
          />
          <Badge className="absolute -top-2 -right-2 bg-destructive text-white">
            FREE PLAN
          </Badge>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>QRIS Payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <img
              src={qrisImageUrl}
              alt="QRIS Code"
              className="w-96 h-96 object-contain rounded-lg"
            />
            {support.description && (
              <DialogDescription className="text-center mt-4 text-sm text-muted-foreground">
                {support.description}
              </DialogDescription>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
