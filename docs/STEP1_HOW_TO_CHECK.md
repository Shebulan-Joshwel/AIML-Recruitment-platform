# Step 1: How to Run

Setup is already done: venv, backend deps, migrations created, frontend deps. DB name: **recruitment_db**.

**One thing you must do:** open **`backend\.env`** and set your real PostgreSQL password:

```
PG_PASSWORD=your_actual_postgres_password
```

Then run the two servers:

---

## Terminal 1 – Backend

```powershell
cd "c:\Users\ramie\OneDrive\Desktop\Portfolio project\AIML-2026-Recruitment platform\backend"
.\venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver
```

Leave it running. You should see: *Starting development server at http://127.0.0.1:8000/*

---

## Terminal 2 – Frontend

```powershell
cd "c:\Users\ramie\OneDrive\Desktop\Portfolio project\AIML-2026-Recruitment platform\frontend"
npm run dev
```

Open **http://localhost:5173** in the browser → Login/Register → see the dashboard.
