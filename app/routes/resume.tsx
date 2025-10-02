import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useSupabaseStore } from "~/lib/supabase";

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
  const [feedback, setFeedback] = useState<string | Record<string, any> | null | undefined>(null);
  const [rating, setRating] = useState<number | null>(null);
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
        setFeedback(data.feedback);
        setRating(data.rating ?? null);

        console.log({
          resumeUrl: data.file_url,
          imageUrl: data.file_url,
          feedback: data.feedback,
          rating: data.rating
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

  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[...Array(10)].map((_, i) => (
            <svg
              key={i}
              className={`w-6 h-6 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-2xl font-bold text-gray-800">{rating}/10</span>
      </div>
    );
  };

  // --- parse feedback safely ---
  const parseFeedback = (feedbackData: any) => {
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

      return parsed;
    } catch (error) {
      console.error('Error parsing feedback:', error, feedbackData);
      return null;
    }
  };

  // --- convert tips to readable sentences ---
  const tipsToParagraph = (section: any) => {
    if (!section || !section.tips) return "";
    return section.tips.map((t: any) => {
      let sentence = t.tip;
      if (t.explanation) sentence += ` ${t.explanation}`;
      return sentence;
    }).join(" ");
  };

  // --- render feedback narrative ---
  const renderFeedback = () => {
    const parsed = parseFeedback(feedback);

    if (!parsed) {
      return (
        <div className="text-gray-700 whitespace-pre-wrap">
          {typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2)}
        </div>
      );
    }

    const { overallScore, ATS, toneAndStyle, content, structure } = parsed;

    return (
      <div className="space-y-6 text-gray-800 leading-relaxed">
        {overallScore !== undefined && (
          <p>
            Your resume received an overall score of <b>{overallScore}/100</b>.
          </p>
        )}

        {ATS && (
          <p>
            From an ATS (Applicant Tracking System) perspective, it scored <b>{ATS.score}/100</b>.{" "}
            {tipsToParagraph(ATS)}
          </p>
        )}

        {toneAndStyle && (
          <p>
            In terms of tone and style, your resume scored <b>{toneAndStyle.score}/100</b>.{" "}
            {tipsToParagraph(toneAndStyle)}
          </p>
        )}

        {content && (
          <p>
            Looking at content, the score is <b>{content.score}/100</b>.{" "}
            {tipsToParagraph(content)}
          </p>
        )}

        {structure && (
          <p>
            On structure, the score is <b>{structure.score}/100</b>.{" "}
            {tipsToParagraph(structure)}
          </p>
        )}

        <p className="font-medium mt-8 pt-6 border-t border-gray-200">
          In summary, your resume {overallScore && overallScore >= 70 ? 'is strong' : overallScore && overallScore >= 50 ? 'has potential but needs improvements' : 'needs major improvements'} in{" "}
          {ATS && ATS.score < 60 && 'ATS compatibility, '}
          {toneAndStyle && toneAndStyle.score < 60 && 'tone and style, '}
          {content && content.score < 60 && 'content relevance, '}
          {structure && structure.score < 60 && 'structure, '}
          and alignment with the job description. Strengthening projects, quantifying achievements, and keeping an ATS-friendly format will make it far more effective.
        </p>
      </div>
    );
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
            {/* Rating Section */}
            {rating !== null && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Resume Rating</h2>
                {renderRatingStars(rating)}
                <p className="mt-2 text-gray-600">
                  {rating >= 8 ? 'Excellent resume!' :
                    rating >= 6 ? 'Good resume with room for improvement' :
                      rating >= 4 ? 'Needs significant improvements' :
                        'Requires major revisions'}
                </p>
              </div>
            )}

            {/* Feedback Section */}
            {feedback && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">AI Feedback</h2>
                <div className="prose max-w-none">
                  {renderFeedback()}
                </div>
              </div>
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
