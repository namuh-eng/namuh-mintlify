"use client";

import { clsx } from "clsx";
import {
  BarChart3,
  Bot,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  Home,
  MessageCircle,
  PanelLeft,
  Pencil,
  Plus,
  Server,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  orgName: string;
  orgSlug: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const mainNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: <Home size={18} /> },
  { label: "Editor", href: "/editor/main", icon: <Pencil size={18} /> },
  { label: "Analytics", href: "/analytics", icon: <BarChart3 size={18} /> },
  { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
];

const agentNavItems: NavItem[] = [
  {
    label: "Agent",
    href: "/products/agent",
    icon: <Bot size={18} />,
    badge: "New",
  },
  {
    label: "Assistant",
    href: "/products/assistant",
    icon: <MessageCircle size={18} />,
  },
  {
    label: "Workflows",
    href: "/products/workflows",
    icon: <GitBranch size={18} />,
  },
  { label: "MCP", href: "/products/mcp", icon: <Server size={18} /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.endsWith("/dashboard");
  }
  return pathname.startsWith(href);
}

export function Sidebar({
  orgName,
  orgSlug,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center w-16 min-h-screen bg-[#0f0f0f] border-r border-white/[0.08] py-3 gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-white/[0.06] text-gray-400 mb-2"
          aria-label="Expand sidebar"
        >
          <ChevronsRight size={18} />
        </button>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "p-2 rounded-md transition-colors",
              isActive(pathname, item.href)
                ? "bg-white/[0.08] text-white"
                : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
            )}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}
        <div className="my-1 w-8 border-t border-white/[0.08]" />
        {agentNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "p-2 rounded-md transition-colors",
              isActive(pathname, item.href)
                ? "bg-white/[0.08] text-white"
                : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
            )}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col w-60 min-h-screen bg-[#0f0f0f] border-r border-white/[0.08]"
      data-testid="sidebar"
    >
      {/* Org switcher */}
      <div className="px-3 py-3">
        <button
          type="button"
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-white/[0.06] text-sm font-medium text-white transition-colors"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-600 text-white text-xs font-bold shrink-0">
            {orgName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{orgName}</span>
          <ChevronDown size={14} className="ml-auto text-gray-500 shrink-0" />
        </button>
        {orgDropdownOpen && (
          <div className="mt-1 bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-lg py-1 z-50">
            <div className="px-3 py-2 flex items-center gap-2 text-sm text-white">
              <div className="flex items-center justify-center w-5 h-5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                {orgName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{orgName}</span>
              <span className="ml-auto text-emerald-500">✓</span>
            </div>
            <div className="border-t border-white/[0.08] my-1" />
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-white/[0.06] hover:text-white"
            >
              <Plus size={14} />
              New documentation
            </button>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              isActive(pathname, item.href)
                ? "bg-white/[0.08] text-white font-medium"
                : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Agents group */}
        <div className="pt-4">
          <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-500">
            Agents
          </p>
          {agentNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                isActive(pathname, item.href)
                  ? "bg-white/[0.08] text-white font-medium"
                  : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 font-medium">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Collapse button */}
      <div className="px-3 py-3 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeft size={18} />
          <span>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
