# Leave Management System - UI Guide

## ✅ Error Fixed

**Issue:** `LeaveRequest validation failed: createdAt: Path 'createdAt' is required`

**Solution:** Removed duplicate `createdAt` field from LeaveRequest schema since `timestamps: true` already provides it automatically.

---

## Where to Find Leave Management Features

### 1. **Employee View - Submit Leave Request**

**Location:** `/dashboard/team` or Employee Profile

**Features:**
- Submit new leave request
- View leave balance (Casual: 15 days, Emergency: 7 days)
- See pending/approved/rejected requests
- Cancel pending requests

**How to Use:**
1. Navigate to Team page or your profile
2. Click "Request Leave" button
3. Fill in:
   - Leave Type (Casual or Emergency)
   - Start Date
   - End Date
   - Reason
4. Submit
5. Admin gets notified

---

### 2. **Admin View - Approve/Reject Leaves**

**Location:** `/dashboard/team` (Admin Panel)

**Features:**
- See all pending leave requests
- Approve leave requests
- Reject leave requests (with optional reason)
- View all employees' leave history
- Track leave statistics

**How to Use:**
1. Navigate to Team page as Admin
2. See "Pending Leave Requests" section
3. For each request, you'll see:
   - Employee name
   - Leave type (Casual/Emergency)
   - Dates (Start - End)
   - Number of days
   - Reason
   - **Approve** button (green)
   - **Reject** button (red)
4. Click Approve or Reject
5. Employee gets notified

---

### 3. **Profile Page - Track Leave Balance**

**Location:** `/dashboard/profile` or `/dashboard/team/[username]`

**Features:**
- View leave statistics:
  - Casual Leave: X/15 days used
  - Emergency Leave: X/7 days used
  - Pending requests count
  - Approved requests count
  - Rejected requests count
- See leave history
- Submit new leave request

---

## Leave Management Workflow

### Employee Flow:
```
1. Employee → Submit Leave Request
   ↓
2. Status: Pending
   ↓
3. Admin gets notification
   ↓
4. Wait for admin action
   ↓
5a. Admin Approves → Status: Approved ✅
    Employee gets notification: "Leave approved"
   OR
5b. Admin Rejects → Status: Rejected ❌
    Employee gets notification: "Leave rejected - Reason: ..."
```

### Admin Flow:
```
1. Admin receives notification
   ↓
2. Go to Team page
   ↓
3. See pending leave requests
   ↓
4. Review request details
   ↓
5. Click "Approve" or "Reject"
   ↓
6. Employee gets notified
   ↓
7. Leave status updated
```

---

## Functions Available

### For Employees:
- `submitLeaveRequest()` - Submit new leave
- `cancelLeaveRequest()` - Cancel pending leave
- `getLeaveRequests(userId)` - View your leaves
- `getEmployeeLeaveStats(userId)` - Check leave balance

### For Admins:
- `approveLeaveRequest(leaveId)` - Approve leave
- `rejectLeaveRequest(leaveId, reason)` - Reject with reason
- `getLeaveRequests()` - View all leaves
- `getEmployeeLeaveStats(userId)` - Check any employee's balance

---

## Leave Rules (Standard Office System)

### Casual Leave:
- **Allowance:** 15 days per year
- **Max per request:** 15 days
- **Use case:** Planned personal time off
- **Approval:** Requires admin approval

### Emergency Leave:
- **Allowance:** 7 days per year
- **Max per request:** 7 days
- **Use case:** Urgent/unexpected situations
- **Approval:** Requires admin approval

### General Rules:
- ✅ No backdated requests (start date must be today or future)
- ✅ End date must be after start date
- ✅ Only pending requests can be cancelled
- ✅ Approved/Rejected requests cannot be modified
- ✅ Leave balance resets every year
- ✅ All actions are logged in activity feed
- ✅ Automatic notifications for all parties

---

## Notifications

