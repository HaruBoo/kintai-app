# Swell — Attendance Management App

[🇯🇵 日本語](./README.md) | 🇺🇸 English

A browser and desktop app to replace Excel-based attendance tracking.

## Features

- **Clock in / Clock out** (select time with dropdowns)
- **Automatic break time calculation** (1 hour deducted when working hours exceed 6)
- **Monthly data management** (switch months, data saved per month)
- **Transportation expense tracking** (date, route, and amount)
- **CSV download** (UTF-8 with BOM for Excel compatibility)
- **Weekend & holiday row coloring** (Japanese holidays supported)
- **Light / Dark / Auto color mode**
- **Mobile responsive design**
- **Privacy-first design** (employee number and name are stored in memory only, never in LocalStorage)

---

## How to Use

### 1. Enter Your Profile

Enter your employee number and name in the fields at the top of the screen.

- The employee number is masked by default (click 👁 to reveal)
- Your information is held in memory only — **it is cleared when you close the page**
- Nothing is saved to LocalStorage or the URL

### 2. Clock In / Clock Out

1. Select the desired time using the dropdowns
2. Press the **Clock In** button
3. At the end of the day, repeat and press **Clock Out**
4. Break time and working hours are calculated automatically

> Punching is only available for the current month. Past and future months are read-only.

### 3. View and Edit Records

- Click a date in the table to edit it
- Use the **Delete** button on the right to remove a row (confirmation required)

### 4. Switch Months

Use the ◀ ▶ buttons at the top to navigate between months. Data is saved automatically per month.

### 5. Download Attendance CSV

Click **Download** in the upper right of the table.

You can choose how personal information is included:

| Option | Description |
|---|---|
| Exclude (default) | Download without employee number or name |
| Mask number | Include employee number masked (e.g. `1***5`) |
| Include | Include full employee number and name |

> After downloading, the option automatically resets to "Exclude"

### 6. Transportation Expenses

Switch to the **Transportation** tab in the top navigation.

1. Enter the date, departure, destination, and amount
2. Click **Add** to add to the list
3. At month end, click **Download** to export as CSV

### 7. Color Mode

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
| Holiday Data | @holiday-jp/holiday_jp |
| Data Storage | localStorage (per month, PII excluded) |

## Privacy Design Policy

- Employee number and name are held in **React state (memory) only**
- **Never written** to `localStorage`, `sessionStorage`, or URL params
- All PII operations are centralized in `src/services/profileService.ts`
- PII input UI is isolated to `src/components/ProfileSection.tsx`
- CSV export policy is managed in `src/components/CsvExport.tsx`

---

## Run Locally

```bash
# Install dependencies
npm install

# Start dev server (browser)
npm run dev

# Launch as desktop app (Tauri)
npx tauri dev
```
