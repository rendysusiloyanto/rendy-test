"use client"

import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminNodes } from "@/components/admin/admin-nodes"
import { AdminLearning } from "@/components/admin/admin-learning"
import { AdminAnnouncements } from "@/components/admin/admin-announcements"
import { AdminUsers } from "@/components/admin/admin-users"
import { AdminAccessRequests } from "@/components/admin/admin-access-requests"
import { AdminSupport } from "@/components/admin/admin-support"
import { Server, BookOpen, Megaphone, Users, Clock, QrCode } from "lucide-react"

function AdminContent() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform resources and content
          </p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger
              value="access-requests"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground"
            >
              <Clock className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Access Requests</span>
            </TabsTrigger>
            <TabsTrigger
              value="nodes"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground"
            >
              <Server className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nodes</span>
            </TabsTrigger>
            <TabsTrigger
              value="learning"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Learning</span>
            </TabsTrigger>
            <TabsTrigger
              value="announcements"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground"
            >
              <Megaphone className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
            <TabsTrigger
              value="support"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground"
            >
              <QrCode className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">QRIS</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6">
            <AdminUsers />
          </TabsContent>
          <TabsContent value="access-requests" className="mt-6">
            <AdminAccessRequests />
          </TabsContent>
          <TabsContent value="nodes" className="mt-6">
            <AdminNodes />
          </TabsContent>
          <TabsContent value="learning" className="mt-6">
            <AdminLearning />
          </TabsContent>
          <TabsContent value="announcements" className="mt-6">
            <AdminAnnouncements />
          </TabsContent>
          <TabsContent value="support" className="mt-6">
            <AdminSupport />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  )
}