### Employee Receives:
- ✅ Leave approved notification
- ❌ Leave rejected notification (with reason)
- 📝 Admin cancelled your leave (if admin cancels)

### Admin Receives:
- 📬 New leave request submitted
- 🔔 Employee cancelled their leave request

---

## UI Components Needed

### 1. Team Page (`/dashboard/team`)

**For Employees:**
```tsx
<div className="leave-section">
  <h2>My Leave Balance</h2>
  <div className="leave-stats">
    <div>Casual: {casualUsed}/15 days</div>
    <div>Emergency: {emergencyUsed}/7 days</div>
  </div>
  
  <button onClick={openLeaveRequestModal}>
    Request Leave
  </button>
  
  <div className="my-leave-requests">
    {/* List of user's leave requests */}
  </div>
</div>
```

**For Admins:**
```tsx
<div className="admin-leave-section">
  <h2>Pending Leave Requests</h2>
  
  {pendingLeaves.map(leave => (
    <div key={leave.id} className="leave-request-card">
      <div className="employee-info">
        <h3>{employeeName}</h3>
        <span>{leave.type} Leave</span>
      </div>
      
      <div className="leave-details">
        <p>From: {leave.startDate}</p>
        <p>To: {leave.endDate}</p>
        <p>Days: {calculateDays(leave)}</p>
        <p>Reason: {leave.reason}</p>
      </div>
      
      <div className="actions">
        <button 
          onClick={() => approveLeaveRequest(leave.id)}
          className="approve-btn"
        >
          ✅ Approve
        </button>
        
        <button 
          onClick={() => openRejectModal(leave.id)}
          className="reject-btn"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  ))}
</div>
```

### 2. Leave Request Modal

```tsx
<Modal title="Request Leave">
  <form onSubmit={handleSubmit}>
    <select name="type" required>
      <option value="Casual">Casual Leave</option>
      <option value="Emergency">Emergency Leave</option>
    </select>
    
    <input 
      type="date" 
      name="startDate" 
      min={today}
      required 
    />
    
    <input 
      type="date" 
      name="endDate" 
      min={startDate}
      required 
    />
    
    <textarea 
      name="reason" 
      placeholder="Reason for leave"
      required
    />
    
    <button type="submit">Submit Request</button>
  </form>
</Modal>
```

### 3. Reject Modal

```tsx
<Modal title="Reject Leave Request">
  <form onSubmit={handleReject}>
    <textarea 
      name="reason" 
      placeholder="Reason for rejection (optional)"
    />
    
    <button type="submit">Confirm Rejection</button>
  </form>
</Modal>
```

---

## Example Usage in Code

### Submit Leave (Employee):
```typescript
const handleSubmitLeave = async (formData) => {
  try {
    await submitLeaveRequest({
      userId: currentUser.id,
      startDate: formData.startDate,
      endDate: formData.endDate,
      type: formData.type,
      reason: formData.reason
    });
    
    toast.success("Leave request submitted!");
  } catch (error) {
    toast.error(error.message);
  }
};
```

### Approve Leave (Admin):
```typescript
const handleApprove = async (leaveId) => {
  try {
    await approveLeaveRequest(leaveId);
    toast.success("Leave approved!");
  } catch (error) {
    toast.error(error.message);
  }
};
```

### Reject Leave (Admin):
```typescript
const handleReject = async (leaveId, reason) => {
  try {
    await rejectLeaveRequest(leaveId, reason);
    toast.success("Leave rejected");
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## Summary

**The leave management system is now fully functional!**

✅ **Backend:** All functions implemented  
✅ **Validation:** Date checks, leave limits, permissions  
✅ **Notifications:** Automatic for all actions  
✅ **Activity Logs:** All actions tracked  
✅ **Error Fixed:** MongoDB schema corrected  

**Next Step:** Implement the UI components in your Team page to display the approve/reject buttons and leave request forms!
