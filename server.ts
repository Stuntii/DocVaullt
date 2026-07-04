import express from "express";
import path from "path";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON body parsing
app.use(express.json());

// In-memory sessions store for Admin login
const adminSessions = new Set<string>();

// Local in-memory store for fallback/demo mode when Supabase is not configured
let localDocuments: Array<{
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  publicUrl: string;
  uploadedAt: string;
}> = [
  {
    id: "demo-doc-1",
    title: "Project Proposal Guidelines.pdf",
    description: "Official guide for writing and submitting project proposals for the 2026 fiscal year.",
    fileName: "Project_Proposal_Guidelines.pdf",
    fileSize: 1245000, // ~1.2 MB
    fileType: "application/pdf",
    publicUrl: "#",
    uploadedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-doc-2",
    title: "Employee Handbook 2026.docx",
    description: "Updated rules, policies, benefits, and guidelines for all full-time and part-time staff.",
    fileName: "Employee_Handbook_2026.docx",
    fileSize: 452000, // ~450 KB
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    publicUrl: "#",
    uploadedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
];

// Suppress unhandled rejections to prevent server crash
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// Global Supabase Connection/Key validation error tracker
let supabaseConnectionError: string | null = null;

// Helper to clean and sanitize environment variables (removes quotes, trailing spaces/newlines, carriage returns, etc.)
function cleanEnvVar(val: string | undefined): string | null {
  if (!val) return null;
  let cleaned = val.toString().trim();
  
  // Strip out any surrounding whitespace, tabs, carriage returns, or newlines
  cleaned = cleaned.replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");
  
  // Recursively strip out any surrounding single or double quotes
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("`") && cleaned.endsWith("`"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Clean potential backslashed quotes from some terminal exports
  cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'");
  
  // Re-strip just in case
  cleaned = cleaned.trim();
  
  return cleaned || null;
}

// Get cleaned and validated configuration
function getCleanedSupabaseConfig() {
  const url = cleanEnvVar(process.env.SUPABASE_URL);
  const anonKey = cleanEnvVar(process.env.SUPABASE_ANON_KEY);
  const serviceKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const isConfigured =
    !!url &&
    url !== "https://your-project.supabase.co" &&
    !!anonKey &&
    anonKey !== "your-supabase-anon-key" &&
    !!serviceKey &&
    serviceKey !== "your-supabase-service-role-key";

  return {
    isConfigured,
    url,
    anonKey,
    serviceKey,
  };
}

// Validate Supabase keys for common formatting/pasting errors (Invalid Compact JWS)
function validateSupabaseKeys(): string | null {
  const config = getCleanedSupabaseConfig();
  if (!config.isConfigured) {
    return null; // Not configured at all
  }
  
  if (!config.url!.startsWith("http://") && !config.url!.startsWith("https://")) {
    return "SUPABASE_URL is malformed. It must start with http:// or https://";
  }

  const validateJwt = (key: string, name: string): string | null => {
    const parts = key.split(".");
    if (parts.length !== 3) {
      return `${name} is malformed (has ${parts.length} parts instead of 3). A valid Supabase JWT key must have three parts separated by dots. Check if it was truncated when pasting.`;
    }
    if (!key.startsWith("eyJ")) {
      return `${name} is invalid. Standard Supabase API keys are JWT tokens starting with 'eyJ'.`;
    }
    if (key.length < 50) {
      return `${name} is too short. It should be a long base64-encoded token.`;
    }
    return null;
  };

  const anonErr = validateJwt(config.anonKey!, "SUPABASE_ANON_KEY");
  if (anonErr) return anonErr;

  const serviceErr = validateJwt(config.serviceKey!, "SUPABASE_SERVICE_ROLE_KEY");
  if (serviceErr) return serviceErr;

  return null;
}

// Helper: Check if Supabase configuration is present
function isSupabaseConfigured(): boolean {
  return getCleanedSupabaseConfig().isConfigured;
}

// Lazy-initialize Supabase client
function getSupabaseClient() {
  const config = getCleanedSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }
  return createClient(
    config.url!,
    config.serviceKey! // Use service key for server-side operations
  );
}

// Setup multer for memory storage file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // Limit to 15MB
  },
});

// Middleware: Authenticate admin request
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  const token = authHeader.substring(7);
  if (!adminSessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized session or expired token" });
  }
  next();
}

