"use client";

import { authClient } from "@/lib/auth-client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  BookOpen,
  CreditCard,
  HelpCircle,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Search,
  Sun,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopBarProps {
  userName?: string;
  userEmail?: string;
  userImage?: string;
}

export function TopBar({ userName, userEmail, userImage }: TopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (userEmail?.charAt(0).toUpperCase() ?? "?");

  return (
    <header
      className="flex items-center justify-between h-12 px-4 border-b border-white/[0.08] bg-[#0f0f0f]/80 backdrop-blur-sm"
      data-testid="top-bar"
    >
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-colors border border-white/[0.08]"
          aria-label="Search"
        >
          <Search size={14} />
          <span className="hidden sm:inline text-gray-500">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-500 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="p-2 rounded-md text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Chat */}
        <button
          type="button"
          className="p-2 rounded-md text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors"
          aria-label="Chat"
        >
          <MessageSquare size={18} />
        </button>

        {/* Profile dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold hover:ring-2 hover:ring-white/20 transition-all ml-1 overflow-hidden"
              aria-label="Profile menu"
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName ?? "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-xl py-1 z-50"
              align="end"
              sideOffset={8}
            >
              {/* User info */}
              <div className="px-3 py-2 border-b border-white/[0.08]">
                <p className="text-sm font-medium text-white truncate">
                  {userName ?? "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>

              <DropdownMenu.Item asChild>
                <Link
                  href="/settings/account"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white cursor-pointer outline-none"
                >
                  <User size={14} />
                  Your profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings/workspace/members"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white cursor-pointer outline-none"
                >
                  <UserPlus size={14} />
                  Invite members
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white cursor-pointer outline-none"
                >
                  <CreditCard size={14} />
                  Billing
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 border-t border-white/[0.08]" />

              {/* Theme switcher */}
              <div className="px-3 py-2">
                <p className="text-xs text-gray-500 mb-1.5">Theme</p>
                <div className="flex items-center gap-1 bg-white/[0.04] rounded-md p-0.5">
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Monitor size={12} />
                    System
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Sun size={12} />
                    Light
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs bg-white/[0.08] text-white rounded transition-colors"
                  >
                    <Moon size={12} />
                    Dark
                  </button>
                </div>
              </div>

              <DropdownMenu.Separator className="my-1 border-t border-white/[0.08]" />

              <DropdownMenu.Item asChild>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white cursor-pointer outline-none"
                >
                  <BookOpen size={14} />
                  Documentation
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <a
                  href="mailto:support@example.com"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white cursor-pointer outline-none"
                >
                  <HelpCircle size={14} />
                  Contact support
                </a>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 border-t border-white/[0.08]" />

              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-white/[0.06] hover:text-red-300 cursor-pointer outline-none"
              >
                <LogOut size={14} />
                Log Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
