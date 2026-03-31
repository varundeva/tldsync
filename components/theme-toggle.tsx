"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 scale-100 transition-all dark:scale-0 dark:hidden" />
      <Moon className="absolute h-5 w-5 scale-0 transition-all dark:scale-100 hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
