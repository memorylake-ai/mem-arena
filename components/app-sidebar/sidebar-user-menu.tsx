"use client";

import { ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react";
import NextImage from "next/image";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useProfile } from "@/components/profile-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function SidebarUserMenu() {
  const { user, loading } = useProfile();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleThemeChange = (v: string) => {
    setTheme(v);
    setOpen(false);
  };

  return (
    <SidebarFooter className="border-sidebar-border border-t">
      <SidebarMenu>
        <SidebarMenuItem>
          {loading ? (
            <div
              className="flex h-10 w-full items-center gap-2 rounded-md px-2"
              data-sidebar="menu-skeleton"
            >
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="grid min-w-0 flex-1 gap-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ) : (
            <DropdownMenu onOpenChange={setOpen} open={open}>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    size="lg"
                  >
                    <Avatar className="relative h-8 w-8 overflow-hidden rounded-lg">
                      {user?.avatar_url ? (
                        <NextImage
                          alt={user?.display_name ?? ""}
                          className="rounded-lg object-cover"
                          fill
                          sizes="32px"
                          src={user.avatar_url}
                        />
                      ) : null}
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user?.display_name}
                      </span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                }
              />

              <DropdownMenuContent
                align="end"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="right"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="relative h-8 w-8 overflow-hidden rounded-lg">
                        {user?.avatar_url ? (
                          <NextImage
                            alt={user?.display_name ?? ""}
                            className="rounded-lg object-cover"
                            fill
                            sizes="32px"
                            src={user.avatar_url}
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg">
                          CN
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {user?.display_name}
                        </span>
                        <span className="truncate text-xs">{user?.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger openOnHover>
                      <Sun className="size-4" />
                      Theme: <span className="capitalize">{theme}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        onValueChange={handleThemeChange}
                        value={theme ?? "system"}
                      >
                        {THEMES.map(({ value, label, icon: Icon }) => (
                          <DropdownMenuRadioItem key={value} value={value}>
                            <Icon className="size-4" />
                            {label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
