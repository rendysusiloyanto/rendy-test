# Blacklist User Access Control System

## Overview
This document describes the implementation of a blacklist user access control system with access request functionality. The system allows administrators to blacklist users and restrict their access to platform features while allowing users to request access through an automated process.

## Features Implemented

### 1. User Blacklist Status
- **Database Field**: `is_blacklisted` boolean field added to UserResponse
- **Frontend Types**: Updated `lib/types.ts` to include `is_blacklisted` in UserResponse and UserUpdate interfaces

### 2. Access Request System
- **New Type**: `AccessRequest` interface with fields:
  - `id`: Unique request identifier
  - `user_id`: User requesting access
  - `user_email`: User's email for reference
  - `user_full_name`: User's full name for reference
  - `reason`: Text reason for the access request
  - `status`: 'pending' | 'approved' | 'denied'
  - `created_at`: Request creation timestamp
  - `updated_at`: Last update timestamp

### 3. Authentication & Authorization
- **Auth Context**: Enhanced `lib/auth-context.tsx` to expose `isBlacklisted` flag
- **Auth Guard**: Updated to check blacklist status and redirect to `/blacklisted` page
  - Added `allowBlacklisted` prop to bypass blacklist restriction (used for blacklisted page)

### 4. API Methods
Added new API client methods in `lib/api.ts`:
- `listAccessRequests()`: Fetch all access requests (admin only)
- `createAccessRequest(reason)`: Submit access request (by blacklisted user)
- `approveAccessRequest(requestId)`: Approve request (admin only)
- `denyAccessRequest(requestId)`: Deny request (admin only)

### 5. Blacklisted User Page
**File**: `/app/blacklisted/page.tsx`
- Dedicated page displayed when blacklisted users access the platform
- Shows account information (name, email, status)
- Provides form to submit access request with reason
- Displays confirmation message when request is sent
- Users can explain why they should regain access

### 6. Admin Access Requests Management
**File**: `/components/admin/admin-access-requests.tsx`
- Displays access requests organized by status (Pending, Approved, Denied)
- Shows request count badges for each status
- View dialog with full request details
- Approve/Deny buttons for pending requests
- Visual status indicators with icons and colored badges

### 7. Admin User Management Updates
**File**: `/components/admin/admin-users.tsx`
- Blacklist toggle in user edit dialog
- Visual blacklist indicator on user cards:
  - Red alert icon for blacklisted users
  - Special background color for blacklisted user cards
  - "blacklisted" badge in user info
- Search and filter functionality

### 8. Admin Panel Integration
**File**: `/app/admin/page.tsx`
- Added "Access Requests" tab with Clock icon
- Tab positioned after Users for easy access
- Displays AdminAccessRequests component

### 9. Dashboard Integration
**File**: `/app/dashboard/page.tsx`
- Added BlacklistedUserAlert component
- Shows popup alert when blacklisted user opens dashboard
- Explains their status and access options
- Alert only appears once per session

### 10. Blacklist Alert Component
**File**: `/components/blacklisted-user-alert.tsx`
- Dialog-based alert for blacklisted users
- Friendly explanation of restrictions
- Lists what actions are available (view info, request access)
- Information about admin review process

## User Flows

### For Blacklisted Users:
1. User logs in successfully
2. Auth guard checks `is_blacklisted` status
3. User redirected to `/blacklisted` page instead of dashboard
4. Alert popup shows explaining the situation
5. User can submit access request with reason
6. Admin reviews and approves/denies request
7. Once approved, user regains access on next login

### For Administrators:
1. Access admin panel
2. Go to "Access Requests" tab
3. View pending requests with user details
4. Click request to see full reason
5. Approve to remove blacklist and grant access
6. Deny to keep restrictions
7. See history of approved/denied requests
8. Can also set blacklist status from Users tab

## Database Changes Required
The backend API needs to:
1. Add `is_blacklisted` boolean column to users table (default: false)
2. Create `access_requests` table with the fields mentioned above
3. Implement endpoints for access request management
4. Update user role validation to accept 'ADMIN', 'STUDENT', or 'GUEST' (not 'user')

## Error Handling
- Login page improved to handle role validation errors gracefully
- API error messages provide clear feedback about invalid roles
- Access request submission includes validation for empty reasons
- Loading states for async operations

## Security Considerations
- Only admins can view and manage access requests
- Only blacklisted users can submit requests
- Blacklisted status is checked on every auth refresh
- Request reasons are validated to prevent empty submissions
- Status transitions are controlled server-side

## Frontend Routes
- `/blacklisted` - Blacklisted user restricted page
- `/admin` - Admin panel with access requests tab (admin only)
- `/dashboard` - Main dashboard (redirects to /blacklisted if user is blacklisted)

## Files Modified/Created

### Created:
- `/app/blacklisted/page.tsx` - Blacklisted user page
- `/components/admin/admin-access-requests.tsx` - Admin access requests management
- `/components/blacklisted-user-alert.tsx` - Alert dialog for blacklisted users

### Modified:
- `/lib/types.ts` - Added is_blacklisted and AccessRequest types
- `/lib/api.ts` - Added access request API methods
- `/lib/auth-context.tsx` - Added isBlacklisted flag
- `/components/auth-guard.tsx` - Added blacklist redirect logic
- `/components/admin/admin-users.tsx` - Added blacklist toggle and indicators
- `/app/admin/page.tsx` - Added access requests tab
- `/app/dashboard/page.tsx` - Added alert component
- `/app/login/page.tsx` - Improved error handling

## Testing Checklist
- [ ] Login with non-blacklisted user → Dashboard
- [ ] Login with blacklisted user → /blacklisted page with alert
- [ ] Blacklisted user submits access request → Success toast
- [ ] Admin views access requests → See pending/approved/denied
- [ ] Admin approves request → User can login to dashboard
- [ ] Admin denies request → User still restricted
- [ ] Admin toggles blacklist on user → Immediate effect on next login
- [ ] Search and filter users → Shows blacklist badges
