'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { setActiveTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { trajectoryLabel } from '@/lib/views';

export function TopBar() {
  const router = useRouter();
  const { state, update } = useAppState();
  const active = state?.trajectories.find((trajectory) => trajectory.id === state.activeTrajectoryId);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex h-full max-w-2xl items-center justify-between gap-3 px-4">
        <Link href="/" className="shrink-0 text-base font-extrabold tracking-tight text-[#111827]">
          AI GTM; <span className="text-[#047857]">Deal Master</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {state && active && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label={`Trajectory: ${trajectoryLabel(active)}. Switch or add a trajectory`}
                className="flex min-w-0 items-center gap-1 rounded-full border border-[#E5E7EB] bg-white py-2 pl-4 pr-3 text-sm font-semibold text-[#111827] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
              >
                <span className="truncate">{trajectoryLabel(active)}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" strokeWidth={1.5} aria-hidden="true" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-lg"
                >
                  <DropdownMenu.Label className="px-3 py-2 text-sm font-semibold text-[#64748B]">Your trajectories</DropdownMenu.Label>
                  {state.trajectories.map((trajectory) => (
                    <DropdownMenu.Item
                      key={trajectory.id}
                      onSelect={() => update((current) => setActiveTrajectory(current, trajectory.id))}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#111827] outline-none data-[highlighted]:bg-[#F1F5F9]"
                    >
                      <span className="flex-1">{trajectoryLabel(trajectory)}</span>
                      {trajectory.id === active.id && <Check className="h-4 w-4 text-[#047857]" strokeWidth={2} aria-label="Active" />}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-[#E5E7EB]" />
                  <DropdownMenu.Item
                    onSelect={() => router.push('/new')}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#111827] outline-none data-[highlighted]:bg-[#F1F5F9]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    Add a trajectory
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
