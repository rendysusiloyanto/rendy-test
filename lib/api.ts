import type {
  LoginRequest,
  TokenResponse,
  UserResponse,
  SetPasswordRequest,
  ProxmoxNodeCreate,
  ProxmoxNodeResponse,
  LeaderboardEntry,
  LearningCreate,
  LearningUpdate,
  LearningResponse,
  LearningVideoStreamUrlResponse,
  AnnouncementResponse,
  AccessRequest,
  SupportResponse,
  PremiumRequest,
  PremiumRequestListItem,
  PremiumRequestReview,
  MyPremiumRequestResponse,
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  }

  private headers(auth = false): HeadersInit {
    const h: HeadersInit = { "Content-Type": "application/json" }
    if (auth) {
      const token = this.getToken()
      if (token) h["Authorization"] = `Bearer ${token}`
    }
    return h
  }

  private authHeaders(): HeadersInit {
    const token = this.getToken()
    const h: HeadersInit = {}
    if (token) h["Authorization"] = `Bearer ${token}`
    return h
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    // Handle full URLs (starting with http/https)
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
    const res = await fetch(fullUrl, init)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(res.status, body?.detail || res.statusText, body)
    }
    const text = await res.text()
    return text ? JSON.parse(text) : ({} as T)
  }

  private async requestOptional<T>(url: string, init?: RequestInit): Promise<T | null> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
    const res = await fetch(fullUrl, init)
    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(res.status, body?.detail || res.statusText, body)
    }
    const text = await res.text()
    return text ? JSON.parse(text) : ({} as T)
  }

  // Auth
  async login(data: LoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>("/api/auth/login", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(data),
    })
  }

  getGoogleLoginUrl(): string {
    return `${API_BASE}/api/auth/google/login`
  }

  async getMe(): Promise<UserResponse> {
    return this.request<UserResponse>("/api/auth/me", {
      headers: this.headers(true),
    })
  }

  async setPassword(data: SetPasswordRequest): Promise<void> {
    await this.request("/api/auth/me/password", {
      method: "PUT",
      headers: this.headers(true),
      body: JSON.stringify(data),
    })
  }

  // OpenVPN
  async getVpnStatus(): Promise<{ has_config: boolean; message?: string }> {
    return this.request("/api/openvpn/status", {
      headers: this.headers(true),
    })
  }

  async createVpnConfig(): Promise<{ message: string }> {
    return this.request("/api/openvpn/create", {
      method: "POST",
      headers: this.headers(true),
    })
  }

  async downloadVpnConfig(): Promise<Blob> {
    const token = this.getToken()
    const res = await fetch(`${API_BASE}/api/openvpn/config`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to download config")
    return res.blob()
  }

  // VPN traffic is handled via WebSocket: /api/openvpn/traffic/ws?token=...
  // UKK test is handled via WebSocket: /api/ukk/test/ws

  // UKK Nodes
  async listNodes(): Promise<ProxmoxNodeResponse[]> {
    return this.request("/api/ukk/nodes", {
      headers: this.headers(true),
    })
  }

  async createNode(data: ProxmoxNodeCreate): Promise<ProxmoxNodeResponse> {
    return this.request("/api/ukk/nodes", {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify(data),
    })
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.request(`/api/ukk/nodes/${nodeId}`, {
      method: "DELETE",
      headers: this.headers(true),
    })
  }

  // Leaderboard
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.request("/api/ukk/leaderboard")
  }

  // Learning
  async listLearnings(publishedOnly = true): Promise<LearningResponse[]> {
    return this.request(
      `/api/learning?published_only=${publishedOnly}`,
      {
        headers: this.headers(true),
      }
    )
  }

  async adminListLearnings(): Promise<LearningResponse[]> {
    return this.request("/api/learning/admin", {
      headers: this.headers(true),
    })
  }

  async getLearning(id: string): Promise<LearningResponse> {
    return this.request(`/api/learning/${id}`, {
      headers: this.headers(true),
    })
  }

  async createLearning(form: {
    title: string
    description?: string | null
    content?: string | null
    is_published: boolean
    is_premium?: boolean
    thumbnail_url?: string | null
    video_url?: string | null
    thumbnail?: File | null
    video?: File | null
  }): Promise<LearningResponse> {
    const fd = new FormData()
    fd.append("title", form.title)
    fd.append("is_published", String(form.is_published))
    if (form.description != null && form.description !== "") fd.append("description", form.description)
    if (form.content != null && form.content !== "") fd.append("content", form.content)
    if (form.is_premium) fd.append("is_premium", "true")
    if (form.thumbnail_url != null && form.thumbnail_url !== "") fd.append("thumbnail_url", form.thumbnail_url)
    if (form.video_url != null && form.video_url !== "") fd.append("video_url", form.video_url)
    if (form.thumbnail) fd.append("thumbnail", form.thumbnail)
    if (form.video) fd.append("video", form.video)
    return this.request("/api/learning", {
      method: "POST",
      headers: this.authHeaders(),
      body: fd,
    })
  }

  async updateLearning(
    id: string,
    form: {
      title?: string | null
      description?: string | null
      content?: string | null
      is_published?: boolean | null
      is_premium?: boolean
      thumbnail_url?: string | null
      video_url?: string | null
      thumbnail?: File | null
      video?: File | null
    }
  ): Promise<LearningResponse> {
    const fd = new FormData()
    if (form.title != null) fd.append("title", form.title)
    if (form.description != null) fd.append("description", form.description)
    if (form.content != null) fd.append("content", form.content)
    if (form.is_published != null) fd.append("is_published", String(form.is_published))
    if (form.is_premium != null) fd.append("is_premium", String(form.is_premium))
    if (form.thumbnail_url != null) fd.append("thumbnail_url", form.thumbnail_url)
    if (form.video_url != null) fd.append("video_url", form.video_url)
    if (form.thumbnail) fd.append("thumbnail", form.thumbnail)
    if (form.video) fd.append("video", form.video)
    return this.request(`/api/learning/${id}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: fd,
    })
  }

  getLearningThumbnailUrl(learningId: string): string {
    return `${API_BASE}/api/learning/${encodeURIComponent(learningId)}/thumbnail`
  }

  async getLearningVideoStreamUrl(learningId: string): Promise<LearningVideoStreamUrlResponse> {
    return this.request(`/api/learning/${learningId}/video-stream-url`, {
      headers: this.headers(true),
    })
  }

  /** Fetch stream with Bearer token; use when auth_required is true (e.g. premium video). */
  async fetchStreamBlob(streamPathOrUrl: string): Promise<Blob> {
    const url = streamPathOrUrl.startsWith("http") ? streamPathOrUrl : `${API_BASE}${streamPathOrUrl}`
    const token = this.getToken()
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(res.status, body?.detail || res.statusText, body)
    }
    return res.blob()
  }

  async deleteLearning(id: string): Promise<void> {
    await this.request(`/api/learning/${id}`, {
      method: "DELETE",
      headers: this.headers(true),
    })
  }

  // Announcements
  async listAnnouncements(): Promise<AnnouncementResponse[]> {
    return this.request("/api/announcements", {
      headers: this.headers(true),
    })
  }

  async adminListAnnouncements(): Promise<AnnouncementResponse[]> {
    return this.request("/api/announcements/admin", {
      headers: this.headers(true),
    })
  }

  async getAnnouncement(id: string): Promise<AnnouncementResponse> {
    return this.request(`/api/announcements/${id}`)
  }

  async createAnnouncement(formData: FormData): Promise<AnnouncementResponse> {
    return this.request("/api/announcements", {
      method: "POST",
      headers: this.authHeaders(),
      body: formData,
    })
  }

  async updateAnnouncement(
    id: string,
    formData: FormData
  ): Promise<AnnouncementResponse> {
    return this.request(`/api/announcements/${id}`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: formData,
    })
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.request(`/api/announcements/${id}`, {
      method: "DELETE",
      headers: this.headers(true),
    })
  }

  getAnnouncementAttachmentUrl(id: string): string {
    const token = this.getToken()
    return `${API_BASE}/api/announcements/${id}/attachment${token ? `?token=${token}` : ""}`
  }

  /** Fetch announcement attachment with Bearer auth (for viewer or download). */
  async getAnnouncementAttachmentBlob(id: string): Promise<Blob> {
    const url = `${API_BASE}/api/announcements/${encodeURIComponent(id)}/attachment`
    const res = await fetch(url, { headers: this.authHeaders() })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(res.status, body?.detail || res.statusText, body)
    }
    return res.blob()
  }

  // User Management
  async listUsers(): Promise<UserResponse[]> {
    return this.request("/api/users", {
      headers: this.headers(true),
    })
  }

  async updateUser(userId: string, data: Partial<UserResponse>): Promise<UserResponse> {
    return this.request(`/api/users/${userId}`, {
      method: "PATCH",
      headers: this.headers(true),
      body: JSON.stringify(data),
    })
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/api/users/${userId}`, {
      method: "DELETE",
      headers: this.headers(true),
    })
  }

  // Access Requests
  async createAccessRequest(message: string): Promise<AccessRequest> {
    return this.request("https://ukk-api.jns23.cloud/api/request-access", {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify({ message }),
    })
  }

  async listAccessRequests(statusFilter?: string): Promise<AccessRequest[]> {
    const params = statusFilter ? `?status_filter=${statusFilter}` : ""
    return this.request(`/api/users/request-access${params}`, {
      headers: this.headers(true),
    })
  }

  async reviewAccessRequest(requestId: string, status: "APPROVED" | "REJECTED", message?: string): Promise<AccessRequest> {
    return this.request(`/api/users/request-access/${requestId}`, {
      method: "PATCH",
      headers: this.headers(true),
      body: JSON.stringify({ body: message ?? "", status }),
    })
  }

  // Premium request (user)
  async getMyPremiumRequest(): Promise<PremiumRequest | null> {
    const data = await this.requestOptional<MyPremiumRequestResponse>("/api/premium/request", {
      headers: this.headers(true),
    })
    return data?.request ?? null
  }

  async submitPremiumRequest(file: File, message?: string): Promise<PremiumRequest> {
    const formData = new FormData()
    formData.append("file", file)
    if (message != null && message.trim() !== "") formData.append("message", message.trim())

    const data = await this.request<PremiumRequest | MyPremiumRequestResponse>("/api/premium/request", {
      method: "POST",
      headers: this.authHeaders(),
      body: formData,
    })
    return "request" in data && data.request ? data.request : (data as PremiumRequest)
  }

  /** Update my PENDING premium request (message and/or file). Only PENDING can be updated. */
  async updateMyPremiumRequest(message?: string, file?: File): Promise<PremiumRequest> {
    const formData = new FormData()
    if (message != null && message.trim() !== "") formData.append("message", message.trim())
    if (file) formData.append("file", file)

    const data = await this.request<PremiumRequest | MyPremiumRequestResponse>("/api/premium/request", {
      method: "PATCH",
      headers: this.authHeaders(),
      body: formData,
    })
    return "request" in data && data.request ? data.request : (data as PremiumRequest)
  }

  // Premium requests (admin)
  async adminListPremiumRequests(statusFilter?: string | null): Promise<PremiumRequestListItem[]> {
    const q = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : ""
    return this.request<PremiumRequestListItem[]>(`/api/premium/requests${q}`, {
      headers: this.headers(true),
    })
  }

  getPremiumRequestImageUrl(requestId: string): string {
    return `${API_BASE}/api/premium/requests/${encodeURIComponent(requestId)}/image`
  }

  async getPremiumRequestImageBlob(requestId: string, cacheBust?: string): Promise<Blob> {
    const q = cacheBust ? `?t=${encodeURIComponent(cacheBust)}` : ""
    const url = `${API_BASE}/api/premium/requests/${encodeURIComponent(requestId)}/image${q}`
    const res = await fetch(url, {
      headers: this.authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(res.status, body?.detail || res.statusText, body)
    }
    return res.blob()
  }

  async adminReviewPremiumRequest(requestId: string, data: PremiumRequestReview): Promise<PremiumRequestListItem> {
    return this.request<PremiumRequestListItem>(`/api/premium/requests/${requestId}`, {
      method: "PATCH",
      headers: this.headers(true),
      body: JSON.stringify(data),
    })
  }

  // Support/QRIS
  async getSupport(): Promise<SupportResponse> {
    return this.request("/api/support", {
      headers: this.headers(),
    })
  }

  async updateSupport(description?: string, file?: File): Promise<SupportResponse> {
    const formData = new FormData()
    if (description) formData.append("description", description)
    if (file) formData.append("file", file)

    return this.request("/api/support", {
      method: "PUT",
      headers: this.authHeaders(),
      body: formData,
    })
  }

  getSupportImageUrl(): string {
    return `${API_BASE}/api/support/image`
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const api = new ApiClient()
