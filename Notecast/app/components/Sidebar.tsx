"use client";

import { useState } from "react";
import {
  LogOut,
  Plus,
  LayoutDashboard,
  UserPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Notebook,
  NotebookTabs,
  Library,
} from "lucide-react";
import CreateNotebookModal from "./CreateNotebookModal";
import toast from "react-hot-toast";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { data: session } = useSession();
  const [openModal, setOpenModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const pathname = usePathname();

  const linkStyle = (path: string) =>
    `flex items-center ${
      collapsed ? "justify-center" : "gap-3"
    } px-4 py-3 rounded-xl text-sm font-medium transition ${
      pathname === path
        ? "bg-zinc-900 text-white"
        : "text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
    }`;

  return (
    <>
      <div
        className={`flex flex-col justify-between h-screen bg-[#0f0f0f] border-r border-zinc-800 transition-all duration-300 ${
          collapsed ? "w-20 p-3" : "w-72 p-5"
        }`}
      >
        {/* Top */}
        <div>
          <div className="flex items-center justify-between mb-8">
            {!collapsed && (
              <h1 className="text-xl font-semibold text-white">curio</h1>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
          </div>

          {/* New Notebook */}
          <button
            onClick={() => setOpenModal(true)}
            className={`w-full flex items-center rounded-xl bg-white text-black hover:bg-zinc-200 transition ${
              collapsed
                ? "justify-center h-11"
                : "gap-3 px-4 py-3 text-sm font-medium"
            }`}
          >
            <Plus size={16} />
            {!collapsed && "New Notebook"}
          </button>

          <nav className="mt-4 space-y-2">
            <Link href="/dashboard" className={linkStyle("/dashboard")}>
              <Library size={18} />
              {!collapsed && <span>Dashboard</span>}
            </Link>

            <Link href="/characters" className={linkStyle("/characters")}>
              <UserPlus size={18} />
              {!collapsed && <span>Tutors</span>}
            </Link>
          </nav>
        </div>

        {/* Bottom User */}
        <div className="border-t border-zinc-800 pt-3">
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!collapsed ? (
              <>
                <div className="flex items-center gap-3">
                  {session?.user?.image && (
                    <Image
                      src={session.user.image}
                      alt="profile"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  )}

                  <p className="text-sm text-white">
                    {session?.user?.name}
                  </p>
                </div>

                <button
                  onClick={() => {
                    signOut();
                    toast.success("Logged out successfully");
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  signOut();
                  toast.success("Logged out successfully");
                }}
                className="relative group"
              >
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="profile"
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                ) : (
                  <LogOut size={18} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <CreateNotebookModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}