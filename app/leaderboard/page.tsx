"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { LeaderboardEntry } from "@/lib/types"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Loader2, Medal, Clock } from "lucide-react"
import { format } from "date-fns"

function getGradeColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case "A":
      return "border-success/30 bg-success/10 text-success"
    case "B":
      return "border-primary/30 bg-primary/10 text-primary"
    case "C":
      return "border-warning/30 bg-warning/10 text-warning"
    default:
      return "border-muted-foreground/30 bg-muted text-muted-foreground"
  }
}

function getRankDisplay(rank: number) {
  if (rank === 1) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/10 border border-warning/30">
        <Trophy className="h-3.5 w-3.5 text-warning" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted-foreground/10 border border-muted-foreground/20">
        <Medal className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-chart-5/10 border border-chart-5/20">
        <Medal className="h-3.5 w-3.5 text-chart-5" />
      </div>
    )
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center">
      <span className="text-sm font-mono text-muted-foreground">{rank}</span>
    </div>
  )
}

function LeaderboardContent() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getLeaderboard()
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (b.percentage !== a.percentage) return b.percentage - a.percentage
          return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
        })
        const ranked = sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }))
        setEntries(ranked)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Students who passed the competency test (score {">="} 70%)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Trophy className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  No entries yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Be the first to complete the competency test!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent bg-muted/30">
                      <TableHead className="text-muted-foreground text-xs font-semibold w-12 h-10">Rank</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold h-10">Name</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold text-right h-10">Grade</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold text-right h-10">Score</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold text-right h-10">Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, idx) => (
                      <TableRow
                        key={entry.user_id}
                        className={`border-border h-10 ${
                          entry.rank === 1 ? "bg-warning/5" : entry.rank === 2 ? "bg-muted-foreground/3" : entry.rank === 3 ? "bg-chart-5/3" : ""
                        } hover:bg-accent/30`}
                      >
                        <TableCell className="text-xs font-semibold py-0 px-4">
                          {getRankDisplay(entry.rank)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground py-0 px-3">
                          {entry.full_name}
                        </TableCell>
                        <TableCell className="text-right py-0 px-3">
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs px-2 ${getGradeColor(entry.grade)}`}
                          >
                            {entry.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-semibold text-foreground py-0 px-3">
                          {entry.percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground font-mono py-0 px-3 whitespace-nowrap">
                          {format(new Date(entry.completed_at), "dd MMM HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

export default function LeaderboardPage() {
  return (
    <AuthGuard>
      <LeaderboardContent />
    </AuthGuard>
  )
}
