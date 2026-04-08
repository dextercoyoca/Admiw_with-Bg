# Electripay Admin Portal

Admin panel for billing operations with MongoDB-backed authentication and role-protected API routes.

## Admin Sections

- Dashboard (main landing page after login)
- Users
- Usage
- Bills
- Settings
- Reports
- Notifications

## Security Rules Implemented

- Login is validated from MongoDB `admin-side` collection
- API routes require signed bearer token
- Backend verifies `role === "admin"`
- Admin data routes are not accessible without valid admin token

## Data Sources

- Admin login collection: `admin-side`
- Admin panel content collection: `users`
- Settings collection: `admin-settings`

## Environment

Use `config.env` (primary) or `.env` (fallback):

```env
ATLAS_URI=mongodb+srv://...
MONGODB_DB_NAME=database_electripay
ADMIN_AUTH_SECRET=change-this-secret
```

## Start

```bash
npm install
npm run web
```

## Main API Routes

- `POST /api/auth/login`
- `GET /api/clients`
- `PATCH /api/clients/:id`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`
