"use client";

import { useEffect, useState } from "react";
import { X, User } from "lucide-react";
import toast from "react-hot-toast";

type Character = {
    id?: string;
    name?: string;
    role?: string;
    expertise?: string;
    personality?: string;
    speakingStyle?: string;
    goal?: string;
    avatarUrl?: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    mode?: "create" | "edit";
    character?: Character | null;
    onSaved?: () => void;
};

export default function CreateCharacterModal({
    isOpen,
    onClose,
    mode = "create",
    character,
    onSaved,
}: Props) {

    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [expertise, setExpertise] = useState("");
    const [personality, setPersonality] = useState("");
    const [speakingStyle, setSpeakingStyle] = useState("");
    const [goal, setGoal] = useState("");

    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mode === "edit" && character) {
            setName(character.name || "");
            setRole(character.role || "");
            setExpertise(character.expertise || "");
            setPersonality(character.personality || "");
            setSpeakingStyle(character.speakingStyle || "");
            setGoal(character.goal || "");
            setAvatarPreview(character.avatarUrl || null);
        } else {
            setName("");
            setRole("");
            setExpertise("");
            setPersonality("");
            setSpeakingStyle("");
            setGoal("");
            setAvatar(null);
            setAvatarPreview(null);
        }
    }, [mode, character]);

    if (!isOpen) return null;

    const handleAvatarChange = (file: File | null) => {
        if (!file) return;

        setAvatar(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!name || !role) {
            toast.error("Name and role are required");
            return;
        }

        setLoading(true);

        const formData = new FormData();

        formData.append("name", name);
        formData.append("role", role);
        formData.append("expertise", expertise);
        formData.append("personality", personality);
        formData.append("speakingStyle", speakingStyle);
        formData.append("goal", goal);

        if (avatar) formData.append("avatar", avatar);

        try {
            const endpoint =
                mode === "create"
                    ? "/api/character"
                    : `/api/character/${character?.id}`;

            const method = mode === "create" ? "POST" : "PATCH";

            const res = await fetch(endpoint, {
                method,
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            toast.success(
                mode === "create"
                    ? "Character created!"
                    : "Character updated!"
            );

            onSaved?.();
            onClose();

        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

            <div className="bg-[#181818] border border-zinc-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white">
                        {mode === "create" ? "Create Character" : "Edit Character"}
                    </h2>

                    <button onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">

                    {/* Avatar preview */}
                    <div className="flex justify-center">
                        {avatarPreview ? (
                            <img
                                src={avatarPreview}
                                className="w-24 h-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center">
                                <User size={32} />
                            </div>
                        )}
                    </div>

                    {/* Avatar upload */}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            handleAvatarChange(e.target.files?.[0] || null)
                        }
                    />

                    {/* Name */}
                    <input
                        placeholder="Character name (e.g. Professor AI)"
                        className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    {/* Role */}
                    <input
                        placeholder="Role (e.g. Machine Learning Professor)"
                        className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    />

                    {/* Expertise */}
                    <input
                        placeholder="Expertise (e.g. neural networks, AI research)"
                        className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                    />

                    {/* Personality */}
                    <textarea
                        placeholder="Personality (e.g. friendly teacher who explains patiently)"
                        className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2"
                        value={personality}
                        onChange={(e) => setPersonality(e.target.value)}
                    />

                    {/* Speaking Style */}
                    <textarea
                        placeholder="Speaking style (e.g. uses analogies and step-by-step explanations)"
                        className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2"
                        value={speakingStyle}
                        onChange={(e) => setSpeakingStyle(e.target.value)}
                    />

                    {/* Goal */}
                    <textarea
                        placeholder="Goal (e.g. help the user deeply understand ML)"
                        className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-3 py-2"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                    />

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-white text-black py-2 rounded-lg hover:bg-gray-200 transition"
                    >
                        {loading ? "Saving..." : mode === "create" ? "Create Character" : "Update Character"}
                    </button>

                </div>
            </div>
        </div>
    );
}