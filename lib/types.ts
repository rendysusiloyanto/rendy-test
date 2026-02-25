// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface SetPasswordRequest {
  new_password: string
}

export interface UserResponse {
  email: string
  full_name: string
  class_name: string | null
  attendance_number: string | null
  role: string
  is_premium: boolean
  is_blacklisted: boolean
  id: string
  created_at: string
  updated_at: string
}

export interface UserUpdate {
  full_name?: string
  class_name?: string | null
  attendance_number?: string | null
  role?: string
  is_premium?: boolean
  is_blacklisted?: boolean
}

// Access Request types
export interface AccessRequest {
  id: string
  user_id: string
  user_email: string
  user_full_name: string
  message: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_at: string
  reviewed_at: string | null
}

// OpenVPN types
export interface VPNStatus {
  has_config: boolean
  message?: string
}

export interface VPNTraffic {
  bytes_received: number | null
  bytes_sent: number | null
  connected_since: string | null
}

// UKK types
export interface ProxmoxNodeCreate {
  host: string
  user: string
  password: string
}

export interface ProxmoxNodeResponse {
  id: string
  host: string
  user: string
  password: string
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string
  email: string
  total_score: number
  max_score: number
  percentage: number
  grade: string
  completed_at: string
}

// Learning types
export interface LearningCreate {
  title: string
  description?: string | null
  video_url?: string | null
  is_published: boolean
  is_premium?: boolean
}

export interface LearningUpdate {
  title?: string | null
  description?: string | null
  video_url?: string | null
  is_published?: boolean | null
  is_premium?: boolean
}

export interface LearningResponse {
  id: string
  title: string
  description: string | null
  video_url: string | null
  is_published: boolean
  is_premium?: boolean
  created_at: string
  updated_at: string
}

// Announcement types
export interface AnnouncementResponse {
  id: string
  title: string
  content: string | null
  attachment_filename: string | null
  has_attachment: boolean
  created_at: string
  updated_at: string
}

// UKK Test types
export interface TestStep {
  step: string
  label: string
  status: "checking" | "pass" | "fail" | "waiting"
  detail?: string | null
}

export interface TestResult {
  type: "progress" | "result" | "error"
  step?: string
  label?: string
  status?: "checking" | "pass" | "fail"
  detail?: string | null
  total_score?: number
  max_score?: number
  percentage?: number
  grade?: string
  results?: TestStep[]
  message?: string
}

// VPN WebSocket traffic
export interface VPNTrafficWs {
  bytes_received: number | null // Total upload
  bytes_sent: number | null // Total download
  connected_since: string | null
  cipher: string | null
  real_ip: string | null
  speed_in_bps: number | null // Upload speed in bps
  speed_in_kbps: number | null // Upload speed in kbps
  speed_out_bps: number | null // Download speed in bps
  speed_out_kbps: number | null // Download speed in kbps
}

// VPN Status (REST)
export interface VPNStatusResponse {
  has_config: boolean
  username: string | null
  ip: string | null
}

// Support/QRIS types
export interface SupportResponse {
  description: string | null
  image_url: string | null
}

// Premium request types (user: my request; admin: list item)
export interface PremiumRequest {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  message: string | null
  image_url: string | null
  created_at: string
  updated_at: string
  can_edit?: boolean
}

/** API response for GET /api/premium/request (wrapped in { request }) */
export interface MyPremiumRequestResponse {
  request: PremiumRequest
}

export interface PremiumRequestListItem {
  id: string
  user_id: string
  user_email: string
  user_full_name: string
  message: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface PremiumRequestReview {
  status: "APPROVED" | "REJECTED"
}

// Validation
export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface HTTPValidationError {
  detail: ValidationError[]
}
