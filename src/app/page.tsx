// Middleware in src/middleware.ts handles redirect:
// / → /login  (if not logged in)
// / → /dashboard  (if logged in)
export default function Home() {
  return null
}
