import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Search, SlidersHorizontal, HelpCircle, Settings, Grid3x3, LogOut } from 'lucide-react';
import { useMe } from '../hooks/useMe';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../api/auth';

export function Topbar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data: me } = useMe();
  const qc = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      navigate('/login');
    },
  });

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 px-4">
      <div className="flex items-center gap-2 pr-4">
        <img src="/logo.svg" alt="" className="h-8 w-8" />
        <span className="text-xl text-text">Drive</span>
      </div>

      <form onSubmit={onSearchSubmit} className="max-w-2xl flex-1">
        <div className="focus-within:ring-accent flex items-center gap-3 rounded-full bg-surface px-4 py-2.5 focus-within:ring-2">
          <Search className="h-5 w-5 shrink-0 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in Drive"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
            aria-label="Search in Drive"
          />
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-text-muted" />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" className="focus-ring rounded-full p-2.5 text-text-muted hover:bg-surface-hover" title="Help">
          <HelpCircle className="h-5 w-5" />
        </button>
        <button type="button" className="focus-ring rounded-full p-2.5 text-text-muted hover:bg-surface-hover" title="Settings">
          <Settings className="h-5 w-5" />
        </button>
        <button type="button" className="focus-ring rounded-full p-2.5 text-text-muted hover:bg-surface-hover" title="Apps">
          <Grid3x3 className="h-5 w-5" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="focus-ring ml-1 h-9 w-9 overflow-hidden rounded-full" title={me?.name}>
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt={me.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-accent text-sm font-medium text-[#1b1b1b]">
                  {me?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="min-w-56 rounded-xl border border-border bg-surface p-1 text-sm shadow-lg"
            >
              <div className="px-3 py-2 text-text-muted">
                <div className="text-text">{me?.name}</div>
                <div className="truncate">{me?.email}</div>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => logoutMutation.mutate()}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none hover:bg-surface-hover data-[highlighted]:bg-surface-hover"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
