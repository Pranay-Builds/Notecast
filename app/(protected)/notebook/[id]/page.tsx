"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
    Ghost,
    Share,
    UserPlus,
    Send,
    Plus,
    X,
    Image,
    FileText,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type Notebook = {
    id: string;
    name: string;
    description?: string;
};

type UploadFile = {
    id: string;
    file: File;
    preview?: string;
};

export default function NotebookPage() {
    const params = useParams();
    const id = params.id;

    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    const [files, setFiles] = useState<UploadFile[]>([]);
    const [url, setUrl] = useState("");
    const [videoData, setVideoData] = useState<any[]>([]);
    const [message, setMessage] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchNotebook = async () => {
            const res = await fetch(`/api/notebook/${id}`);
            const data = await res.json();

            if (!res.ok) {
                setNotebook(null);
                return;
            }

            setNotebook(data.notebook);
            setLoading(false);
        };

        fetchNotebook();
    }, [id]);

    const handleFileUpload = (files: FileList | null) => {
        if (!files) return;

        const fileArray = Array.from(files);

        const validFiles = fileArray.filter((file) =>
            ["application/pdf", "image/jpeg", "image/png"].includes(file.type)
        );

        if (validFiles.length === 0) {
            toast.error("Please upload PDF or image files.");
            return;
        }

        if (files.length + validFiles.length > 20) {
            toast.error("Maximum 20 files allowed.");
            return;
        }

        const newFiles = validFiles
            .filter(
                (file) =>
                    !Array.from(files).some((f) => f.name === file.name && f.size === file.size)
            )
            .map((file) => ({
                id: crypto.randomUUID(),
                file,
                preview: file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : undefined,
            }));

        if (newFiles.length === 0) {
            toast.error("File already uploaded.");
            return;
        }

        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => {
            const updated = [...prev];
            if (updated[index].preview) {
                URL.revokeObjectURL(updated[index].preview!);
            }
            updated.splice(index, 1);
            return updated;
        });
    };

    const addVideo = async () => {
        if (!url) return;

        if (videoData.length >= 5) {
            toast.error("Maximum 5 videos allowed.");
            return;
        }

        if (videoData.some((v) => v.url === url)) {
            toast.error("Video already added.");
            return;
        }

        try {
            const response = await fetch(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
            );

            if (!response.ok) {
                toast.error("Invalid YouTube URL");
                return;
            }

            const data = await response.json();

            setVideoData((prev) => [...prev, { ...data, url }]);
            setUrl("");
        } catch {
            toast.error("Invalid YouTube URL");
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </div>
        );
    }

    if (!notebook) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4">
                <h1 className="font-semibold text-2xl">Notebook not found</h1>
                <Ghost size={40} className="animate-bounce text-gray-400" />
                <Link href={"/"} className="text-blue-400 hover:underline">
                    go back
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#121212] text-white">

            {/* HEADER */}
            <header className="bg-[#181818] border-b border-zinc-800 h-14 flex items-center justify-between px-6">
                <h1 className="font-semibold text-lg">{notebook.name}</h1>

                <div className="flex items-center gap-2">

                    <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition active:scale-[0.98]">
                        <UserPlus size={16} />
                        Add Friends
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-zinc-700 bg-[#181818] hover:bg-zinc-800 transition">
                        <Share size={16} />
                        Share
                    </button>
                </div>
            </header>

            {/* MAIN */}
            <div className="flex flex-1 overflow-hidden">

                {/* SIDEBAR SOURCES */}
                <div
                    onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsDragging(false);
                        }
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleFileUpload(e.dataTransfer.files);
                    }}
                    className={`
    w-80 border-r border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto
    transition-all duration-200 relative
    ${isDragging
                            ? "bg-[#1a1622] ring-2 ring-violet-500/40"
                            : "bg-[#121212]"
                        }
  `}
                >

                    {isDragging && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="border-2 border-dashed border-violet-400 rounded-xl px-8 py-6 text-center text-sm text-white">
                                Drop files to upload
                            </div>
                        </div>
                    )}

                    {/* ADD SOURCE CARD */}
                    <div className="bg-[#161616] border border-zinc-800 rounded-xl p-4 space-y-3">
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                        >
                            <Plus size={16} />
                            Upload File
                        </button>

                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileUpload(e.target.files)}
                        />

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="YouTube link..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex-1 bg-[#121212] border border-zinc-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                            />

                            <button
                                onClick={addVideo}
                                className="bg-zinc-700 px-3 rounded-lg hover:bg-zinc-600 transition"
                            >
                                Add
                            </button>
                        </div>

                    </div>


                    {/* FILE SOURCES */}
                    <div className="space-y-2">
                        <h2 className="text-xs uppercase tracking-wider text-zinc-500">
                            Sources
                        </h2>

                        {files.map((item, index) => (
                            <div
                                key={item.id}
                                className="group flex items-center justify-between bg-[#181818] border border-zinc-800 px-3 py-2 rounded-lg hover:bg-zinc-800 transition"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {item.file.type.startsWith("image/") ? (
                                        <Image size={16} className="text-zinc-400" />
                                    ) : (
                                        <FileText size={16} className="text-zinc-400" />
                                    )}
                                    <span className="text-sm truncate">{item.file.name}</span>
                                </div>

                                <button
                                    onClick={() => removeFile(index)}
                                    className="opacity-0 group-hover:opacity-100 transition"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* VIDEO SOURCES */}
                    {videoData.length > 0 && (
                        <div className="space-y-2">
                            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
                                Videos
                            </h2>

                            {videoData.map((video, idx) => (
                                <div
                                    key={idx}
                                    className="group flex gap-3 bg-[#181818] border border-zinc-800 p-2 rounded-lg hover:bg-zinc-800 transition"
                                >
                                    <img
                                        src={video.thumbnail_url}
                                        alt={video.title}
                                        className="w-16 h-12 rounded object-cover"
                                    />

                                    <div className="flex-1 flex flex-col justify-center">
                                        <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                                        <span className="text-xs text-zinc-400">
                                            {video.author_name}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() =>
                                            setVideoData((prev) => prev.filter((_, i) => i !== idx))
                                        }
                                        className="opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* CHAT AREA */}
                <div className="flex flex-col flex-1">

                    {/* MESSAGES */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        <div className="text-zinc-400">
                            Ask questions about your sources.
                        </div>
                    </div>

                    {/* CHAT INPUT */}
                    <div className="border-t border-zinc-800 p-4 flex gap-3">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ask something about your sources..."
                            className="flex-1 bg-[#181818] px-4 py-3 rounded-lg border border-zinc-800 focus:outline-none"
                        />

                        <button className="p-2 rounded-lg hover:bg-zinc-800 transition">
                            <Send size={18} />
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}