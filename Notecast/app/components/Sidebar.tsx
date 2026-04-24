"use client";

import { useState } from "react";
import { LogOut, Plus, LayoutDashboard, FileText, UserPlus } from "lucide-react";
import CreateNotebookModal from "./CreateNotebookModal";
import toast from "react-hot-toast";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const { data: session } = useSession();
    const [openModal, setOpenModal] = useState(false);
    const pathname = usePathname();

    const linkStyle = (path: string) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${pathname === path
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:text-white hover:bg-zinc-900"
        }`;

    return (
        <div className="flex flex-col justify-between h-screen w-64 bg-[#0f0f0f] border-r border-zinc-800 p-5">

            {/* Top */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-white text-xl font-semibold">studybuddy</h1>

                    <button
                        onClick={() => setOpenModal(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border bg-white border-zinc-700 text-black hover:bg-gray-200 hover:border-zinc-500 transition"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <nav className="flex flex-col gap-2">
                    <Link href="/dashboard" className={linkStyle("/dashboard")}>
                        <LayoutDashboard size={16} />
                        Dashboard
                    </Link>

                    <Link href="/characters" className={linkStyle("/characters")}>
                        <UserPlus size={16} />
                        Study Buddies
                    </Link>

                    <button
                        onClick={() => setOpenModal(true)}
                        className={linkStyle("/new")}
                    >
                        <Plus size={16} />
                        New Notebook
                    </button>
                </nav>
            </div>

            {/* Bottom user section */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">

                <div className="flex items-center gap-3">
                    {session?.user?.image && (
                        <Image
                            src={session.user.image}
                            alt="pfp"
                            width={34}
                            height={34}
                            className="rounded-full"
                        />
                    )}

                    <div className="flex flex-col leading-tight">
                        <span className="text-sm text-white">{session?.user?.name}</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        signOut();
                        toast.success("Logged out successfully");
                    }}
                    className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                >
                    <LogOut size={16} />
                </button>

            </div>

            <CreateNotebookModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
            />
        </div>
    );
}