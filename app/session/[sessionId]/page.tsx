import { ChatArea } from "@/components/chat";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SessionPage() {
  return (
    <>
      <header className="absolute top-2 left-2 z-50">
        <SidebarTrigger />
      </header>
      <ChatArea />
    </>
  );
}
