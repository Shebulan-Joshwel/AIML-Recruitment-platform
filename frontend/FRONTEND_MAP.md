# Frontend code – where everything is

| File | Purpose |
|------|--------|
| **index.html** | Entry HTML, loads `/src/main.jsx` |
| **src/main.jsx** | Mounts React app into `#root` |
| **src/App.jsx** | Routes: `/login`, `/candidate`, `/recruiter` |
| **src/pages/LoginPage.jsx** | Login + Register form (what you should see) |
| **src/pages/LoginPage.css** | Styles for login page |
| **src/pages/CandidateDashboard.jsx** | Candidate dashboard after login |
| **src/pages/RecruiterDashboard.jsx** | Recruiter dashboard after login |
| **src/pages/Dashboard.css** | Styles for dashboards |
| **src/services/api.js** | login(), register(), me(), token helpers |
| **src/index.css** | Global styles |
| **vite.config.js** | Dev server + proxy `/api` → backend |
| **package.json** | Dependencies (react, react-router-dom, vite) |

Flow: **index.html** → **main.jsx** → **App.jsx** → **LoginPage** (at `/login`).
