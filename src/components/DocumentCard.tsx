import { motion } from "motion/react";
import { Download, Trash2, Calendar, HardDrive, FileText, ExternalLink } from "lucide-react";
import { DocumentItem } from "../types";

interface DocumentCardProps {
  key?: string;
  doc: DocumentItem;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function DocumentCard({ doc, isAdmin, onDelete, isDeleting }: DocumentCardProps) {
  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Check file type
  const isPdf = doc.fileType.toLowerCase().includes("pdf") || doc.fileName.toLowerCase().endsWith(".pdf");
  const isWord =
    doc.fileType.toLowerCase().includes("word") ||
    doc.fileType.toLowerCase().includes("officedocument") ||
    doc.fileName.toLowerCase().endsWith(".doc") ||
    doc.fileName.toLowerCase().endsWith(".docx");

  const formattedDate = new Date(doc.uploadedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative border border-[#27272a] bg-[#111114] rounded-xl p-5 hover:border-cyan-900/50 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Absolute positioning for Admin Controls */}
      {isAdmin && (
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
              onDelete(doc.id);
            }
          }}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all border border-transparent hover:border-rose-900/50 disabled:opacity-50"
          title="Delete Document"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      )}

      <div>
        {/* Document Header Info */}
        <div className="flex items-start gap-3.5 mb-3 pr-8">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isPdf
                ? "bg-rose-950/25 text-rose-500 border border-rose-900/40"
                : isWord
                ? "bg-cyan-950/25 text-cyan-400 border border-cyan-900/40"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            }`}
          >
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span
              className={`inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full mb-1 border ${
                isPdf
                  ? "bg-rose-950/40 text-rose-400 border-rose-900/30"
                  : isWord
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-900/30"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              {isPdf ? "PDF" : isWord ? "Word" : "Document"}
            </span>
            <h3 className="font-semibold text-zinc-100 text-base leading-snug break-words group-hover:text-cyan-400 transition-colors">
              {doc.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-3">
          {doc.description || <span className="text-zinc-600 italic">No description provided.</span>}
        </p>
      </div>

      {/* Footer Info */}
      <div className="border-t border-zinc-800/80 pt-3.5 mt-auto">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-medium mb-3">
          <div className="flex items-center gap-1.5" title="Upload Date">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5" title="File Size">
            <HardDrive className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatBytes(doc.fileSize)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {doc.publicUrl && doc.publicUrl !== "#" ? (
            <a
              href={doc.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 rounded-lg transition-all duration-200 border border-cyan-600/20 hover:border-cyan-600/30"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </a>
          ) : (
            <button
              onClick={() => alert("This document is available for search and preview simulation only in Demo Mode.")}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 rounded-lg transition-all duration-200 border border-cyan-600/20 hover:border-cyan-600/30"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
