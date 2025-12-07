// src/app/signin/page.tsx
import { redirect } from "next/navigation";

export default function SignInRedirect() {
  // Automatically redirect anyone visiting /signin 
  // to the official NextAuth login page
  redirect("/login");
}