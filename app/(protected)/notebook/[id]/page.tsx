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
    Clipboard,
    Globe,
    Youtube,
    CheckCircle,
    AlertCircle,
    Video,
    Music,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type Notebook = {
    id: string;
    name: string;
    description?: string;
};

type UploadStatus = "uploading" | "done" | "error";

type UploadProgress = {
    id: string;
    name: string;
    progress: number;
    status: UploadStatus;
};

type Source = {
    id: string;
    type: "file" | "youtube" | "webpage" | "text" | "video" | "audio";
    title: string;
    preview?: string;
};

export default function NotebookPage() {
    const params = useParams();
    const id = params.id;

    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [webUrl, setWebUrl] = useState("");
    const [pastedText, setPastedText] = useState("");
    const [sources, setSources] = useState<Source[]>([]);
    const [sourcesLoading, setSourcesLoading] = useState(false);
    const [url, setUrl] = useState("");
    const [message, setMessage] = useState("");
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const [isAddingYoutube, setIsAddingYoutube] = useState(false);
    const [isAddingWebpage, setIsAddingWebpage] = useState(false);
    const [isAddingText, setIsAddingText] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchNotebook = async () => {
            const res = await fetch(`/api/notebook/${id}`);
            const data = await res.json();

            if (!res.ok) {
                setNotebook(null);
                setLoading(false);
                return;
            }

            setNotebook(data.notebook);
            setLoading(false);
        };

        fetchNotebook();
        fetchSources();
    }, [id]);

    const fetchSources = async () => {
        setSourcesLoading(true);
        try {
            const res = await fetch(`/api/notebook/${id}/sources`);
            const data = await res.json();

            if (!res.ok) return;

            setSources(
                data.sources.map((s: any) => ({
                    id: s.id,
                    type: s.type,
                    title: s.title,
                    preview: s.fileUrl,
                }))
            );
        } catch (error) {
            toast.error("Failed to load sources, please try again");
        } finally {
            setSourcesLoading(false);
        }
    };

    // ─── Simulated progress helper ──────────────────────────────────────────────
    const simulateProgress = (uploadId: string) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 18 + 5;
            if (progress >= 90) {
                clearInterval(interval);
                progress = 90;
            }
            setUploads((prev) =>
                prev.map((u) => (u.id === uploadId ? { ...u, progress: Math.min(progress, 90) } : u))
            );
        }, 200);
        return interval;
    };

    const finalizeUpload = (uploadId: string, status: UploadStatus) => {
        setUploads((prev) =>
            prev.map((u) =>
                u.id === uploadId ? { ...u, progress: 100, status } : u
            )
        );
        // Remove from list after a delay
        setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 2500);
    };

    const getFileSourceType = (file: File): Source["type"] => {
        if (file.type.startsWith("video/")) return "video";
        if (file.type.startsWith("audio/")) return "audio";
        return "file"; // covers PDFs, docs, images, spreadsheets, text
    };

    // ─── File Upload ─────────────────────────────────────────────────────────────
    const handleFileUpload = async (files: FileList | null) => {
        if (!files) return;

        const fileArray = Array.from(files);
        const validFiles = fileArray.filter((file) =>
            [
                // Documents
                "application/pdf",
                "application/msword",                                                      // .doc
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                "application/vnd.ms-powerpoint",                                           // .ppt
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                "application/vnd.ms-excel",                                                // .xls
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
                "text/plain",                                                              // .txt
                "text/csv",                                                                // .csv
                "text/markdown",                                                           // .md
                // Images
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp",
                // Video
                "video/mp4",
                "video/webm",
                "video/quicktime",   // .mov
                // Audio
                "audio/mpeg",        // .mp3
                "audio/wav",
                "audio/ogg",
                "audio/mp4",         // .m4a
                "audio/webm",
            ].includes(file.type)
        );

        if (validFiles.length === 0) {
            toast.error("Unsupported file type");
            return;
        }

        for (const file of validFiles) {
            const uploadId = crypto.randomUUID();

            setUploads((prev) => [
                ...prev,
                { id: uploadId, name: file.name, progress: 0, status: "uploading" },
            ]);

            const interval = simulateProgress(uploadId);

            try {
                const uploaded = await uploadFile(file);
                clearInterval(interval);
                finalizeUpload(uploadId, "done");

                setSources((prev) => [
                    ...prev,
                    {
                        id: uploaded.id,
                        type: getFileSourceType(file),
                        title: uploaded.title,
                        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
                    },
                ]);
            } catch {
                clearInterval(interval);
                finalizeUpload(uploadId, "error");
                toast.error(`Failed to upload ${file.name}`);
            }
        }
    };

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("notebookId", id as string);

        const res = await fetch("/api/source", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.source;
    };

    // ─── YouTube ─────────────────────────────────────────────────────────────────
    const addVideo = async () => {
        if (!url.trim()) return;
        setIsAddingYoutube(true);

        const uploadId = crypto.randomUUID();
        setUploads((prev) => [
            ...prev,
            { id: uploadId, name: "YouTube video", progress: 0, status: "uploading" },
        ]);
        const interval = simulateProgress(uploadId);

        try {
            // Validate via oEmbed first
            const oembedRes = await fetch(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
            );

            if (!oembedRes.ok) {
                throw new Error("Invalid YouTube URL");
            }

            const oembed = await oembedRes.json();

            // Save to DB
            const res = await fetch("/api/source/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, notebookId: id, title: oembed.title }),
            });

            if (!res.ok) throw new Error("Failed to save YouTube source");
            const data = await res.json();

            clearInterval(interval);
            finalizeUpload(uploadId, "done");

            setSources((prev) => [
                ...prev,
                {
                    id: data.source.id,
                    type: "youtube",
                    title: oembed.title,
                    preview: oembed.thumbnail_url,
                },
            ]);

            setUrl("");
            toast.success("YouTube video added");
        } catch (err: any) {
            clearInterval(interval);
            finalizeUpload(uploadId, "error");
            toast.error(err.message || "Invalid YouTube URL");
        } finally {
            setIsAddingYoutube(false);
        }
    };

    // ─── Webpage ─────────────────────────────────────────────────────────────────
    const addWebpage = async () => {
        if (!webUrl.trim()) return;
        setIsAddingWebpage(true);

        const uploadId = crypto.randomUUID();
        setUploads((prev) => [
            ...prev,
            { id: uploadId, name: webUrl, progress: 0, status: "uploading" },
        ]);
        const interval = simulateProgress(uploadId);

        try {
            const res = await fetch("/api/source/webpage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: webUrl, notebookId: id }),
            });

            if (!res.ok) throw new Error("Failed to save webpage");
            const data = await res.json();

            clearInterval(interval);
            finalizeUpload(uploadId, "done");

            setSources((prev) => [
                ...prev,
                {
                    id: data.source.id,
                    type: "webpage",
                    title: data.source.title || webUrl,
                },
            ]);

            setWebUrl("");
            toast.success("Webpage added");
        } catch (err: any) {
            clearInterval(interval);
            finalizeUpload(uploadId, "error");
            toast.error(err.message || "Failed to add webpage");
        } finally {
            setIsAddingWebpage(false);
        }
    };

    // ─── Text / Notes ─────────────────────────────────────────────────────────────
    const addText = async () => {
        if (!pastedText.trim()) return;
        setIsAddingText(true);

        const uploadId = crypto.randomUUID();
        setUploads((prev) => [
            ...prev,
            { id: uploadId, name: "Text note", progress: 0, status: "uploading" },
        ]);
        const interval = simulateProgress(uploadId);

        try {
            const res = await fetch("/api/source/text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: pastedText, notebookId: id }),
            });

            if (!res.ok) throw new Error("Failed to save text");
            const data = await res.json();

            clearInterval(interval);
            finalizeUpload(uploadId, "done");

            setSources((prev) => [
                ...prev,
                {
                    id: data.source.id,
                    type: "text",
                    title: pastedText.slice(0, 60) + (pastedText.length > 60 ? "..." : ""),
                },
            ]);

            setPastedText("");
            toast.success("Text source added");
        } catch (err: any) {
            clearInterval(interval);
            finalizeUpload(uploadId, "error");
            toast.error(err.message || "Failed to add text");
        } finally {
            setIsAddingText(false);
        }
    };

    // ─── Delete Source ────────────────────────────────────────────────────────────
    const deleteSource = async (sourceId: string, index: number) => {
        if (!confirm("Are you sure you want to delete this?")) return;
        setSources((prev) => prev.filter((_, i) => i !== index));

        try {
            await fetch(`/api/source/${sourceId}`, { method: "DELETE" });
            toast.success("Source deleted successfully!")
        } catch {
            toast.error("Failed to delete source");
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
        );
    }

    if (!notebook) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4">
                <h1 className="font-semibold text-2xl">Notebook not found</h1>
                <Ghost size={40} className="animate-bounce text-gray-400" />
                <Link href="/" className="text-blue-400 hover:underline">go back</Link>
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

                {/* SIDEBAR */}
                <div
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleFileUpload(e.dataTransfer.files);
                    }}
                    className={`w-96 border-r border-zinc-800 p-4 flex flex-col gap-4 overflow-y-auto transition-all duration-200 relative ${isDragging ? "bg-[#1a1622] ring-2 ring-violet-500/40" : "bg-[#121212]"
                        }`}
                >
                    {isDragging && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="border-2 border-dashed border-violet-400 rounded-xl px-8 py-6 text-center text-sm text-white">
                                Drop files to upload
                            </div>
                        </div>
                    )}

                    {/* ADD SOURCE CARD */}
                    <div className="sticky top-0 z-10 bg-[#121212] pb-2">
                        <div className="bg-[#161616] border border-zinc-800 rounded-xl p-4 space-y-4">
                            <h2 className="text-xs uppercase tracking-wider text-zinc-500">Add Source</h2>

                            {/* FILE UPLOAD */}
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
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,image/*,video/mp4,video/webm,.mov,audio/mpeg,.wav,.ogg,.m4a"
                                onChange={(e) => handleFileUpload(e.target.files)}
                            />

                            {/* YOUTUBE */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Paste YouTube link..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addVideo()}
                                    className="flex-1 bg-[#121212] border border-zinc-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
                                />
                                <button
                                    onClick={addVideo}
                                    disabled={isAddingYoutube || !url.trim()}
                                    className="bg-zinc-700 px-3 rounded-lg hover:bg-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[48px] flex items-center justify-center"
                                >
                                    {isAddingYoutube
                                        ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        : <span className="text-sm">Add</span>
                                    }
                                </button>
                            </div>

                            {/* WEBPAGE */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add webpage URL..."
                                    value={webUrl}
                                    onChange={(e) => setWebUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addWebpage()}
                                    className="flex-1 bg-[#121212] border border-zinc-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
                                />
                                <button
                                    onClick={addWebpage}
                                    disabled={isAddingWebpage || !webUrl.trim()}
                                    className="bg-zinc-700 px-3 rounded-lg hover:bg-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[48px] flex items-center justify-center"
                                >
                                    {isAddingWebpage
                                        ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        : <Globe size={16} />
                                    }
                                </button>
                            </div>

                            {/* PASTE TEXT */}
                            <textarea
                                placeholder="Paste notes or text..."
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                className="w-full bg-[#121212] border border-zinc-700 px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:border-zinc-500"
                                rows={3}
                            />
                            <button
                                onClick={addText}
                                disabled={isAddingText || !pastedText.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-zinc-700 py-2 rounded-lg text-sm hover:bg-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAddingText
                                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    : <><Clipboard size={16} /> Add Notes</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* UPLOAD PROGRESS BARS */}
                    {uploads.length > 0 && (
                        <div className="space-y-2">
                            <h2 className="text-xs uppercase tracking-wider text-zinc-500">Uploading</h2>
                            {uploads.map((upload) => (
                                <div
                                    key={upload.id}
                                    className="bg-[#181818] border border-zinc-800 rounded-lg px-3 py-2.5 space-y-1.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-zinc-300 truncate max-w-[200px]">
                                            {upload.name}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {upload.status === "done" && (
                                                <CheckCircle size={14} className="text-emerald-400" />
                                            )}
                                            {upload.status === "error" && (
                                                <AlertCircle size={14} className="text-red-400" />
                                            )}
                                            <span className="text-xs text-zinc-500">
                                                {upload.status === "uploading"
                                                    ? `${Math.round(upload.progress)}%`
                                                    : upload.status === "done"
                                                        ? "Done"
                                                        : "Failed"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ease-out ${upload.status === "error"
                                                ? "bg-red-500"
                                                : upload.status === "done"
                                                    ? "bg-emerald-500"
                                                    : "bg-violet-500"
                                                }`}
                                            style={{ width: `${upload.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* SOURCES LIST */}
                    <div className="space-y-2">
                        <h2 className="text-xs uppercase tracking-wider text-zinc-500">
                            Sources ({sources.length})
                        </h2>

                        {sourcesLoading && (
                            <div className="flex justify-center py-6">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            </div>
                        )}

                        {!sourcesLoading && sources.length === 0 && (
                            <p className="text-xs text-zinc-500 text-center py-4">No sources added yet</p>
                        )}

                        {!sourcesLoading &&
                            sources.map((source, index) => (
                                <div
                                    key={source.id}
                                    className="group flex items-center justify-between bg-[#181818] border border-zinc-800 px-3 py-2 rounded-lg hover:bg-zinc-800 transition"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {source.preview && source.type === "file" ? (
                                            <img
                                                src={source.preview}
                                                className="w-10 h-10 rounded object-cover shrink-0"
                                                alt={source.title}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="shrink-0">
                                                {source.type === "file" && <FileText size={16} className="text-zinc-400" />}
                                                {source.type === "youtube" && <Youtube size={16} className="text-red-400" />}
                                                {source.type === "webpage" && <Globe size={16} className="text-blue-400" />}
                                                {source.type === "text" && <Clipboard size={16} className="text-yellow-400" />}
                                                {source.type === "video" && <Video size={16} className="text-purple-400" />}
                                                {source.type === "audio" && <Music size={16} className="text-green-400" />}
                                            </div>
                                        )}
                                        <span className="text-sm truncate max-w-[180px]">{source.title}</span>
                                    </div>
                                    <button
                                        onClick={() => deleteSource(source.id, index)}
                                        className="opacity-0 group-hover:opacity-100 transition shrink-0 ml-2 hover:text-red-400"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>

                {/* CHAT AREA */}
                <div className="flex flex-col flex-1">
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        <div className="text-zinc-400">Ask questions about your sources.</div>
                    </div>
                    <div className="border-t border-zinc-800 p-4 flex gap-3">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ask something about your sources..."
                            className="flex-1 bg-[#181818] px-4 py-3 rounded-lg border border-zinc-800 focus:outline-none focus:border-zinc-600"
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