# Drop-in Auth (Neon + Vercel)
Copy the `api/` folder and `vercel.json` into your project root.
Set env on Vercel:
- DATABASE_URL (Neon pooled URL with sslmode=require)
- JWT_SECRET (any random string)

Then deploy. Test:
- /api/health
- /api/auth/signup  (POST: { email, password, fullName? } or { username, password })
- /api/auth/login   (POST: same shape)
- /api/auth/me
