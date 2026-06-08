"use client";

import { Menu, X, Library, UserPlus, Plus } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import CreateNotebookModal from "./CreateNotebookModal";

export default function MobileNavbar() {
  const [open, setOpen] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <header className="md:hidden h-14 border-b border-zinc-800 bg-[#0f0f0f] flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="text-zinc-400"
        >
          <Menu size={22} />
        </button>

        <h1 className="font-semibold text-white">
          Curio
        </h1>

        <button
          onClick={() => setOpenModal(true)}
          className="text-zinc-400"
        >
          <Plus size={22} />
        </button>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="fixed left-0 top-0 h-full w-72 bg-[#0f0f0f] border-r border-zinc-800 z-50 p-5">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-white text-xl font-semibold">
                Curio
              </h1>

              <button onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900"
              >
                <Library size={18} />
                Dashboard
              </Link>

              <Link
                href="/characters"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900"
              >
                <UserPlus size={18} />
                Tutors
              </Link>
            </nav>
          </div>
        </>
      )}

      <CreateNotebookModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}