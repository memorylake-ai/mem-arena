"use client";

import { useMemo } from "react";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderOption } from "@/lib/config";

export interface ChatModelSelectProps {
  providerId: string;
  setProviderId: (id: string) => void;
  currentProvider: ProviderOption | undefined;
  providers: ProviderOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatModelSelect({
  providerId,
  setProviderId,
  currentProvider,
  providers,
  open,
  onOpenChange,
}: ChatModelSelectProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ProviderOption[]>();
    for (const p of providers) {
      const g = p.group ?? "Models";
      if (!map.has(g)) {
        map.set(g, []);
      }
      const list = map.get(g);
      if (list) {
        list.push(p);
      }
    }
    return Array.from(map.entries());
  }, [providers]);

  const items = useMemo(
    () =>
      Object.fromEntries(
        providers.map((p) => [p.providerId, p.displayName] as const)
      ),
    [providers]
  );

  return (
    <Select
      items={items}
      onOpenChange={onOpenChange}
      onValueChange={(v) => v != null && setProviderId(v)}
      open={open}
      value={providerId}
    >
      <SelectTrigger
        aria-label="Choose model"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 font-normal text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {currentProvider?.logoProvider != null && (
          <ModelSelectorLogo
            className="size-4 shrink-0"
            provider={currentProvider.logoProvider}
          />
        )}
        <SelectValue placeholder="Choose model" />
      </SelectTrigger>
      <SelectContent
        align="start"
        className="max-h-[min(calc(100dvh-8rem),400px)] w-(--anchor-width) min-w-48"
      >
        {grouped.map(([groupName, items]) => (
          <SelectGroup key={groupName}>
            <SelectLabel>{groupName}</SelectLabel>
            {items.map((p) => (
              <SelectItem
                className="items-center"
                key={p.providerId}
                value={p.providerId}
              >
                <div className="flex items-center gap-2">
                  <ModelSelectorLogo
                    className="size-4 shrink-0"
                    provider={p.logoProvider}
                  />
                  {p.displayName}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
