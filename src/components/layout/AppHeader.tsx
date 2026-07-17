import { LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { useAuth } from "@/contexts/AuthContext";

function initialsOf(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "AM";
  return base
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const avatar = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Sessão encerrada");
      navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Não foi possível encerrar a sessão");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
      <div className="hidden min-w-0 flex-1 md:block">
        <AppBreadcrumb />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatar} alt={fullName ?? user?.email ?? ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initialsOf(fullName, user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{fullName ?? "Usuário"}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
              <UserIcon className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
