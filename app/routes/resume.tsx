import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useSupabaseStore } from "~/lib/supabase";
import Summary from '~/components/Summary';
import ATS from '~/components/ATS';
import Details from '~/components/Details';
import type { Feedback } from 'types';

export const meta = () => ([
  { title: 'Resumate | Review' },
  { name: 'description', content: 'Detailed overview of your resume' },
]);

const Resume = () => {
  const user = useSupabaseStore((state) => state.user);
  const isLoading = useSupabaseStore((state) => state.isLoading);
  const getResumeById = useSupabaseStore((state) => state.getResumeById);
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth?next=/resume/' + id);
      return;
    }

    const loadResume = async () => {
      try {
        setLoading(true);
        const data = await getResumeById(id!);

        if (!data) {
          console.error('Resume not found');
          setLoading(false);
          return;
        }

        setResumeUrl(data.file_url);
        setImageUrl(data.file_url);

        // Parse feedback
        const parsedFeedback = parseFeedback(data.feedback);
        setFeedback(parsedFeedback);

        console.log({
          resumeUrl: data.file_url,
          imageUrl: data.file_url,
          feedback: parsedFeedback
        });
      } catch (error) {
        console.error('Error loading resume:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadResume();
    }
  }, [id, user, navigate, getResumeById]);

  // Parse feedback safely
  const parseFeedback = (feedbackData: any): Feedback | null => {
    try {
      let parsed = feedbackData;

      if (typeof feedbackData === 'string') {
        parsed = JSON.parse(feedbackData);
      }

      if (parsed && parsed.summary) {
        if (typeof parsed.summary === 'string') {
          let cleanedSummary = parsed.summary
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/\\n/g, '')
            .trim();

          parsed = JSON.parse(cleanedSummary);
        } else {
          parsed = parsed.summary;
        }
      }

      return parsed as Feedback;
    } catch (error) {
      console.error('Error parsing feedback:', error, feedbackData);
      return null;
    }
  };

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg.small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl && resumeUrl && !loading && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                  alt="Resume preview"
                />
              </a>
            </div>
          )}

          {(loading || isLoading) && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading resume...</div>
            </div>
          )}

          {!loading && !isLoading && !imageUrl && !resumeUrl && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Resume not found</div>
            </div>
          )}
        </section>

        <section className="w-full p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Summary Section */}
            {feedback && (
              <Summary feedback={feedback} />
            )}

            {/* ATS Section */}
            {feedback && feedback.ATS && (
              <ATS
                score={feedback.ATS.score}
                suggestions={feedback.ATS.tips || []}
              />
            )}

            {/* Details Section */}
            {feedback && (
              <Details feedback={feedback} />
            )}

            {/* No feedback state */}
            {!feedback && !loading && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-gray-500 text-center">
                  No feedback available yet. The resume is still being analyzed.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Resume;