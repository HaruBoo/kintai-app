# Swell — Attendance Management App

[🇯🇵 日本語](./README.md) | 🇺🇸 English

A browser and desktop app to replace Excel-based attendance tracking.

🔗 **[Open App](https://kintai-app-henna.vercel.app)**

## Features

- **Login authentication** (email + password via Supabase Auth)
- **Role-based screens** (admin / employee)
- **Clock in / Clock out** (select time with dropdowns)
- **Automatic break time calculation** (1 hour deducted when working hours exceed 6)
- **Monthly data management** (switch months, data saved per month)
- **Transportation expense tracking** (date, route, and amount)
- **Receipt image attachment** (download as ZIP)
- **CSV download** (UTF-8 with BOM for Excel compatibility)
- **Weekend & holiday row coloring** (Japanese holidays supported)
- **Light / Dark / Auto color mode**
- **Mobile responsive design**
- **Privacy-first design** (employee number and name stored in memory only)

### Admin Features

- **User management** (invite users, change roles)
- **Attendance overview** (view all employees)
- **Payslip management** (attach files, set destination email, notes, comments)

---

## How to Use

### 1. Login

Select "Employee" or "Admin" from the tab on the login screen, then enter your email and password.

| Tab Selected | Account Type | Screen Shown |
|---|---|---|
| Employee | Employee | Employee screen |
| Employee | Admin | Employee screen (admins can use the employee screen) |
| Admin | Admin | Admin screen |
| Admin | Employee | ❌ Login rejected |

> Admin accounts can also log in from the "Employee" tab. In that case, the employee screen is shown.

### 2. Clock In / Clock Out

1. Select the desired time using the dropdowns
2. Press the **Clock In** button
3. At the end of the day, repeat and press **Clock Out**
4. Break time and working hours are calculated automatically

> Punching is only available for the current month. Past and future months are read-only.

### 3. Switch Months

Use the ◀ ▶ buttons at the top to navigate between months. Data is saved automatically per month.

### 4. Download Attendance CSV

Click **Download** in the upper right of the table.

### 5. Transportation Expenses

Switch to the **Transportation** tab in the top navigation.

1. Enter the date, departure, destination, and amount
2. Attach a receipt image (optional)
3. Click **Add** to add to the list
4. At month end, click **Download** to export as CSV + images in a ZIP file

### 6. Color Mode

Use the buttons on the right side of the navigation bar:

- ☀️ Light — Always bright
- 🌓 Auto — Light from 6:00–18:00, dark otherwise
- 🌙 Dark — Always dark

---

## Tech Stack

| Item | Details |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Desktop | Tauri |
| Auth & DB | Supabase |
| Server Logic | Supabase Edge Functions |
| Deployment | Vercel |
| Holiday Data | @holiday-jp/holiday_jp |

## Privacy Design Policy

- Employee number and name are held in **React state (memory) only**
- **Never written** to `localStorage`, `sessionStorage`, or URL params
- All PII operations are centralized in `src/services/profileService.ts`
- PII input UI is isolated to `src/components/ProfileSection.tsx`

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