// --- API ROUTES ---

// 1. Get configuration status
app.get("/api/config-status", async (req, res) => {
  const validationError = validateSupabaseKeys();
  if (validationError) {
    supabaseConnectionError = validationError;
  } else if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
          console.error("Error listing buckets on config-status check:", bucketsError);
          // If the error is JWT-related, make it highly actionable
          const errMsg = bucketsError.message || "";
          if (errMsg.includes("Invalid Compact JWS") || errMsg.includes("invalid JWT") || errMsg.includes("JWS") || errMsg.includes("JWT")) {
            supabaseConnectionError = "The Service Role API key is invalid (Invalid Compact JWS). Please check your SUPABASE_SERVICE_ROLE_KEY inside Secrets. Ensure it's copied completely from Supabase Dashboard -> Settings -> API, with 3 dot-separated parts, and contains no wrapping quotes.";
          } else {
            supabaseConnectionError = bucketsError.message || "Invalid credentials / connection error";
          }
        } else {
          // Connection succeeded, reset error
          supabaseConnectionError = null;
        }
      } catch (e: any) {
        console.error("Exception listing buckets on config-status check:", e);
        supabaseConnectionError = e?.message || "Connection exception";
      }
    }
  } else {
    supabaseConnectionError = null;
  }

  res.json({
    supabaseConfigured: isSupabaseConfigured() && !supabaseConnectionError,
    supabaseUrl: getCleanedSupabaseConfig().url,
    supabaseError: supabaseConnectionError,
  });
});

// 2. Admin login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (password === configuredPassword) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    adminSessions.add(token);
    return res.json({ token });
  }

  return res.status(401).json({ error: "Incorrect password" });
});

// 3. Admin logout
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    adminSessions.delete(token);
  }
  res.json({ success: true });
});

// 4. Fetch documents (public searchable list)
app.get("/api/documents", async (req, res) => {
  try {
    const validationError = validateSupabaseKeys();
    if (validationError) {
      supabaseConnectionError = validationError;
      return res.json(localDocuments);
    }

    const supabase = getSupabaseClient();
    if (!supabase || supabaseConnectionError) {
      // Return local documents in demo/fallback mode
      return res.json(localDocuments);
    }

    // Try to retrieve metadata.json from Supabase Storage 'documents' bucket
    const bucketName = "documents";
    
    // First, verify bucket exists or attempt to create it if we have permission
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      const errMsg = bucketsError.message || "";
      if (errMsg.includes("Invalid Compact JWS") || errMsg.includes("invalid JWT") || errMsg.includes("JWS") || errMsg.includes("JWT")) {
        supabaseConnectionError = "The Service Role API key is invalid (Invalid Compact JWS). Please check your SUPABASE_SERVICE_ROLE_KEY inside Secrets.";
      } else {
        supabaseConnectionError = errMsg || "Invalid credentials / connection error";
      }
      // Return local documents in demo/fallback mode on error
      return res.json(localDocuments);
    }

    // Reset error if listing buckets succeeded
    supabaseConnectionError = null;

    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      // Attempt to auto-create the bucket (set public: true)
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 15 * 1024 * 1024,
      });
      if (createError) {
        console.warn("Failed to auto-create bucket 'documents':", createError.message);
        supabaseConnectionError = createError.message;
        return res.json(localDocuments);
      }
    }

    // Download metadata.json from bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download("metadata.json");

    if (downloadError) {
      // If metadata.json doesn't exist, it means no files are uploaded yet. Return empty array.
      if (downloadError.message.includes("Object not found") || (downloadError as any).status === 404) {
        return res.json([]);
      }
      console.error("Error downloading metadata.json:", downloadError);
      supabaseConnectionError = downloadError.message;
      return res.json(localDocuments);
    }

    const text = await fileData.text();
    const docs = JSON.parse(text);
    return res.json(docs);
  } catch (err: any) {
    console.error("Unhandled error in GET /api/documents:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred" });
  }
});

