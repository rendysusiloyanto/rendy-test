"use client"

import axios, { type AxiosError } from "axios"
import { ApiError } from "./api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

export const axiosClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
})

axiosClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string | { message?: string; remaining_today?: number }; remaining_today?: number }>) => {
    const status = err.response?.status
    const data = err.response?.data
    const message = typeof data?.detail === "string" ? data.detail : data?.detail?.message ?? err.message

    if (status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login"
      return Promise.reject(new ApiError(401, "Unauthorized", data))
    }

    if (status === 403) {
      return Promise.reject(new ApiError(403, message || "Premium required", data))
    }

    return Promise.reject(new ApiError(status || 500, message || "Request failed", data))
  }
)
