"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  
  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth");
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-slate-900">
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
}