// 5. Admin upload document
app.post("/api/admin/upload", authenticateAdmin, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file was uploaded" });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Document title is required" });
    }

    const originalName = file.originalname;
    // Generate simple sanitized path-friendly name
    const timestamp = Date.now();
    const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

    const supabase = getSupabaseClient();
    if (supabase && supabaseConnectionError) {
      return res.status(400).json({ error: `Supabase connection error: ${supabaseConnectionError}. Verify your keys in secrets.` });
    }

    if (!supabase) {
      // Demo fallback mode: Save file in localDocuments in-memory list
      // Generate a mock download URL or object URL
      const mockDoc = {
        id: "local-" + timestamp,
        title,
        description: description || "",
        fileName: originalName,
        fileSize: file.size,
        fileType: file.mimetype,
        publicUrl: "javascript:alert('Demo Mode: File downloads are simulated in demo mode.')",
        uploadedAt: new Date().toISOString(),
      };
      localDocuments.unshift(mockDoc);
      return res.json({ success: true, document: mockDoc });
    }

    const bucketName = "documents";

    // 1. Upload the document file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading file to Supabase Storage:", uploadError);
      return res.status(500).json({ error: "Supabase Storage Upload failed: " + uploadError.message });
    }

    // 2. Get the public download URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uniqueFileName);
    const publicUrl = urlData.publicUrl;

    // 3. Update the metadata.json
    let currentDocs: any[] = [];
    const { data: metadataFile, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download("metadata.json");

    if (!downloadError && metadataFile) {
      try {
        const text = await metadataFile.text();
        currentDocs = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse existing metadata.json, creating a new one:", e);
      }
    }

    const newDoc = {
      id: "supabase-" + timestamp,
      title,
      description: description || "",
      fileName: originalName,
      fileSize: file.size,
      fileType: file.mimetype,
      publicUrl,
      storagePath: uniqueFileName,
      uploadedAt: new Date().toISOString(),
    };

    currentDocs.unshift(newDoc);

    // 4. Upload the updated metadata.json back to Supabase
    const { error: metadataUploadError } = await supabase.storage
      .from(bucketName)
      .upload("metadata.json", Buffer.from(JSON.stringify(currentDocs, null, 2)), {
        contentType: "application/json",
        upsert: true,
      });

    if (metadataUploadError) {
      console.error("Error uploading metadata.json:", metadataUploadError);
      return res.status(500).json({ error: "Failed to update documents index: " + metadataUploadError.message });
    }

    return res.json({ success: true, document: newDoc });
  } catch (err: any) {
    console.error("Unhandled error in POST /api/admin/upload:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred" });
  }
});

// 6. Admin delete document
app.delete("/api/admin/documents/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    if (supabase && supabaseConnectionError) {
      return res.status(400).json({ error: `Supabase connection error: ${supabaseConnectionError}. Verify your keys in secrets.` });
    }

    if (!supabase) {
      // Demo fallback mode
      const index = localDocuments.findIndex((d) => d.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Document not found" });
      }
      localDocuments.splice(index, 1);
      return res.json({ success: true });
    }

    const bucketName = "documents";

    // 1. Fetch current metadata.json
    const { data: metadataFile, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download("metadata.json");

    if (downloadError) {
      console.error("Error downloading metadata for deletion:", downloadError);
      return res.status(500).json({ error: "Failed to download index for deletion: " + downloadError.message });
    }

    let currentDocs: any[] = [];
    try {
      const text = await metadataFile.text();
      currentDocs = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: "Metadata file is corrupted" });
    }

    const docIndex = currentDocs.findIndex((d) => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document not found in database index" });
    }

    const docToDelete = currentDocs[docIndex];
    const storagePath = docToDelete.storagePath;

    // 2. Delete the actual file from Supabase Storage if storagePath exists
    if (storagePath) {
      const { error: deleteError } = await supabase.storage.from(bucketName).remove([storagePath]);
      if (deleteError) {
        console.warn("Failed to delete physical file from storage, proceeding to update index:", deleteError.message);
      }
    }

    // 3. Remove the document from the list and write back metadata.json
    currentDocs.splice(docIndex, 1);
    
    const { error: metadataUploadError } = await supabase.storage
      .from(bucketName)
      .upload("metadata.json", Buffer.from(JSON.stringify(currentDocs, null, 2)), {
        contentType: "application/json",
        upsert: true,
      });

    if (metadataUploadError) {
      console.error("Error updating metadata.json after deletion:", metadataUploadError);
      return res.status(500).json({ error: "Failed to update database index: " + metadataUploadError.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Unhandled error in DELETE /api/admin/documents:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred" });
  }
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Document Portal Server] running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
