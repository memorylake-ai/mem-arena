"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  deleteSession as deleteSessionAction,
  getSessions,
  renameSession as renameSessionAction,
  type SessionListItem,
} from "@/app/actions/chat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_PATH_PREFIX, sessionIdFromPathname } from "@/lib/session";

/** SWR cache key for session list; revalidate this when creating a new session. */
export const SESSIONS_SWR_KEY = "sessions";
const SESSION_SKELETON_KEYS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
] as const;

function sessionsFetcher(): Promise<SessionListItem[]> {
  return getSessions();
}

export function SidebarSessions() {
  const pathname = usePathname();
  const router = useRouter();
  const sessionId = sessionIdFromPathname(pathname);

  const {
    data: sessions = [],
    isLoading,
    mutate,
  } = useSWR(SESSIONS_SWR_KEY, sessionsFetcher, {
    revalidateOnFocus: false,
  });

  const { trigger: triggerRename, isMutating: isRenameMutating } =
    useSWRMutation(
      [SESSIONS_SWR_KEY, "rename"],
      (
        _key: string[],
        { arg }: { arg: { sessionId: string; title: string } }
      ) => renameSessionAction(arg.sessionId, arg.title)
    );

  const { trigger: triggerDelete, isMutating: isDeleteMutating } =
    useSWRMutation(
      [SESSIONS_SWR_KEY, "delete"],
      (_key: string[], { arg }: { arg: string }) => deleteSessionAction(arg)
    );

  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const openRenameDialog = (session: SessionListItem) => {
    setRenameSessionId(session.id);
    setRenameValue(session.title ?? "");
  };

  const closeRenameDialog = () => {
    setRenameSessionId(null);
  };

  const handleRenameSubmit = async () => {
    if (!renameSessionId || isRenameMutating) {
      return;
    }
    const result = await triggerRename({
      sessionId: renameSessionId,
      title: renameValue.trim() || "Untitled",
    });
    if (result?.ok) {
      await mutate();
      closeRenameDialog();
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteSessionId(id);
  };

  const closeDeleteDialog = () => {
    setDeleteSessionId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSessionId || isDeleteMutating) {
      return;
    }
    const result = await triggerDelete(deleteSessionId);
    if (result?.ok) {
      const wasActiveSession = deleteSessionId === sessionId;
      if (wasActiveSession) {
        router.push("/");
      }
      await mutate();
      closeDeleteDialog();
    }
  };

  return (
    <>
      <SidebarMenu className="p-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            className="border"
            render={
              <Link href="/">
                <Plus className="size-3" strokeWidth={1.5} />
                New session
              </Link>
            }
            size="sm"
            variant="outline"
          />
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
          Sessions
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {isLoading &&
              SESSION_SKELETON_KEYS.map((key) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuSkeleton className="h-7 w-full" />
                </SidebarMenuItem>
              ))}
            {!isLoading && sessions.length === 0 && (
              <SidebarMenuItem>
                <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                  No sessions yet.
                </div>
              </SidebarMenuItem>
            )}
            {!isLoading &&
              sessions.length > 0 &&
              sessions.map((session) => (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    isActive={sessionId === session.id}
                    render={
                      <Link href={`${SESSION_PATH_PREFIX}${session.id}`}>
                        <span className="truncate">
                          {session.title ?? "Untitled"}
                        </span>
                      </Link>
                    }
                    size="sm"
                  />
                  <SidebarMenuAction render={<div />} showOnHover>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label="Session options"
                        className="cursor-pointer"
                      >
                        <MoreHorizontal
                          className="size-4 rotate-90"
                          strokeWidth={1.5}
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={4}>
                        <DropdownMenuItem
                          onClick={() => {
                            openRenameDialog(session);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            openDeleteDialog(session.id);
                          }}
                          variant="destructive"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRenameSessionId(null);
          }
        }}
        open={!!renameSessionId}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Textarea
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRenameSubmit();
                }
              }}
              placeholder="Session title"
              value={renameValue}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button onClick={closeRenameDialog} variant="outline">
              Cancel
            </Button>
            <Button disabled={isRenameMutating} onClick={handleRenameSubmit}>
              {isRenameMutating ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={closeDeleteDialog} open={!!deleteSessionId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleteMutating}
              onClick={handleDeleteConfirm}
              variant="destructive"
            >
              {isDeleteMutating ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
