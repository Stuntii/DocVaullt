import { useState } from "react";
import { Cloud, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Database } from "lucide-react";
import { ConfigStatus } from "../types";

interface ConfigBannerProps {
  status: ConfigStatus | null;
}

export default function ConfigBanner({ status }: ConfigBannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!status) return null;

  return (
    <div
      className={`mb-6 rounded-xl border p-4 transition-all duration-300 ${
        status.supabaseConfigured
          ? "border-emerald-950 bg-emerald-950/20 text-emerald-200"
          : "border-amber-950/80 bg-amber-950/20 text-amber-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {status.supabaseConfigured ? (
            <div className="p-2 bg-emerald-950/80 rounded-lg text-emerald-400 mt-0.5 border border-emerald-800/50">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 bg-amber-950/80 rounded-lg text-amber-400 mt-0.5 animate-pulse border border-amber-800/50">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="font-semibold flex items-center gap-2 text-zinc-100">
              {status.supabaseConfigured ? (
                <>
                  <span>Connected to Supabase Storage</span>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </>
              ) : (
                <span className="text-amber-300">Running in Local Demo Mode</span>
              )}
            </div>
            <p className="text-sm text-zinc-300 mt-0.5 opacity-90">
              {status.supabaseConfigured
                ? `Files are being securely uploaded to and served from ${status.supabaseUrl}`
                : "Credentials are not configured in AI Studio secrets. Files are simulated locally in memory."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all ${
            status.supabaseConfigured
              ? "border-emerald-800 hover:bg-emerald-900/40 text-emerald-300"
              : "border-amber-800 hover:bg-amber-900/40 text-amber-300"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>{isOpen ? "Hide Setup Info" : "Setup Instructions"}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-dashed border-zinc-800/80 text-sm space-y-3 max-w-3xl text-zinc-300">
          <p className="font-medium text-zinc-200">To connect your own real Supabase Storage bucket:</p>
          <ol className="list-decimal list-inside space-y-2 pl-1 opacity-95">
            <li>
              Go to your{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold hover:text-cyan-400 text-cyan-500"
              >
                Supabase Dashboard
              </a>{" "}
              and create a free project.
            </li>
            <li>
              Navigate to <strong>Storage</strong> and create a new bucket named{" "}
              <code className="bg-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold text-zinc-100 border border-zinc-800">documents</code>.
            </li>
            <li>
              Make the bucket <strong>Public</strong> or add a Storage policy that allows public select/read access to all objects.
            </li>
            <li>
              Add policy permissions to allow authenticated or service users to upload and delete files.
            </li>
            <li>
              In AI Studio, open the <strong>Secrets / Environment Variables</strong> panel and set the following:
              <ul className="list-disc list-inside pl-4 mt-1 space-y-1 font-mono text-xs font-semibold text-zinc-300">
                <li>SUPABASE_URL = (Your Supabase URL)</li>
                <li>SUPABASE_ANON_KEY = (Your Supabase Anon Key)</li>
                <li>SUPABASE_SERVICE_ROLE_KEY = (Your Supabase Service Role Key)</li>
                <li>ADMIN_PASSWORD = (Choose any password for Admin login)</li>
              </ul>
            </li>
          </ol>
          <p className="text-xs text-zinc-400 italic mt-1">
            Note: Once you save the secret variables, the application dev server will automatically reload and connect.
          </p>
        </div>
      )}
    </div>
  );
}
