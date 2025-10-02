import type { Route } from "./+types/home";
import Navbar from '~/components/Navbar';
import ResumeCard from '~/components/ResumeCard';
import { useSupabaseStore } from '~/lib/supabase';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';

// ✅ Import Resume from your supabase types instead of redefining
import type { Resume } from '~/lib/supabase';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumate" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const user = useSupabaseStore((state) => state.user);
  const getUserResumes = useSupabaseStore((state) => state.getUserResumes);
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth?next=/');
      return;
    }

    // Fetch user's resumes from Supabase
    const fetchResumes = async () => {
      try {
        setIsLoading(true);
        const userResumes = await getUserResumes();
        setResumes(userResumes || []);
      } catch (error) {
        console.error('Error fetching resumes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
  }, [user, navigate, getUserResumes]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback.</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading your resumes...</p>
          </div>
        ) : resumes.length > 0 ? (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No resumes yet. Upload your first resume to get started!
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
