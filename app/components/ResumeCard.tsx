import React from 'react';
import { Link } from 'react-router';
import ScoreCircle from '~/components/ScoreCircle';
import type { Resume } from '~/lib/supabase';

interface ResumeCardProps {
  resume: Resume;
}

const ResumeCard = ({ resume }: ResumeCardProps) => {
  const { id, file_url, file_name, feedback } = resume;

  // Parse feedback safely if it's JSON
  let parsedFeedback: { overallScore?: number; jobTitle?: string; companyName?: string } = {};
  if (feedback) {
    try {
      parsedFeedback = typeof feedback === 'string' ? JSON.parse(feedback) : feedback;
    } catch (err) {
      console.error('Failed to parse feedback:', err);
    }
  }

  return (
    <Link to={`/resume/${id}`} className="resume-card animate-in-fade-in duration-1000">
      <div className="resume-card-header flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="!text-black font-bold break-words">{parsedFeedback.companyName || file_name}</h2>
          <h3 className="text-lg break-words text-gray-500">{parsedFeedback.jobTitle || 'Job Title'}</h3>
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={parsedFeedback.overallScore ?? 0} />
        </div>
      </div>

      <div className="gradient-border animate-in fade-in duration-1000">
        <div className="w-full h-full">
          <img
            src={file_url}
            alt="resume"
            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
          />
        </div>
      </div>
    </Link>
  );
};

export default ResumeCard;
