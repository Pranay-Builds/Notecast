"use client";

import { Plus, User, MoreVertical, Pencil, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import CreateCharacterModal from "@/app/components/CreateCharacterModal";
import toast from "react-hot-toast";

type Character = {
    id: string;
    name: string;
    description?: string;
    personality?: string;
    role?: string;
    avatarUrl?: string;
    createdAt?: Date;
};

export default function Characters() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [search, setSearch] = useState("");

    const filteredCharacters = characters.filter((char) =>
        char.name.toLowerCase().includes(search.toLowerCase()) ||
        char.role?.toLowerCase().includes(search.toLowerCase())
    );

    const fetchCharacters = async () => {
        try {
            const res = await fetch("/api/character");
            const data = await res.json();
            setCharacters(data.characters || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deleteCharacter = async (id: string) => {
        if (!confirm("Delete this character?")) return;

        try {
            const res = await fetch(`/api/character/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            setCharacters(prev => prev.filter(c => c.id !== id));
            toast.success("Character deleted succesfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to delete character");
        }
    };

    useEffect(() => {
        fetchCharacters();
    }, []);

    return (
        <div className="max-w-6xl mx-auto py-12 px-6 text-white">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold">Study Buddies</h1>

                <button
                    onClick={() => {
                        setEditingCharacter(null);
                        setOpenModal(true);
                    }}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                    <Plus size={16} />
                    Create Study Buddy
                </button>
            </div>

            <div className="mb-6">
                <input
                    placeholder="Search study buddies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#181818] border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-zinc-500"
                />
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                </div>
            )}

            {/* Empty state */}
            {!loading && characters.length === 0 && (
                <div className="border border-zinc-800 bg-[#181818] rounded-xl p-12 text-center">
                    <h3 className="text-lg font-semibold mb-2">
                        No study buddies yet
                    </h3>

                    <p className="text-zinc-400 mb-4">
                        Create your first study buddy to start learning
                    </p>

                    <button
                        onClick={() => {
                            setEditingCharacter(null);
                            setOpenModal(true);
                        }}
                        className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                    >
                        <Plus size={16} />
                        Create Study Buddy
                    </button>
                </div>
            )}

            {/* Character grid */}
            {!loading && characters.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

                    {filteredCharacters.map((char) => (
                        <div
                            key={char.id}
                            className="bg-[#181818] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center hover:border-zinc-600 hover:bg-[#1f1f1f] transition relative"
                        >

                            {/* 3 dot button */}
                            <button
                                onClick={() => setOpenMenu(openMenu === char.id ? null : char.id)}
                                className="absolute top-3 right-3 text-zinc-400 hover:text-white"
                            >
                                <MoreVertical size={18} />
                            </button>

                            {/* Dropdown */}
                            {openMenu === char.id && (
                                <div className="absolute right-3 top-10 bg-[#222] border border-zinc-700 rounded-lg shadow-lg w-36 py-1 z-50">

                                    <button
                                        onClick={() => {
                                            setEditingCharacter(char);
                                            setOpenMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm"
                                    >
                                        <Pencil size={16} />
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => deleteCharacter(char.id)}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm text-red-400"
                                    >
                                        <Trash size={16} />
                                        Delete
                                    </button>

                                </div>
                            )}

                            {/* Avatar */}
                            {char.avatarUrl ? (
                                <img
                                    src={char.avatarUrl}
                                    className="w-24 h-24 rounded-full object-cover mb-4"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center mb-4">
                                    <User size={32} />
                                </div>
                            )}

                            <h3 className="text-lg font-semibold">
                                {char.name}
                            </h3>

                            <p className="text-sm text-zinc-400">
                                {char.role}
                            </p>

                            {char.personality && (
                                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                                    {char.personality}
                                </p>
                            )}

                            <p className="text-sm mt-2 text-gray-400">
                                Created {new Date(char.createdAt!).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </p>

                        </div>
                    ))}

                </div>
            )}

            <CreateCharacterModal
                isOpen={openModal || !!editingCharacter}
                mode={editingCharacter ? "edit" : "create"}
                character={editingCharacter}
                onClose={() => {
                    setOpenModal(false);
                    setEditingCharacter(null);
                }}
                onSaved={fetchCharacters}
            />

        </div>
    );
}