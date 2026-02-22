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
      .then(setEntries)
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
          <>
            {/* Top 3 cards (mobile & desktop) */}
            {entries.length >= 1 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {entries.slice(0, 3).map((entry) => (
                  <Card
                    key={entry.user_id}
                    className={`border-border bg-card ${
                      entry.rank === 1 ? "sm:order-2 ring-1 ring-warning/20" : entry.rank === 2 ? "sm:order-1" : "sm:order-3"
                    }`}
                  >
                    <CardContent className="flex flex-col items-center gap-2 py-5">
                      {getRankDisplay(entry.rank)}
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {entry.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${getGradeColor(entry.grade)}`}
                        >
                          {entry.grade}
                        </Badge>
                        <span className="text-sm font-mono font-bold text-foreground">
                          {entry.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(entry.completed_at), "dd MMM yyyy HH:mm")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Full table */}
            {entries.length > 3 && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground">
                    All Rankings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground w-16">Rank</TableHead>
                          <TableHead className="text-muted-foreground">Student</TableHead>
                          <TableHead className="text-muted-foreground text-right">Score</TableHead>
                          <TableHead className="text-muted-foreground text-center">Grade</TableHead>
                          <TableHead className="text-muted-foreground text-right hidden sm:table-cell">
                            Completed
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow
                            key={entry.user_id}
                            className="border-border hover:bg-accent/50"
                          >
                            <TableCell>
                              {getRankDisplay(entry.rank)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {entry.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {entry.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-mono font-medium text-foreground">
                                {entry.total_score}/{entry.max_score}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({entry.percentage.toFixed(1)}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs ${getGradeColor(entry.grade)}`}
                              >
                                {entry.grade}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground font-mono hidden sm:table-cell">
                              {format(
                                new Date(entry.completed_at),
                                "dd MMM yyyy HH:mm"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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
