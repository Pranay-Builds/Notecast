"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getGreeting } from "@/app/utils/getGreeting";
import Link from "next/link";
import { Plus, MoreVertical, Pencil, Share, Trash } from "lucide-react";
import CreateNotebookModal from "@/app/components/CreateNotebookModal";
import toast from "react-hot-toast";

type Notebook = {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
};

export default function Dashboard() {
  const { data: session } = useSession();
  const greeting = getGreeting();

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const res = await fetch("/api/notebook");
        const data = await res.json();

        setNotebooks(data.notebooks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotebooks();
  }, []);



  return (
    <div className="max-w-6xl mx-auto py-12 px-6 text-white">

      {/* Greeting */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold">
          {greeting}, {session?.user?.name?.split(" ")[0]} 👋
        </h1>

        <p className="text-zinc-400 mt-2">
          Continue learning with your notebooks
        </p>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Notebooks</h2>


        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"
        >
          <Plus size={16} />
          New Notebook
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && notebooks.length === 0 && (
        <div className="border border-zinc-800 bg-[#181818] rounded-xl p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No notebooks yet</h3>
          <p className="text-zinc-400 mb-4">
            Create your first notebook to start learning
          </p>

          <button
            onClick={() => setOpenModal(true)}
            className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <Plus size={16} />
            Create Notebook
          </button>
        </div>
      )}

      {/* Notebook grid */}
      {!loading && notebooks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <div className="bg-[#181818] border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-[#1f1f1f] transition relative">

              <Link
                href={`/notebook/${notebook.id}`}
                onClick={(e) => {
                  if (editingId === notebook.id) {
                    e.preventDefault();
                  }
                }}
              >
                {editingId === notebook.id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {

                        await fetch(`/api/notebook/${notebook.id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ name: editValue }),
                        });

                        setNotebooks((prev) =>
                          prev.map((n) =>
                            n.id === notebook.id ? { ...n, name: editValue } : n
                          )
                        );

                        toast.success("Notebook updated successfully!")

                        setEditingId(null);
                      }
                    }}
                    className="bg-transparent border border-zinc-700 rounded px-2 py-1 text-white w-full"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-lg font-semibold">{notebook.name}</h3>
                )}

                {notebook.description && (
                  <p className="text-zinc-400 text-sm mt-2 line-clamp-2">
                    {notebook.description}
                  </p>
                )}

                <p className="text-sm mt-2 text-gray-400">
                  Created {new Date(notebook.createdAt!).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </Link>

              {/* menu button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setOpenMenu(openMenu === notebook.id ? null : notebook.id);
                }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <MoreVertical size={16} />
              </button>


              {openMenu === notebook.id && (
                <div className="absolute right-1 top-10 bg-[#222] border border-zinc-700 rounded-lg shadow-lg w-40 py-1 z-50">

                  <button
                    className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingId(notebook.id);
                      setEditValue(notebook.name);
                      setOpenMenu(null);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Pencil size={18} />
                      Rename
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm">
                    <div className="flex items-center gap-2">
                      <Share size={18} />
                      Share
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm">
                    <div className="flex items-center gap-2">
                      <Trash size={18} />
                      Delete
                    </div>
                  </button>

                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateNotebookModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
      />
    </div>
  );
}