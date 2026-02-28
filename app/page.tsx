"use client";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

const Home = () => {
  const [isDragging, setIsDragging] = useState(false);
  type UploadFile = {
    id: string;
    file: File;
    preview?: string;
  };

  const [files, setFiles] = useState<UploadFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);

    // Validate file types (PDF or images)
    const validFiles = fileArray.filter((file) =>
      ["application/pdf", "image/jpeg", "image/png"].includes(file.type),
    );

    if (validFiles.length === 0) {
      toast.error("Please upload a valid PDF or image file.");
      return;
    }

    if (files.length + validFiles.length > 20) {
      toast.error("Maximum 20 files allowed total.");
      return;
    }

    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const newFiles = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeImage = (indexToRemove: number) => {
    setFiles((prev) => {
      const updated = [...prev];

      // Clean memory
      if (updated[indexToRemove].preview) {
        URL.revokeObjectURL(updated[indexToRemove].preview);
      }

      updated.splice(indexToRemove, 1);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121016] via-[#101010] to-[#101010] flex flex-col gap-8 justify-center items-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-white">Notecast</h1>
        <p className="text-gray-400 mt-3 max-w-md">
          Turn your notes, lectures, and PDFs into AI-generated podcast
          conversations.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`
          w-full max-w-md h-48
          rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center
          transition-all duration-200
          cursor-pointer
          ${
            isDragging
              ? "border-violet-400 bg-[#1a1622] ring-4 ring-violet-500/10 scale-[1.01]"
              : "border-[#2a2a2a] bg-[#161616]"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          id="imageUpload"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        <p className="text-white font-medium">
          {isDragging ? "Release to upload" : "Drag & drop your PDF or images"}
        </p>
        <label htmlFor="imageUpload" className="text-sm text-gray-500 mt-2">
          or click to upload
        </label>
      </div>

      {files.length > 0 && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Selected Files</span>
            <span>{files.length} / 20</span>
          </div>

          <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {files.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() =>
                    removeImage(files.findIndex((f) => f.id === item.id))
                  }
                  className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>

                {item.file.type.startsWith("image/") ? (
                  <img
                    src={item.preview}
                    alt="preview"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-24 bg-[#1a1a1a] rounded-lg flex flex-col items-center justify-center text-sm">
                    PDF
                    <span className="text-xs text-gray-400 mt-1 truncate px-2">
                      {item.file.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YouTube Input */}
      <div className="w-full max-w-md">
        <input
          type="text"
          placeholder="Paste YouTube video link..."
          className="
            w-full
            bg-[#181818]
            text-white
            placeholder-gray-500
            px-4 py-3
            rounded-xl
            border border-[#2a2a2a]
            focus:outline-none
            focus:border-white/40
            focus:ring-2
            focus:ring-white/10
            transition-all
          "
        />
      </div>

      {/* Button */}
      <button
        className="
        bg-white text-black
        px-6 py-2
        rounded-full
        text-sm font-medium
        hover:bg-gray-200
        transition-colors
      "
      >
        Create Podcast +
      </button>
    </div>
  );
};

export default Home;
