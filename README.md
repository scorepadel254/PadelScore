# 🎾 PadelScore

PadelScore is a web application designed to simplify **padel tournament management and live scoring**.  
It provides role-based access for **admins**, **referees**, and a **public live view** for spectators.

---

## 🚀 Features (Current)
- **Admin Panel**
  - Add players, teams, referees, and tournaments.
  - Manage tournament settings and match schedules.
- **Referee Dashboard**
  - Login for referees.
  - Score tracking interface per match.
- **Public View**
  - Live leaderboard.
  - Player and team standings.
  - Tournament information.

---

## ⚙️ Tech Stack
- **Backend**: Node.js + Express  
- **Frontend**: HTML/CSS + basic JS  
- **Database**: (to be finalized – MySQL/PostgreSQL/MongoDB)  
- **Auth**: JWT-based (planned)  
- **Hosting**: Replit / Docker-ready setup (planned)

---

## 📌 Recommendations (Next Steps)

### 🔧 Backend
- Define **database schema** clearly:
  - `Players`, `Teams`, `Matches`, `Tournaments`, `Referees`
- Add ORM (Sequelize / Prisma / Mongoose) for maintainability.
- Implement **WebSocket (Socket.io)** for real-time scoring and leaderboard updates.

### 🖥️ Frontend
- Replace **static HTML** with a lightweight JS-driven frontend.
- Hook **admin**, **referee**, and **live pages** to backend API endpoints.
- Add **auto-refresh or socket updates** for live leaderboards.

### 🔐 Authentication & Roles
- **Admin login** → Manage tournaments and referees.  
- **Referee login** → Record and update match scores.  
- **Public view** → Read-only, no login required.

### 🚀 Deployment
- Add a `Dockerfile` for easy deployment.  
- Or configure **Replit** with Node.js + DB support.  
- Store sensitive information (DB connection, JWT secrets) in **environment variables**.

---

## 📂 Project Structure
