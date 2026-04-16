# ⚡ PlaceTrack — Placement Tracker App

A full-featured placement tracking application built with **Flask + HTML/CSS/JavaScript**.

---

## 🚀 Quick Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the app
```bash
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

---

## 🔐 Default Admin Account
| Field    | Value                  |
|----------|------------------------|
| Email    | admin@placement.com    |
| Password | admin123               |

---

## 📁 Project Structure
```
placement_tracker/
├── app.py                  # Flask backend (all API routes)
├── data.json               # Auto-generated data store
├── requirements.txt
├── templates/
│   └── index.html          # Single-page app template
└── static/
    ├── css/
    │   └── style.css       # Complete design system
    ├── js/
    │   └── app.js          # Frontend logic
    └── uploads/            # Resume uploads stored here
```

---

## ✨ Features

### Student
- 🔐 Signup / Login / Logout
- 👤 Profile management + resume upload/download
- 🔑 Change password
- 📋 Add / Edit / Delete company applications
- 🔍 Search & filter applications by name or status
- 📊 Dashboard with charts (monthly + status breakdown)
- 📅 Upcoming interview reminders
- ⏰ Deadline alerts (within 14 days)
- 📚 Preparation hub (aptitude links, coding platforms, HR Q&A, resume tips)
- 📓 Interview experience notes
- 🔔 Notifications (new apps, status changes, drives)
- 📤 Export applications to JSON or CSV
- 🌙 Dark / Light mode toggle

### Admin
- 🏢 Add / Delete placement drives (broadcasts notification to all students)
- 👥 View all students with application stats
- 📊 Platform-wide reports

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/profile/password` | Change password |
| POST | `/api/profile/resume` | Upload resume |
| GET | `/api/applications` | List applications |
| POST | `/api/applications` | Add application |
| PUT | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/notifications` | Notifications |
| POST | `/api/notifications/read` | Mark all read |
| GET | `/api/notes` | List notes |
| POST | `/api/notes` | Add note |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/admin/drives` | List drives |
| POST | `/api/admin/drives` | Add drive (admin) |
| DELETE | `/api/admin/drives/:id` | Delete drive (admin) |
| GET | `/api/admin/students` | List students (admin) |
| GET | `/api/admin/reports` | Reports (admin) |
| GET | `/api/resources` | Prep resources |
