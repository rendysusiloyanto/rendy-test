"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import type { ProxmoxNodeResponse } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Server, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export function AdminNodes() {
  const [nodes, setNodes] = useState<ProxmoxNodeResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [host, setHost] = useState("")
  const [user, setUser] = useState("root")
  const [password, setPassword] = useState("")

  const fetchNodes = useCallback(async () => {
    try {
      const data = await api.listNodes()
      setNodes(data)
    } catch {
      toast.error("Failed to load nodes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNodes()
  }, [fetchNodes])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!host || !password) {
      toast.error("Host and password are required")
      return
    }
    setCreating(true)
    try {
      await api.createNode({ host, user, password })
      toast.success("Node added successfully")
      setHost("")
      setUser("root")
      setPassword("")
      setDialogOpen(false)
      fetchNodes()
    } catch {
      toast.error("Failed to create node")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNode(id)
      toast.success("Node deleted")
      fetchNodes()
    } catch {
      toast.error("Failed to delete node")
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
            Proxmox Nodes
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage Proxmox server connections
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Node
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Proxmox Node</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Host</Label>
                <Input
                  placeholder="192.168.1.100:8006"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">User</Label>
                <Input
                  placeholder="root"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <Button
                type="submit"
                disabled={creating}
                className="w-full bg-primary text-primary-foreground"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Node
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {nodes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Server className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No Proxmox nodes configured
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">
              {nodes.length} Node{nodes.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Host</TableHead>
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-muted-foreground w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.id} className="border-border hover:bg-accent/50">
                    <TableCell>
                      <span className="font-mono text-sm text-foreground">
                        {node.host}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{node.user}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(node.created_at), "dd MMM yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">
                              Delete Node?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              This will remove the Proxmox node {node.host}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border text-foreground">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(node.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
