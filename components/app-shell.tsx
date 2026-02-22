"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Shield,
  LogOut,
  Menu,
  Server,
  Key,
  FlaskConical,
} from "lucide-react"
import { useState, type ReactNode } from "react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Learning", href: "/learning", icon: BookOpen },
  { name: "Test", href: "/test", icon: FlaskConical },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
]

const adminNav = [
  { name: "Admin Panel", href: "/admin", icon: Shield },
]

function NavLinks({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string
  isAdmin: boolean
  onNavigate?: () => void
}) {
  return (
    <>
      {navigation.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
      {isAdmin &&
        adminNav.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-background border-border p-4">
              <div className="flex items-center gap-2 mb-6">
                <Server className="h-5 w-5 text-primary" />
                <span className="font-mono text-sm font-bold text-foreground">
                  UKK Lab
                </span>
              </div>
              <nav className="flex flex-col gap-1">
                <NavLinks
                  pathname={pathname}
                  isAdmin={isAdmin}
                  onNavigate={() => setMobileOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <span className="font-mono text-sm font-bold text-foreground hidden sm:inline">
              UKK Lab
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <NavLinks pathname={pathname} isAdmin={isAdmin} />
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-mono">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm text-foreground">
                  {user?.full_name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card border-border"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="mt-1 flex gap-1.5">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
                    {user?.role}
                  </span>
                  {user?.is_premium && (
                    <span className="inline-flex items-center rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-warning">
                      premium
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 text-foreground cursor-pointer">
                  <Key className="h-4 w-4" />
                  Change Password
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
