"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotebookModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const router = useRouter();

  const createNotebook = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notebook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description })
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to create notebook.");
        return;
      }

      const data = await response.json();
      toast.success("Notebook created successfully!");
        
      onClose();
      return router.push(`/notebook/${data.notebook.id}`);
    } catch (error) {
      toast.error("Failed to create notebook.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">

      <div className="w-[420px] bg-[#0f0f0f] border border-zinc-800 rounded-xl p-6">
        {loading && (
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-xl font-semibold">Creating Notebook...</h1>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          </div>
        )}

        {!loading && (
          <div>
            <h2 className="text-lg text-center font-semibold text-white mb-5">
              Create Notebook
            </h2>

            <div className="flex flex-col gap-4">

              <input
                placeholder="Notebook name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
              />

              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 resize-none"
              />

            </div>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={onClose}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                className="bg-white text-black text-sm px-4 py-2 rounded-lg hover:bg-gray-200"
                disabled={!name || loading}
                onClick={createNotebook}
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}