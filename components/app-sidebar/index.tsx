import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { SidebarHeaderContent } from "./sidebar-header";
import { SidebarSessions } from "./sidebar-sessions";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeaderContent />
      <SidebarContent>
        <SidebarSessions />
      </SidebarContent>
      <SidebarUserMenu />
      <SidebarRail />
    </Sidebar>
  );
}
