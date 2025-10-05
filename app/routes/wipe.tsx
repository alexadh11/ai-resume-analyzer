import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSupabaseStore } from "~/lib/supabase";

interface StorageFile {
  path: string;
  downloadURL: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
}

const WipeApp = () => {
  const { auth, isLoading, error, clearError, fs, db } = useSupabaseStore();
  const navigate = useNavigate();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [deleting, setDeleting] = useState(false);

  const loadFiles = async () => {
    const files = await fs.readDir("./");
    if (files) {
      setFiles(files);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/wipe");
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete all app data? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      // Delete all files
      for (const file of files) {
        await fs.delete(file.path);
      }

      // Flush KV store
      await db.flush();

      // Reload files
      await loadFiles();
      alert("All app data has been wiped successfully.");
    } catch (err) {
      console.error("Error wiping data:", err);
      alert("Failed to wipe some data. Check console for details.");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error {error}</div>;
  }

  return (
    <div>
      Authenticated as: {auth.user?.email || auth.user?.displayName || "Unknown"}
      <div>Existing files:</div>
      <div className="flex flex-col gap-4">
        {files.length === 0 ? (
          <p className="text-gray-500">No files found</p>
        ) : (
          files.map((file) => (
            <div key={file.path} className="flex flex-row gap-4">
              <p>{file.name}</p>
              <span className="text-gray-500 text-sm">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          ))
        )}
      </div>
      <div>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleDelete}
          disabled={deleting || files.length === 0}
        >
          {deleting ? "Wiping..." : "Wipe App Data"}
        </button>
      </div>
    </div>
  );
};

export default WipeApp;