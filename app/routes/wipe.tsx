import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSupabaseStore, supabase, type Resume } from "~/lib/supabase";

interface StorageFile {
  path: string;
  downloadURL: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
}

const WipeApp = () => {
  const { auth, fs, db, getUserResumes, isLoading } = useSupabaseStore();
  const navigate = useNavigate();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [deleting, setDeleting] = useState(false);

  const currentUser = auth?.user ?? null;

  // Redirect if user not logged in
  useEffect(() => {
    if (!isLoading && !currentUser) {
      console.warn("User not logged in — redirecting to /auth");
      navigate("/auth");
    }
  }, [isLoading, currentUser, navigate]);

  const loadFiles = async () => {
    try {
      const files = await fs.readDir("./");
      if (files) setFiles(files);
    } catch (err) {
      console.error("Error loading files:", err);
    }
  };

  const loadResumes = async () => {
    try {
      const resumeList = await getUserResumes();
      setResumes(resumeList);
    } catch (err) {
      console.error("Error loading resumes:", err);
    }
  };

  useEffect(() => {
    loadFiles();
    loadResumes();
  }, []);

  const handleDelete = async () => {
    if (
      !confirm(
        "⚠️ WARNING: This will permanently delete ALL resumes, files, and data. This CANNOT be undone. Are you sure?"
      )
    )
      return;

    setDeleting(true);
    try {
      console.log("Starting deletion process...");

      // ✅ Check user explicitly
      if (currentUser) {
        console.log(`Deleting ${resumes.length} resume records from database...`);

        const { error: deleteError } = await supabase
          .from("resumes")
          .delete()
          .eq("user_id", currentUser.id);

        if (deleteError) {
          console.error("Error deleting resumes from database:", deleteError);
          throw deleteError;
        }

        console.log("✓ Database records deleted");

        console.log("Deleting resume images from storage...");
        const { data: storageFiles, error: listError } = await supabase
          .storage
          .from("resumes")
          .list(`resumes/${currentUser.id}`);

        if (listError) {
          console.error("Error listing storage files:", listError);
        } else if (storageFiles && storageFiles.length > 0) {
          const filePaths = storageFiles.map(
            (file) => `resumes/${currentUser.id}/${file.name}`
          );
          const { error: storageDeleteError } = await supabase
            .storage
            .from("resumes")
            .remove(filePaths);

          if (storageDeleteError) {
            console.error("Error deleting from storage:", storageDeleteError);
          } else {
            console.log(`✓ Deleted ${filePaths.length} files from storage`);
          }
        }
      } else {
        console.log("User not logged in. Skipping personal resume/storage deletion.");
      }

      console.log(`Deleting ${files.length} local files...`);
      for (const file of files) {
        try {
          await fs.delete(file.path);
          console.log(`✓ Deleted: ${file.name}`);
        } catch (err) {
          console.error(`✗ Failed to delete ${file.name}:`, err);
        }
      }

      console.log("Flushing key-value store...");
      await db.flush();
      console.log("✓ KV store flushed");

      await loadFiles();
      await loadResumes();

      alert("✓ All app data has been wiped successfully.");
    } catch (err) {
      console.error("Error wiping data:", err);
      alert("Failed to wipe some data. Check console for details.");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Wipe App Data</h1>

      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Warning:</strong> This will permanently delete all your data including resumes, files, and settings.
        </p>
      </div>

      {currentUser ? (
        <div className="mb-6">
          <p className="text-gray-600">
            Currently logged in as:{" "}
            <strong>{currentUser.email || "Unknown"}</strong>
          </p>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            ℹ️ You are not logged in. You can still wipe data, but only system files will be deleted.
          </p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Resumes in Database ({resumes.length})
        </h2>
        <div className="flex flex-col gap-2">
          {resumes.length === 0 ? (
            <p className="text-gray-500">No resumes found</p>
          ) : (
            resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex flex-row gap-4 items-center p-2 bg-gray-50 rounded"
              >
                <p className="font-medium">{resume.file_name}</p>
                <span className="text-gray-500 text-sm">
                  {resume.company_name && `${resume.company_name} - `}
                  {resume.job_title || "No job title"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Files in Storage ({files.length})
        </h2>
        <div className="flex flex-col gap-2">
          {files.length === 0 ? (
            <p className="text-gray-500">No files found</p>
          ) : (
            files.map((file) => (
              <div
                key={file.path}
                className="flex flex-row gap-4 items-center p-2 bg-gray-50 rounded"
              >
                <p>{file.name}</p>
                <span className="text-gray-500 text-sm">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleDelete}
          disabled={deleting || (resumes.length === 0 && files.length === 0)}
        >
          {deleting
            ? "Wiping All Data..."
            : `🗑️ Wipe All Data (${resumes.length} resumes, ${files.length} files)`}
        </button>

        {!currentUser && (
          <p className="text-xs text-gray-500 mt-2">
            Note: Only system files will be deleted. Login to delete your
            resumes.
          </p>
        )}
      </div>
    </div>
  );
};

export default WipeApp;
