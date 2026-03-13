# Swell — Attendance Management App

[🇯🇵 日本語](./README.md) | 🇺🇸 English

A browser and desktop app to replace Excel-based attendance tracking.

🔗 **[Open App](https://kintai-app-swell.vercel.app)**

---

## Features

### Authentication & Security

- **Email + password login** (Supabase Auth)
- **Role-based screens** (admin / leader / employee)
- **Tab-based screen control** (different UI based on selected tab)
- **Unauthorized login prevention** (employees are blocked from the admin tab)

### Employee Features

| Feature | Description |
|---|---|
| Clock in / Clock out | Select time with dropdowns and punch |
| Auto break calculation | 1 hour deducted when working hours exceed 6 |
| Manual break editing | Click cell to edit — work time recalculates automatically |
| Notes field | Click cell to add and save notes |
| Work type selection | Choose from: On-site / Remote / AM off / PM off / Full day off / Paid leave / Early leave |
| Monthly navigation | Switch months with ◀ ▶ buttons |
| Attendance CSV download | UTF-8 with BOM for Excel compatibility |
| Transportation expenses | Enter date, route, and amount |
| Receipt image attachment | Attach images, click to enlarge |
| ZIP download | Download CSV + receipt images as a ZIP file |
| Monthly submission | Submit attendance and transport together from the "Submit" tab |
| Weekend & holiday coloring | Sat = blue, Sun = pink, Holiday = orange |
| Light / Dark / Auto mode | Auto switches based on time of day |
| Mobile responsive | Works on smartphones |

### Leader Features

| Feature | Description |
|---|---|
| View team attendance | Browse team members' monthly attendance data |
| Approve / Reject | Approve submitted data and forward to admin, or reject with a reason |
| CSV download | Export selected employee/month as CSV |

### Admin Features

| Feature | Description |
|---|---|
| User management | View all users, change roles (admin / leader / employee) |
| Invite new users | Send invitation email by entering an email address |
| View all attendance | Select an employee and browse their monthly attendance |
| Final approval / Rejection | Approve or reject leader-approved submissions |
| Bulk CSV export | Download all employees' attendance and transport data at once |
| Payslip management | Upload PDFs and distribute to each employee |

---

## Login

Select "Employee" or "Admin" from the tab on the login screen, then enter your email and password.

> **Note:** If there is a trailing space in your password, login will fail. Double-check that no extra spaces have been entered.

| Tab Selected | Account Type | Screen Shown |
|---|---|---|
| Employee | Employee | Employee screen |
| Employee | Leader | Employee screen + "Team Approval" tab |
| Employee | Admin | Employee screen (admins can use the employee screen) |
| Admin | Admin | Admin screen |
| Admin | Employee | ❌ Login rejected |

---

## How to Use

### Clock In / Clock Out

1. Select the desired time using the dropdowns
2. Press the **Clock In** button
3. At the end of the day, repeat and press **Clock Out**
4. Break time and working hours are calculated automatically

> Punching is only available for the current month. Past and future months are read-only.

### Work Type Selection

- Click the **Work Type** dropdown in the table row and select an option — saved instantly
- Options: On-site / Remote / AM off / PM off / Full day off / Paid leave / Early leave

### Editing Notes & Break Time

- Click the **notes cell** in the table → type text → press Enter or "Confirm" to save
- Click the **break time cell** → enter time like `1:00` or `0:30` → confirm to save and recalculate work time

### Transportation Expenses

1. Attach a receipt image (optional)
2. Enter purchase date and amount (optional)
3. Enter date, departure, destination, and fare
4. Click **Add** to add to the list
5. At month end, click **Download CSV** or **ZIP (CSV + images)**

### Submitting Attendance & Transport

1. Open the **"Submit"** tab
2. Review the monthly summary (working days and transport total)
3. Press **📤 Submit** button
4. Editing is locked after submission
5. Once your leader approves, status changes to "Awaiting admin approval"
6. Once admin gives final approval, status shows "✅ Approved"
7. If rejected, the reason is shown — fix your data and resubmit

### 3-Level Approval Flow

```
Employee submits → Leader reviews & approves → Admin gives final approval
                    (can reject with reason)     (can reject with reason)
```

### Admin: View Attendance

1. Log in from the Admin tab
2. Open the **Attendance** tab
3. Select an employee from the dropdown
4. Switch months with ◀ ▶ to browse data
5. Click **Download** to export the selected employee/month as CSV
6. Click **Download All Employees** to bulk export everyone

---

## Tech Stack

| Item | Details |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Desktop | Tauri |
| Auth & DB | Supabase (PostgreSQL + Auth) |
| Server Logic | Supabase Edge Functions (Deno) |
| Deployment | Vercel |
| Holiday Data | @holiday-jp/holiday_jp |
| ZIP Generation | JSZip |

---

## Security Design

- **RLS (Row Level Security)**: Users can only read/write their own data
- **Edge Functions**: Admin operations (invite, delete) are processed server-side
- **Role validation**: Tab selection is verified against actual role on login
- **PII protection**: Employee number and name are stored in memory only, never in the database

---

## Run Locally

```bash
# Install dependencies
npm install

# Create .env file with your Supabase credentials
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# Start dev server (browser)
npm run dev

# Launch as desktop app (Tauri)
npx tauri dev
```
