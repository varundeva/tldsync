import { redirect } from "next/navigation";

// OAuth sign-up and sign-in happen through the same flow at /auth.
// There is no separate registration page when using social providers.
export default function RegisterPage() {
  redirect("/auth");
}
