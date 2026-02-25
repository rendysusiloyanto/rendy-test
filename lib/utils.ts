import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format as dateFnsFormat, formatDistanceToNow, type FormatDistanceToNowOptions } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns a valid Date or null if input is missing/invalid. */
function parseDate(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Safe format: returns fallback for null/invalid dates. */
export function safeFormat(
  value: string | null | undefined,
  formatStr: string,
  fallback = '--'
): string {
  const d = parseDate(value)
  return d ? dateFnsFormat(d, formatStr) : fallback
}

/** Safe formatDistanceToNow: returns fallback for null/invalid dates. */
export function safeFormatDistanceToNow(
  value: string | null | undefined,
  options?: FormatDistanceToNowOptions & { addSuffix?: boolean },
  fallback = '--'
): string {
  const d = parseDate(value)
  return d ? formatDistanceToNow(d, options) : fallback
}
