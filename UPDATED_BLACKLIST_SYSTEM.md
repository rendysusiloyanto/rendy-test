# Updated Blacklist System - User Experience Changes

## Overview
Blacklisted users now remain on the normal dashboard experience with restricted feature access, instead of being redirected to a separate blacklisted page.

## Key Changes

### 1. Authentication & Routing
- **Removed**: Automatic redirect to `/blacklisted` page
- **Changed**: Auth guard no longer redirects blacklisted users
- **Result**: Blacklisted users see the dashboard like regular users

### 2. Dashboard Experience
- **Added**: `AccessRequestCard` component that appears only for blacklisted users
- **Location**: Top of dashboard, above welcome section
- **Content**: Shows account restriction status with "Request Access" button
- **Design**: Red/destructive color theme to indicate restricted status

### 3. Feature Access Restrictions
Blacklisted users see "Account Restricted" message when accessing:
- **VPN Config Creation**: Cannot create OpenVPN configs
- **Test Service**: Cannot access test page
- **Learning Materials**: Cannot view learning content

### 4. API Changes
- **Endpoint**: `https://ukk-api.jns23.cloud/api/request-access`
- **Authentication**: Bearer token (sent with request)
- **Field**: Changed from `reason` to `message`
- **Payload**: `{ message: string }`

### 5. Request Access Flow
1. User sees restriction message on dashboard card or feature page
2. Clicks "Request Access" button
3. Dialog opens with message field (not reason)
4. User enters message and submits
5. Request sent to backend with bearer token authentication
6. Confirmation message displayed

## Component Structure

### New Components
- `AccessRequestCard` - Dashboard card for blacklisted users
- `RestrictedAccessDialog` - Dialog for submitting access requests

### Updated Components
- `AuthGuard` - Removed blacklist redirect logic
- `Dashboard` - Uses AccessRequestCard instead of alert
- `LearningPage` - Shows restriction message
- `TestPage` - Shows restriction message
- `VpnCard` - Shows restriction message on create attempt

### Removed Components
- `BlacklistedUserAlert` - No longer needed

## User Permissions

### Blacklisted Users Can:
- View dashboard normally
- See account information
- Click on pages (Learning, Test) but see restriction message
- Attempt VPN creation but see dialog
- Submit access requests

### Blacklisted Users Cannot:
- Create OpenVPN configs
- Access test service
- Access learning materials
- Use other premium features

## Admin Approval Flow
- Access requests reviewed in admin panel
- Status: PENDING, APPROVED, REJECTED
- Endpoint: `PATCH /api/users/request-access/{request_id}`
- Admin can approve/deny with action field

## Technical Details

### API Method Signature
```typescript
async createAccessRequest(message: string): Promise<AccessRequest>
```

### Authorization
All access request submissions use bearer token authentication:
```
Authorization: Bearer <token>
```

### Response Type
```typescript
interface AccessRequest {
  id: string
  user_id: string
  user_email: string
  user_full_name: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  updated_at: string
}
```
