import { redirect } from "next/navigation";

// OAuth sign-up and sign-in happen through the same flow at /login.
// There is no separate registration page when using social providers.
export default function RegisterPage() {
  redirect("/login");
}
