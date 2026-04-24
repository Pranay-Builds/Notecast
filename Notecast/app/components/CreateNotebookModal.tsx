"use client";

import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );
  const router = useRouter();

  const createNotebook = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notebook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description, characterId: selectedCharacter }),
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
  };

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const res = await fetch("/api/character");
        const data = await res.json();
        setCharacters(data.characters || []);
      } catch (err) {
        console.error(err);
      }
    };

    if (isOpen) fetchCharacters();
  }, [isOpen]);

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

            <div className="mt-4">
              <p className="text-sm text-center text-zinc-400 mb-2">Choose a study buddy</p>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => setSelectedCharacter(char.id)}
                    className={`flex flex-col items-center cursor-pointer p-2 rounded-lg transition min-w-[80px]
          ${selectedCharacter === char.id
                        ? "bg-zinc-800"
                        : "bg-[#0f0f0f]"
                      }`}
                  >
                    {char.avatarUrl ? (
                      <img
                        src={char.avatarUrl}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                        <User size={20} />
                      </div>
                    )}

                    <span className="text-xs mt-1 text-center">
                      {char.name}
                    </span>
                  </div>
                ))}
              </div>
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
