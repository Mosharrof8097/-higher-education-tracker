# 🎓 Higher Education Tracker

A clean, professional, **100% free** web application for tracking your entire higher study journey — professor outreach, university research, deadlines, and personal study goals.

**Live on GitHub Pages · No login required · Data stays in your browser**

---

## ✨ Features

| Section | What you can do |
|---|---|
| 🏠 **Dashboard** | See summary stats and charts of your entire journey |
| 🔬 **Professor Outreach** | Track every professor with full CRUD, filters, and CSV export |
| 🏛️ **University Board** | Track applications, deadlines, requirements per university |
| ✅ **Checklist & Goals** | Personal tasks, milestones, and document tracker |

---

## 🚀 How to Deploy Free on GitHub Pages

### Step 1 — Push to GitHub
Make sure your repo is pushed. The `higher-education/` folder should be visible on GitHub.

### Step 2 — Enable GitHub Pages
1. Go to your repo on GitHub
2. Click **Settings** (top menu)
3. Scroll to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/higher-education` *(or `/docs` if you move the folder)*
5. Click **Save**

### Step 3 — Access your live app
After ~1 minute, your app will be live at:
```
https://mosharrof6870.github.io/ground-water-/higher-education/
```

> **Note**: GitHub Pages may take 1–5 minutes to build on first deployment.

---

## 💾 Data Storage

- All data is stored in your **browser's localStorage** — 100% private, no server needed.
- To **back up** your data: click ⚙️ Data Management → Export Backup (JSON)
- To **restore** on a new device: import your backup JSON file
- To **share** data across devices: export → copy the JSON file → import on the other device

---

## 📱 Usage

### Professor Outreach
1. Click **Professor Outreach** in the sidebar
2. Click **+ Add Professor** to add a new entry
3. Fill in university, research area, professor name, contact date, response, funding, status
4. Use filters to find specific professors
5. Click **📤 Export CSV** to download a spreadsheet

### University Board
1. Click **University Board** in the sidebar
2. Click **+ Add University** to add a target university
3. Track application status, deadlines, and requirements
4. Cards show color-coded status and countdown timers

### Checklist & Goals
1. Click **Checklist & Goals** in the sidebar
2. Click **Load Defaults** to get a starter checklist with 20 pre-built tasks
3. Add custom goals with deadlines and priorities
4. Check off documents in the Document Tracker section

---

## 🛠️ Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript** — no frameworks, no build step
- **Chart.js** — for dashboard charts
- **Google Fonts (Inter)** — for clean typography
- **localStorage** — for data persistence
- **GitHub Pages** — for free hosting

---

## 📂 File Structure

```
higher-education/
├── index.html          ← Main app
├── css/
│   └── style.css       ← All styles (navy/cream theme)
├── js/
│   ├── storage.js      ← Data storage + export/import
│   ├── dashboard.js    ← Dashboard with charts
│   ├── professors.js   ← Professor tracker
│   ├── universities.js ← University board
│   ├── checklist.js    ← Checklist & goals
│   └── app.js          ← App routing & initialization
└── README.md           ← This file
```

---

## 🎨 Design

- **Color palette**: Deep navy (`#1a2540`) + warm cream (`#f5f0e8`) + orange accent (`#e8622a`)
- **Typography**: Inter (sans-serif) for UI, Georgia (serif) for headings
- Inspired by the "Higher Studies Abroad" tracker style from your reference image

---

*Made with ❤️ for your higher education journey*
