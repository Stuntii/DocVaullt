import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, SlidersHorizontal, ArrowUpDown, XCircle, FileText, Info, Library } from "lucide-react";

import { DocumentItem, ConfigStatus } from "./types";
import ConfigBanner from "./components/ConfigBanner";
import DocumentCard from "./components/DocumentCard";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  // Core application states
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  
  // UI Interaction states
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "pdf" | "word">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");

  // Check for stored admin token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("admin_token");
    if (storedToken) {
      setAdminToken(storedToken);
    }
    fetchConfigStatus();
    fetchDocuments();
  }, []);

  // Fetch Supabase configuration status
  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-status");
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch configuration status:", err);
    }
  };

  // Fetch searchable documents list
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin login handler
  const handleAdminLogin = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminToken(data.token);
        localStorage.setItem("admin_token", data.token);
        return true;
      }
    } catch (err) {
      console.error("Admin login error:", err);
    }
    return false;
  };

  // Admin logout handler
  const handleAdminLogout = async () => {
    if (adminToken) {
      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    setAdminToken(null);
    localStorage.removeItem("admin_token");
  };

  // Admin upload file handler
  const handleFileUpload = async (formData: FormData): Promise<boolean> => {
    if (!adminToken) return false;
    setIsUploading(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        // Refresh document list
        await fetchDocuments();
        return true;
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
    return false;
  };

  // Admin delete file handler
  const handleFileDelete = async (id: string) => {
    if (!adminToken) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        // Update local state directly for fast feedback
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete document");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("An unexpected error occurred while deleting");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Client-side search and filtering logic
  const filteredAndSortedDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Search query filter
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          doc.title.toLowerCase().includes(query) ||
          doc.description.toLowerCase().includes(query) ||
          doc.fileName.toLowerCase().includes(query);

        // File type filter
        const fileName = doc.fileName.toLowerCase();
        const isPdf = doc.fileType.toLowerCase().includes("pdf") || fileName.endsWith(".pdf");
        const isWord =
          doc.fileType.toLowerCase().includes("word") ||
          doc.fileType.toLowerCase().includes("officedocument") ||
          fileName.endsWith(".docx") ||
          fileName.endsWith(".doc");

        let matchesType = true;
        if (fileTypeFilter === "pdf") matchesType = isPdf;
        if (fileTypeFilter === "word") matchesType = isWord;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        // Sorting logic
        if (sortBy === "newest") {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        }
        if (sortBy === "az") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "za") {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [documents, searchQuery, fileTypeFilter, sortBy]);

  // Reset all search and filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setFileTypeFilter("all");
    setSortBy("newest");
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased selection:bg-cyan-500/10 selection:text-cyan-300">
      {/* High-fidelity Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-[#27272a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-cyan-600/10">
              <Library className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-100 text-lg leading-tight uppercase tracking-tight">DocVault</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Public Access Directory</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminToken ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>Admin Session</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500 font-semibold hidden sm:inline-block">
                Public Mode
              </span>
            )}
            
            <a
              href="#admin-workspace"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all sm:hidden"
            >
              Admin Login
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Supabase Status & Instructions */}
        <ConfigBanner status={configStatus} />

        {/* Dashboard Intro Hero Card */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 text-white rounded-2xl p-6 sm:p-8 mb-8 border border-[#27272a] shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.1),rgba(255,255,255,0))]"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-2 font-sans">
              Public Archives
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-medium">
              Browse the official searchable index of policies, handbooks, reports, and administrative forms. Real-time updates hosted securely on Supabase Storage.
            </p>
          </div>
        </div>

        {/* Interactive Layout Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Left Document Browsing Section (2/3 width) */}
          <section className="lg:col-span-2 space-y-6">
            
            {/* Filters, Sorting, and Search Bar */}
            <div className="bg-[#111114] border border-[#27272a] rounded-xl p-4.5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute inset-y-0 left-3.5 my-auto h-4.5 w-4.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search document gallery by title or description..."
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg py-2.5 pl-10 pr-4 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-600 text-zinc-100"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300"
                    >
                      <XCircle className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>

                {/* Sort Option */}
                <div className="relative shrink-0 flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-400">
                  <ArrowUpDown className="h-4 w-4 text-zinc-500" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent focus:outline-none text-zinc-300 font-semibold cursor-pointer pr-1"
                  >
                    <option value="newest" className="bg-[#111114]">Newest Uploads</option>
                    <option value="oldest" className="bg-[#111114]">Oldest Uploads</option>
                    <option value="az" className="bg-[#111114]">Alphabetical A-Z</option>
                    <option value="za" className="bg-[#111114]">Alphabetical Z-A</option>
                  </select>
                </div>
              </div>

              {/* Filtering pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#27272a]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mr-1">Filter:</span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setFileTypeFilter("all")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                        fileTypeFilter === "all"
                          ? "bg-cyan-600/10 text-cyan-400 border-cyan-600/20"
                          : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      All Files
                    </button>
                    <button
                      onClick={() => setFileTypeFilter("pdf")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                        fileTypeFilter === "pdf"
                          ? "bg-rose-950/40 text-rose-400 border-rose-900/30 animate-pulse"
                          : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      PDFs
                    </button>
                    <button
                      onClick={() => setFileTypeFilter("word")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                        fileTypeFilter === "word"
                          ? "bg-cyan-950/40 text-cyan-400 border-cyan-900/30"
                          : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      Word / DOCX
                    </button>
                  </div>
                </div>

                {/* Clear all state indicator */}
                {(searchQuery || fileTypeFilter !== "all" || sortBy !== "newest") && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-cyan-400 font-bold hover:text-cyan-300 transition-all flex items-center gap-1"
                  >
                    <span>Clear Active Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Listing View */}
            <div>
              {isLoading ? (
                // Loading Skeleton Layout
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-[#111114] border border-[#27272a] rounded-xl p-5 space-y-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="h-11 w-11 bg-zinc-800 rounded-xl"></div>
                        <div className="space-y-2 flex-1 pt-1">
                          <div className="h-3 w-12 bg-zinc-800 rounded-full"></div>
                          <div className="h-4 w-5/6 bg-zinc-800 rounded-lg"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-zinc-800 rounded"></div>
                        <div className="h-3 w-4/5 bg-zinc-800 rounded"></div>
                      </div>
                      <div className="border-t border-zinc-800 pt-3 flex gap-2 justify-between">
                        <div className="h-3.5 w-1/3 bg-zinc-800 rounded"></div>
                        <div className="h-8 w-1/2 bg-zinc-800 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedDocuments.length > 0 ? (
                // Document List Grid
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        isAdmin={!!adminToken}
                        onDelete={handleFileDelete}
                        isDeleting={isDeletingId === doc.id}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                // Empty State Illustration
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#111114] border border-[#27272a] rounded-xl p-10 text-center max-w-lg mx-auto mt-6"
                >
                  <XCircle className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                  <h3 className="font-bold text-zinc-200 text-base mb-1">No documents matched your criteria</h3>
                  <p className="text-zinc-500 text-xs font-semibold leading-relaxed mb-4">
                    Try adjusting your search keywords, clearing filters, or check if documents are uploaded yet.
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-all cursor-pointer"
                  >
                    Reset Search & Filters
                  </button>
                </motion.div>
              )}
            </div>
          </section>

          {/* Side Right Admin Panel (1/3 width) */}
          <section id="admin-workspace" className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <AdminPanel
                token={adminToken}
                onLogin={handleAdminLogin}
                onLogout={handleAdminLogout}
                onUpload={handleFileUpload}
                isUploading={isUploading}
              />

              {/* Quick Info Box */}
              <div className="bg-[#111114] border border-[#27272a] rounded-xl p-5">
                <div className="flex gap-2.5 items-start">
                  <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-zinc-300 text-xs uppercase tracking-wide">Secure Storage System</h4>
                    <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed mt-1">
                      This index is backed directly by secure Supabase Storage buckets. Access policies are enforced to ensure public read-only and strict administrator-only modifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Modern, clean Footer */}
      <footer className="bg-[#09090b] border-t border-[#27272a] mt-20 py-8 text-center text-xs text-zinc-600 font-semibold">
        <p>© 2026 DocVault Portal. All public documents are published for informative purposes.</p>
        <p className="mt-1 opacity-70">Powered by Supabase Storage & AI Studio</p>
      </footer>
    </div>
  );
}
