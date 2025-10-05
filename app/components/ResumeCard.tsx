import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import { useEffect, useState } from "react";
import type { Resume } from "~/lib/supabase";

const ResumeCard = ({ resume }: { resume: Resume }) => {
  const { id, company_name, job_title, feedback, file_url } = resume;
  const [parsedFeedback, setParsedFeedback] = useState<any>(null);

  useEffect(() => {
    // Parse feedback if it's a JSON string
    if (feedback) {
      try {
        const parsed = typeof feedback === 'string' ? JSON.parse(feedback) : feedback;
        setParsedFeedback(parsed);
      } catch (err) {
        console.error('Failed to parse feedback:', err);
        setParsedFeedback(null);
      }
    }
  }, [feedback]);

  const overallScore = parsedFeedback?.overallScore || 0;
  const companyName = company_name;
  const jobTitle = job_title;

  return (
    <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
          {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
          {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={overallScore} />
        </div>
      </div>
      {file_url && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={file_url}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;