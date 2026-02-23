# Blacklist User Restrictions

This document outlines the access restrictions implemented for blacklisted users.

## Overview

Blacklisted users (`is_blacklisted: true`) have limited access to key features of the application. They cannot perform certain critical actions and must request access from administrators.

## Restricted Features

### 1. VPN Access (OpenVPN)
- **Location**: `/components/vpn-card.tsx`
- **Restriction**: Blacklisted users cannot create OpenVPN configurations
- **User Experience**:
  - Button to create VPN config is still visible
  - Clicking the button opens a restricted access dialog
  - User can submit an access request with explanation

### 2. Test Service (UKK)
- **Location**: `/app/test/page.tsx`
- **Restriction**: Blacklisted users cannot access the test service
- **User Experience**:
  - Entire test page shows access restricted message
  - Large alert with "Request Access" button
  - Access request dialog with reason field

### 3. Learning Materials
- **Location**: 
  - `/app/learning/page.tsx` (Learning list page)
  - `/app/learning/[id]/page.tsx` (Learning detail page)
- **Restriction**: Blacklisted users cannot view learning materials
- **User Experience**:
  - List page shows access restricted message instead of content
  - Detail page shows access restricted message if accessed directly
  - "Request Access" button available on both pages
  - Access request dialog with reason field

## Restricted Access Dialog

### Component: `RestrictedAccessDialog`
- **Location**: `/components/restricted-access-dialog.tsx`
- **Props**:
  - `open` (boolean): Controls dialog visibility
  - `onOpenChange` (function): Callback to change dialog state
  - `featureName` (string): Name of the restricted feature (e.g., "VPN Access", "Test Service")

### Features:
- User can enter reason for access request
- Displays helpful message about admin review process
- Shows success confirmation after submission
- Integrates with backend API via `api.createAccessRequest(email, reason)`

## Access Request Flow

1. **Blacklisted user attempts to access restricted feature**
   - Sees access denied message
   - Sees "Request Access" button

2. **User clicks "Request Access"**
   - Restricted access dialog opens
   - User enters reason for request

3. **User submits request**
   - Request sent to backend via `POST /api/request-access`
   - Includes user email and reason
   - Success confirmation shown

4. **Admin reviews request**
   - Admin goes to Admin Panel → Access Requests tab
   - Can view pending, approved, and rejected requests
   - Can approve request via `PATCH /api/users/request-access/{request_id}`
   - User is unblocked after approval

## Files Modified

### Frontend Components:
- ✅ `/components/vpn-card.tsx` - Added blacklist check and dialog
- ✅ `/components/restricted-access-dialog.tsx` - New dialog component
- ✅ `/app/test/page.tsx` - Added blacklist check and message
- ✅ `/app/learning/page.tsx` - Added blacklist check and message
- ✅ `/app/learning/[id]/page.tsx` - Added blacklist check and message
- ✅ `/app/dashboard/page.tsx` - Already has dashboard alert (existing)
- ✅ `/app/blacklisted/page.tsx` - Dedicated blacklisted user page (existing)

### Backend Integration:
- ✅ `/lib/api.ts` - Access request methods
- ✅ `/lib/types.ts` - AccessRequest type definition
- ✅ `/lib/auth-context.tsx` - isBlacklisted flag exposure

## API Endpoints Used

### For Blacklisted Users:
```
POST /api/request-access
- Payload: { email: string, reason: string }
- Response: AccessRequest
```

### For Admins:
```
GET /api/users/request-access?status_filter=PENDING
- Response: AccessRequest[]

PATCH /api/users/request-access/{request_id}
- Payload: { action: "APPROVED" | "REJECTED", notes?: string }
- Response: AccessRequest
```

## Visual Indicators

### Blacklisted User Alerts:
- **Restricted access message**: Red/destructive color scheme
- **Alert icon**: AlertCircle icon in red
- **Action button**: Primary colored "Request Access" button
- **Info box**: Helpful text explaining the restriction

### Success State:
- **Dialog shows**: Green checkmark icon
- **Message**: "Request sent successfully"
- **Subtext**: "The administrators will review your request shortly"
- **Auto-close**: Dialog closes after 2 seconds

## Security Considerations

1. Access requests are tied to user email address
2. No authentication required for submitting access request from blacklisted account
3. Admin approval workflow prevents unauthorized access grants
4. Access request history maintained for audit trail
