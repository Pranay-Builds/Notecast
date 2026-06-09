"use client";

import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams } from "next/navigation";
import {
  Ghost,
  Share,
  UserPlus,
  Send,
  Plus,
  X,
  Image as ImageIcon,
  FileText,
  Clipboard,
  Globe,
  Youtube,
  CheckCircle,
  AlertCircle,
  Video,
  Music,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "@/app/components/CodeBlock";
import ChatInput from "@/app/components/ChatInput";

type Notebook = {
  id: string;
  name: string;
  description?: string;
  character?: any;
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
  status?: "processing" | "completed" | "failed";
};

export default function NotebookPage() {
  const params = useParams();
  const id = params.id;

  const { data: session } = useSession();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isAddingYoutube, setIsAddingYoutube] = useState(false);
  const [isAddingWebpage, setIsAddingWebpage] = useState(false);
  const [isAddingText, setIsAddingText] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileTab, setMobileTab] = useState<"sources" | "chat">("chat");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);
  const [characters, setCharacters] = useState<any[]>([]);
  const [showCharacterMenu, setShowCharacterMenu] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isSendingMessageRef = useRef(false);
  const isAddingYoutubeRef = useRef(false);
  const isAddingWebpageRef = useRef(false);
  const isAddingTextRef = useRef(false);
  const progressIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    const fetchNotebook = async () => {
      const res = await fetch(`/api/notebook/${id}`);
      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        setNotebook(null);
        setLoading(false);
        return;
      }

      setNotebook(data.notebook);
      setLoading(false);
    };

    const fetchCharacters = async () => {
      try {
        const res = await fetch("/api/character");
        const data = await res.json();

        if (!res.ok) return;

        setCharacters(data.characters);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotebook();
    fetchCharacters();
    fetchMessages();
    fetchSources();
  }, [id]);

  useEffect(() => {
    return () => {
      progressIntervalsRef.current.forEach(clearInterval);
      progressIntervalsRef.current = [];
    };
  }, []);

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
          preview: s.preview,
          status: s.status,
        })),
      );
    } catch (error) {
      toast.error("Failed to load sources, please try again");
    } finally {
      setSourcesLoading(false);
    }
  };

  const sendMessage = async (msg: string) => {
    if (isSendingMessageRef.current || !msg.trim() || !notebook?.character)
      return;

    isSendingMessageRef.current = true;

    const historyForApi = messages.slice(-10);

    const userMsg = {
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoadingMessages(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg,
          character: notebook.character,
          history: historyForApi,
          sources: sources,
          notebookId: notebook.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const botMsg = {
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      toast.error("Failed to send message");
    } finally {
      setLoadingMessages(false);
      isSendingMessageRef.current = false;
    }
  };

  const switchCharacter = async (character: any) => {
    if (character.id === notebook?.character?.id) return;

    const previousCharacter = notebook?.character;

    setNotebook((prev: any) => ({
      ...prev,
      character,
    }));

    setShowCharacterMenu(false);

    try {
      const res = await fetch(`/api/notebook/${id}/character`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newCharacterId: character.id,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      toast.success(`Switched to ${character.name}`);
    } catch {
      setNotebook((prev: any) => ({
        ...prev,
        character: previousCharacter,
      }));

      toast.error("Failed to switch character");
    }
  };

  const fetchMessages = async () => {
    if (isSendingMessageRef.current || loadingMessages) return;

    try {
      const res = await fetch(`/api/notebook/${id}/messages?limit=100`);
      const data = await res.json();

      if (!res.ok) return;

      setMessages((prev) => {
        if (isSendingMessageRef.current) return prev;
        return data.messages;
      });
    } catch (err) {
      console.error(err);
    }
  };

  useLayoutEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages, loadingMessages]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "auto" });
    });
  }, [isSidebarOpen]);

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return date.toLocaleDateString([], {
      weekday: "long", // Monday
      day: "numeric",
      month: "short", // Jan
    });
  };

  // ─── Simulated progress helper ──────────────────────────────────────────────
  const clearProgressInterval = (interval: ReturnType<typeof setInterval>) => {
    clearInterval(interval);
    progressIntervalsRef.current = progressIntervalsRef.current.filter(
      (i) => i !== interval,
    );
  };

  const simulateProgress = (uploadId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 5;
      if (progress >= 90) {
        clearProgressInterval(interval);
        progress = 90;
      }
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, progress: Math.min(progress, 90) } : u,
        ),
      );
    }, 200);
    progressIntervalsRef.current.push(interval);
    return interval;
  };

  const finalizeUpload = (uploadId: string, status: UploadStatus) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId ? { ...u, progress: 100, status } : u,
      ),
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
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.ms-powerpoint", // .ppt
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        "application/vnd.ms-excel", // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "text/plain", // .txt
        "text/csv", // .csv
        "text/markdown", // .md
        // Images
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        // Video
        "video/mp4",
        "video/webm",
        "video/quicktime", // .mov
        // Audio
        "audio/mpeg", // .mp3
        "audio/wav",
        "audio/ogg",
        "audio/mp4", // .m4a
        "audio/webm",
      ].includes(file.type),
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
        clearProgressInterval(interval);
        finalizeUpload(uploadId, "done");

        if (uploaded.status === "failed") {
          throw new Error("Extraction failed");
        }

        setSources((prev) => [
          ...prev,
          {
            id: uploaded.id,
            type: getFileSourceType(file),
            title: uploaded.title,
            status: uploaded.status || "completed",
            preview: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : undefined,
          },
        ]);
      } catch {
        clearProgressInterval(interval);
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

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.source;
  };

  // ─── YouTube ─────────────────────────────────────────────────────────────────
  const addVideo = async () => {
    if (isAddingYoutubeRef.current || !url.trim()) return;
    isAddingYoutubeRef.current = true;
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
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      );

      if (!oembedRes.ok) {
        throw new Error("Invalid YouTube URL");
      }

      const oembed = await oembedRes.json();

      const res = await fetch("/api/source/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          notebookId: id,
          title: oembed.title,
          thumbnail: oembed.thumbnail_url,
        }),
      });

      if (!res.ok) throw new Error("Failed to save YouTube source");
      const data = await res.json();

      clearProgressInterval(interval);
      finalizeUpload(uploadId, "done");

      if (data.source?.status === "failed") {
        throw new Error("Extraction failed");
      }

      setSources((prev) => [
        ...prev,
        {
          id: data.source.id,
          type: "youtube",
          title: oembed.title,
          status: data.source.status || "completed",
          preview: oembed.thumbnail_url,
        },
      ]);

      setUrl("");
      toast.success("YouTube video added");
    } catch (err: any) {
      clearProgressInterval(interval);
      finalizeUpload(uploadId, "error");
      toast.error(err.message || "Invalid YouTube URL");
    } finally {
      isAddingYoutubeRef.current = false;
      setIsAddingYoutube(false);
    }
  };

  // ─── Webpage ─────────────────────────────────────────────────────────────────
  const addWebpage = async () => {
    if (isAddingWebpageRef.current || !webUrl.trim()) return;
    isAddingWebpageRef.current = true;
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

      clearProgressInterval(interval);
      finalizeUpload(uploadId, "done");

      if (data.source?.status === "failed") {
        throw new Error("Extraction failed");
      }

      setSources((prev) => [
        ...prev,
        {
          id: data.source.id,
          type: "webpage",
          title: data.source.title || webUrl,
          status: data.source.status || "completed",
        },
      ]);

      setWebUrl("");
      toast.success("Webpage added");
    } catch (err: any) {
      clearProgressInterval(interval);
      finalizeUpload(uploadId, "error");
      toast.error(err.message || "Failed to add webpage");
    } finally {
      isAddingWebpageRef.current = false;
      setIsAddingWebpage(false);
    }
  };

  // ─── Text / Notes ─────────────────────────────────────────────────────────────
  const addText = async () => {
    if (isAddingTextRef.current || !pastedText.trim()) return;
    isAddingTextRef.current = true;
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

      clearProgressInterval(interval);
      finalizeUpload(uploadId, "done");

      if (data.source?.status === "failed") {
        throw new Error("Extraction failed");
      }

      setSources((prev) => [
        ...prev,
        {
          id: data.source.id,
          type: "text",
          title:
            pastedText.slice(0, 60) + (pastedText.length > 60 ? "..." : ""),
          status: data.source.status || "completed",
        },
      ]);

      setPastedText("");
      toast.success("Text source added");
    } catch (err: any) {
      clearProgressInterval(interval);
      finalizeUpload(uploadId, "error");
      toast.error(err.message || "Failed to add text");
    } finally {
      isAddingTextRef.current = false;
      setIsAddingText(false);
    }
  };

  // ─── Delete Source ────────────────────────────────────────────────────────────
  const deleteSource = async (sourceId: string) => {
    if (!confirm("Are you sure?")) return;

    // TODO: move delete to a non-blocking background job for large notebooks
    const previousSources = sources;
    setSources((prev) => prev.filter((s) => s.id !== sourceId));

    try {
      const res = await fetch(`/api/source/${sourceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Source deleted");
    } catch {
      setSources(previousSources);
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
        <Link href="/" className="text-blue-400 hover:underline">
          go back
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="h-screen flex flex-col bg-[#121212] text-white">
        {/* HEADER */}
        <header className="bg-[#181818] border-b border-zinc-800 h-14 flex items-center justify-between px-3 md:px-6">
          <h1 className="font-semibold text-sm md:text-lg truncate max-w-[120px] md:max-w-none">
            {notebook.name}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowCharacterMenu((prev) => !prev)}
                className="flex items-center gap-3 hover:bg-zinc-800 px-3 py-2 rounded-xl transition"
              >
                {notebook?.character?.avatarUrl ? (
                  <img
                    src={notebook.character.avatarUrl}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    👤
                  </div>
                )}

                <div className="flex flex-col text-left min-w-0">
                  <span className="hidden md:flex flex-col text-left">
                    Chatting with
                  </span>

                  <span className="text-sm font-medium text-white truncate max-w-[120px] md:max-w-none">
                    {notebook?.character?.name || "No character"}
                  </span>
                </div>
              </button>

              {showCharacterMenu && (
                <div className="absolute top-16 left-0 w-[90vw] max-w-72 bg-[#181818]">
                  <div className="p-2">
                    {characters.map((character) => (
                      <button
                        key={character.id}
                        onClick={() => switchCharacter(character)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-left hover:bg-zinc-800 ${
                          notebook?.character?.id === character.id
                            ? "bg-zinc-800"
                            : ""
                        }`}
                      >
                        {character.avatarUrl ? (
                          <img
                            src={character.avatarUrl}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                            👤
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {character.name}
                          </span>

                          <span className="text-xs text-zinc-500 truncate">
                            {character.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="hidden px-3 py-2 text-sm rounded-lg border border-zinc-700 hover:bg-zinc-800 transition md:flex"
            >
              {isSidebarOpen ? "Hide Sources" : "Show Sources"}
            </button>
          </div>
        </header>

        <div className="md:hidden flex border-b border-zinc-800 bg-[#181818]">
          <button
            onClick={() => setMobileTab("sources")}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mobileTab === "sources"
                ? "text-white border-b-2 border-white"
                : "text-zinc-400"
            }`}
          >
            Sources
          </button>

          <button
            onClick={() => setMobileTab("chat")}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mobileTab === "chat"
                ? "text-white border-b-2 border-white"
                : "text-zinc-400"
            }`}
          >
            Chat
          </button>
        </div>

        {/* MAIN */}
        <div className="flex flex-1 overflow-hidden">
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          {/* SIDEBAR */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            className={`
  ${mobileTab === "sources" ? "flex" : "hidden"}
  ${isSidebarOpen ? "md:flex" : "md:hidden"}
  flex-col
  w-full
  md:w-96
  overflow-y-auto
  transition duration-300
  border-r border-zinc-800
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
            <div className="sticky top-0 z-10 bg-[#121212] pb-2">
              <div className="bg-[#161616] border border-zinc-800 rounded-xl p-4 space-y-4">
                <h2 className="text-xs uppercase tracking-wider text-zinc-500">
                  Add Source
                </h2>

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
                    {isAddingYoutube ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="text-sm">Add</span>
                    )}
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
                    {isAddingWebpage ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Globe size={16} />
                    )}
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
                  {isAddingText ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Clipboard size={16} /> Add Notes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* UPLOAD PROGRESS BARS */}
            {uploads.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs uppercase tracking-wider text-zinc-500">
                  Uploading
                </h2>
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
                        className={`h-full rounded-full transition-all duration-300 ease-out ${
                          upload.status === "error"
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
                <p className="text-xs text-zinc-500 text-center py-4">
                  No sources added yet
                </p>
              )}

              {!sourcesLoading &&
                sources.map((source, index) => (
                  <div
                    key={source.id}
                    className={`group flex items-center justify-between bg-[#181818] border px-3 py-2 rounded-lg hover:bg-zinc-800 transition ${
                      source.status === "failed"
                        ? "border-red-900/60"
                        : "border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {source.preview && source.type === "file" ? (
                        <img
                          src={source.preview}
                          className="w-10 h-10 rounded object-cover shrink-0"
                          alt={source.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="shrink-0">
                          {source.type === "file" && (
                            <FileText size={16} className="text-zinc-400" />
                          )}
                          {source.type === "youtube" && (
                            <Youtube size={16} className="text-red-400" />
                          )}
                          {source.type === "webpage" && (
                            <Globe size={16} className="text-blue-400" />
                          )}
                          {source.type === "text" && (
                            <Clipboard size={16} className="text-yellow-400" />
                          )}
                          {source.type === "video" && (
                            <Video size={16} className="text-purple-400" />
                          )}
                          {source.type === "audio" && (
                            <Music size={16} className="text-green-400" />
                          )}
                        </div>
                      )}
                      <span className="text-sm truncate max-w-[180px]">
                        {source.title}
                      </span>
                      {source.status === "failed" && (
                        <span className="text-[10px] text-red-400 shrink-0">
                          Failed
                        </span>
                      )}
                      {source.status === "processing" && (
                        <span className="text-[10px] text-amber-400 shrink-0">
                          Processing
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSource(source.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition shrink-0 ml-2 hover:text-red-400"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* CHAT AREA */}
          <div
            className={`
    ${mobileTab === "chat" ? "flex" : "hidden"}
    md:flex
    flex-col
    flex-1
  `}
          >
            <div className="flex-1 p-2 md:p-4 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-zinc-500 text-sm px-2">
                  {notebook.character
                    ? `Ask anything... ${notebook.character.name} will help you.`
                    : "Assign a character to this notebook to start chatting."}
                </div>
              )}

              {messages.map((msg, i) => {
                const isSameSender = messages[i - 1]?.role === msg.role;

                const currentDate = new Date(msg.createdAt);
                const prevDate = messages[i - 1]
                  ? new Date(messages[i - 1].createdAt)
                  : null;

                const isNewDay =
                  !prevDate ||
                  currentDate.toDateString() !== prevDate.toDateString();

                return (
                  <React.Fragment key={msg.createdAt}>
                    {isNewDay && (
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full">
                          {formatDateLabel(currentDate)}
                        </div>
                      </div>
                    )}
                    <div
                      key={i}
                      className={`flex gap-2 md:gap-4 px-2 py-0.5 rounded hover:bg-white/[0.03] group ${
                        !isSameSender ? "mt-4" : "mt-2"
                      }`}
                    >
                      {/* Avatar column — always 40px wide */}
                      <div className="w-8 h-8 md:w-10 md:h-10 min-w-[32px] md:min-w-[40px]">
                        {!isSameSender ? (
                          <Image
                            src={
                              msg.role === "assistant"
                                ? msg?.character?.avatarUrl ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${notebook?.character?.name}`
                                : session?.user?.image ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${session?.user?.name || "User"}`
                            }
                            alt={msg.role === "assistant" ? notebook?.character?.name || "Tutor" : session?.user?.name || "You"}
                            width={40}
                            height={40}
                            className="w-10 h-10 min-w-[40px] rounded-full object-cover aspect-square mt-0.5"
                          />
                        ) : (
                          // Hover timestamp where avatar would be
                          <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity leading-[40px] select-none">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      {/* Message body */}
                      <div className="flex-1 min-w-0 relative">
                        {!isSameSender && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[15px] font-medium text-white leading-tight">
                              {msg.role === "user"
                                ? session?.user?.name || "You"
                                : notebook?.character?.name || "Tutor"}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        <div className="text-sm leading-[1.5]">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 text-[#dcddde] leading-relaxed">
                                  {children}
                                </p>
                              ),

                              ul: ({ children }) => (
                                <ul className="list-disc ml-5 mb-2 space-y-1 text-[#dcddde]">
                                  {children}
                                </ul>
                              ),

                              ol: ({ children }) => (
                                <ol className="list-decimal ml-5 mb-2 space-y-1 text-[#dcddde]">
                                  {children}
                                </ol>
                              ),

                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),

                              strong: ({ children }) => (
                                <strong className="font-semibold text-white">
                                  {children}
                                </strong>
                              ),

                              code: ({ className, children }) => {
                                const match = /language-(\w+)/.exec(
                                  className || "",
                                );
                                const lang = match ? match[1] : "code";

                                return (
                                  <CodeBlock
                                    code={String(children).replace(/\n$/, "")}
                                    lang={lang}
                                  />
                                );
                              },

                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-zinc-600 pl-3 text-zinc-400 italic mb-2">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedId(msg.createdAt);

                            setTimeout(() => {
                              setCopiedId(null);
                            }, 2000);
                          }}
                          className="
    absolute bottom-1 right-1 z-10
    opacity-100 md:opacity-0 md:group-hover:opacity-100
    transition-all duration-150
    text-zinc-400 hover:text-white
    bg-zinc-800/80 backdrop-blur
    p-1.5 rounded-md
  "
                        >
                          {copiedId === msg.createdAt ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {loadingMessages && (
                <div className="flex gap-4 px-2 py-0.5 mt-1">
                  <div className="w-10 min-w-[40px]" />
                  <p className="text-sm text-zinc-500 italic">
                    {notebook?.character?.name} is typing...
                  </p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <ChatInput
              onSend={sendMessage}
              placeholder={
                notebook.character
                  ? `Message ${notebook.character.name}`
                  : "Select a character to start chatting"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
