"use client";

import { Plus, User } from "lucide-react";
import { useEffect, useState } from "react";
import CreateCharacterModal from "@/app/components/CreateCharacterModal";

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

    useEffect(() => {
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

        fetchCharacters();
    }, []);

    return (
        <div className="max-w-6xl mx-auto py-12 px-6 text-white">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold">Characters</h1>

                <button
                    onClick={() => setOpenModal(true)}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                    <Plus size={16} />
                    Create Character
                </button>
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
                        onClick={() => setOpenModal(true)}
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

                    {characters.map((char) => (
                        <div
                            key={char.id}
                            className="bg-[#181818] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center hover:border-zinc-600 hover:bg-[#1f1f1f] transition cursor-pointer"
                        >

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

                            {/* Name */}
                            <h3 className="text-lg font-semibold">
                                {char.name}
                            </h3>

                            {/* Role */}
                            <p className="text-sm text-zinc-400">
                                {char.role}
                            </p>

                            {/* Personality preview */}
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
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
            />

        </div>
    );
}