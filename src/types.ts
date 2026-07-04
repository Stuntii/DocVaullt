export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  publicUrl: string;
  uploadedAt: string;
  storagePath?: string;
}

export interface ConfigStatus {
  supabaseConfigured: boolean;
  supabaseUrl: string | null;
  supabaseError?: string | null;
}
