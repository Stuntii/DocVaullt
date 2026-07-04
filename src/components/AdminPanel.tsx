import React, { useState, useRef } from "react";
import { Lock, LogIn, LogOut, Upload, FileUp, X, FileText, AlertCircle, Eye, EyeOff } from "lucide-react";

interface AdminPanelProps {
  token: string | null;
  onLogin: (password: string) => Promise<boolean>;
  onLogout: () => void;
  onUpload: (formData: FormData) => Promise<boolean>;
  isUploading: boolean;
}

export default function AdminPanel({ token, onLogin, onLogout, onUpload, isUploading }: AdminPanelProps) {
  // Login states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Upload form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setLoginError("Please enter the admin password");
      return;
    }
    setLoginError("");
    setIsLoggingIn(true);
    const success = await onLogin(password);
    setIsLoggingIn(false);
    if (!success) {
      setLoginError("Incorrect password. Please try again.");
    } else {
      setPassword("");
    }
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Validate that the file is Word or PDF
  const validateAndSetFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isWord =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword" ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc");

    if (!isPdf && !isWord) {
      setUploadError("Only Word (.doc, .docx) and PDF (.pdf) files are supported");
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File exceeds the maximum 15MB size limit");
      setSelectedFile(null);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
    
    // Auto-fill title with file name if empty
    if (!title) {
      const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      // Clean up underscores and dashes for nicer initial title
      setTitle(nameWithoutExtension.replace(/[_-]/g, " "));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Upload submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setUploadError("Document title is required");
      return;
    }
    if (!selectedFile) {
      setUploadError("Please select a file to upload");
      return;
    }

    setUploadError("");
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("file", selectedFile);

    const success = await onUpload(formData);
    if (success) {
      // Clear form
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setUploadError("Failed to upload document. Please try again.");
    }
  };

  // Render Admin Login Form
  if (!token) {
    return (
      <div className="bg-[#111114] border border-[#27272a] rounded-xl p-6 h-full">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-zinc-900 rounded-lg text-zinc-300 border border-zinc-800">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-zinc-100 text-lg">Admin Access Portal</h2>
            <p className="text-xs text-zinc-500 font-medium">Log in to upload and manage documents</p>
          </div>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoggingIn}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg py-2.5 pl-3.5 pr-10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-600 text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="flex items-start gap-2 text-rose-400 bg-rose-950/25 border border-rose-900/40 p-3 rounded-lg text-xs leading-normal">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isLoggingIn ? (
              <span className="h-4 w-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>Log In</span>
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#27272a] text-center">
          <p className="text-[11px] text-zinc-500">
            Default password is <code className="bg-zinc-900 px-1 py-0.5 rounded font-mono font-bold text-zinc-400 border border-zinc-800">admin123</code> if not configured in secrets
          </p>
        </div>
      </div>
    );
  }

  // Render Admin Upload Controls
  return (
    <div className="bg-[#111114] border border-[#27272a] rounded-xl p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/30 text-cyan-400 border border-cyan-900/30 rounded-lg">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-100 text-lg">Admin Workspace</h2>
              <p className="text-xs text-cyan-400 font-semibold">Upload New PDF or Word Document</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-all border border-transparent hover:border-zinc-800"
            title="Log Out Admin"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title"
              disabled={isUploading}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3.5 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-600 text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this document about?"
              rows={2}
              disabled={isUploading}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3.5 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-600 text-zinc-100 resize-none"
            />
          </div>

          {/* Drag & Drop Upload Container */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              File Attachment
            </label>
            
            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-cyan-600 bg-cyan-950/20"
                    : "border-zinc-800 bg-[#18181b] hover:bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={isUploading}
                />
                
                <Upload className="mx-auto h-8 w-8 text-zinc-600 mb-2 group-hover:text-cyan-500" />
                <p className="text-sm font-semibold text-zinc-300">Drag & drop your file here</p>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  or click to browse from device (PDF, Word up to 15MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-emerald-900/50 bg-emerald-950/10 p-3.5 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate pr-2">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-500 font-semibold">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-all border border-transparent hover:border-zinc-800"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 text-rose-400 bg-rose-950/25 border border-rose-900/40 p-3 rounded-lg text-xs leading-normal">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !selectedFile || !title}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
          >
            {isUploading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                <span>Uploading to Supabase...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload Document</span>
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="text-[10px] text-zinc-500 font-semibold text-center mt-6">
        🔒 Active Secure Session
      </div>
    </div>
  );
}
