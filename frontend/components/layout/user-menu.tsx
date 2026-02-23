"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { useSession } from "@/lib/auth/use-session";
import { ThemeToggle } from "@/components/theme-toggle";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFromEmail(email?: string | null) {
  if (!email) return "U";
  const part = email.split("@")[0] ?? email;
  return part.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useSession();

  const logout = useMutation({
    mutationFn: () => api.post(routes.auth.logout()),
    onSuccess: async () => {
      // Clear cached session immediately
      await qc.invalidateQueries({ queryKey: ["session"] });
      router.push("/login");
    },
  });

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open user menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initialsFromEmail(user?.email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-1">
            <div className="text-sm font-medium">Account</div>
            <div className="text-xs text-muted-foreground">
              {user?.email ?? "Not signed in"}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logout.isPending ? "Logging out…" : "Logout"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
