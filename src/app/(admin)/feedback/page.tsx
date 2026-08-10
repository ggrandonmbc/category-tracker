import { redirect } from "next/navigation"
import { getCurrentUserRole } from "@/lib/auth/role"
import { FeedbackClient } from "./FeedbackClient"

export const metadata = { title: "Feedback — DBS CatMan" }

export default async function FeedbackPage() {
  const rol = await getCurrentUserRole()
  if (rol !== "admin") redirect("/dashboard")
  return (
    <div className="p-4 sm:p-6">
      <FeedbackClient />
    </div>
  )
}
