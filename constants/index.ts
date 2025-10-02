// index.ts - Data and utility functions for Supabase Resume Application

import type { Resume, Feedback, SupabaseResumeRow, PrepareInstructionsParams } from '../types';

export const resumes: Resume[] = [
  {
    id: '1',
    companyName: 'Google',
    jobTitle: 'Frontend Developer',
    imagePath: '/images/resume_01.png',
    resumePath: '/resumes/resume_1.pdf',
    feedback: {
      overallScore: 85,
      ATS: {
        score: 90,
        tips: [],
      },
      toneAndStyle: {
        score: 90,
        tips: [],
      },
      content: {
        score: 90,
        tips: [],
      },
      structure: {
        score: 90,
        tips: [],
      },
      skills: {
        score: 90,
        tips: [],
      },
    },
  },
  {
    id: '2',
    companyName: 'Microsoft',
    jobTitle: 'Cloud Engineer',
    imagePath: '/images/resume_02.png',
    resumePath: '/resumes/resume_2.pdf',
    feedback: {
      overallScore: 55,
      ATS: {
        score: 90,
        tips: [],
      },
      toneAndStyle: {
        score: 90,
        tips: [],
      },
      content: {
        score: 90,
        tips: [],
      },
      structure: {
        score: 90,
        tips: [],
      },
      skills: {
        score: 90,
        tips: [],
      },
    },
  },
  {
    id: '3',
    companyName: 'Apple',
    jobTitle: 'iOS Developer',
    imagePath: '/images/resume_03.png',
    resumePath: '/resumes/resume_3.pdf',
    feedback: {
      overallScore: 75,
      ATS: {
        score: 90,
        tips: [],
      },
      toneAndStyle: {
        score: 90,
        tips: [],
      },
      content: {
        score: 90,
        tips: [],
      },
      structure: {
        score: 90,
        tips: [],
      },
      skills: {
        score: 90,
        tips: [],
      },
    },
  },
  {
    id: '4',
    companyName: 'IBM',
    jobTitle: 'SQA Engineer',
    imagePath: '/images/resume_04.png',
    resumePath: '/resumes/resume_4.pdf',
    feedback: {
      overallScore: 74,
      ATS: {
        score: 82,
        tips: [],
      },
      toneAndStyle: {
        score: 77,
        tips: [],
      },
      content: {
        score: 70,
        tips: [],
      },
      structure: {
        score: 68,
        tips: [],
      },
      skills: {
        score: 74,
        tips: [],
      },
    },
  },
  {
    id: '5',
    companyName: 'Base64',
    jobTitle: 'Backend Developer',
    imagePath: '/images/resume_05.jpg',
    resumePath: '/resumes/resume_5.pdf',
    feedback: {
      overallScore: 89,
      ATS: {
        score: 92,
        tips: [],
      },
      toneAndStyle: {
        score: 93,
        tips: [],
      },
      content: {
        score: 85,
        tips: [],
      },
      structure: {
        score: 86,
        tips: [],
      },
      skills: {
        score: 88,
        tips: [],
      },
    },
  },
  {
    id: '6',
    companyName: 'NTGroup',
    jobTitle: 'Data Scientist',
    imagePath: '/images/resume_06.jpg',
    resumePath: '/resumes/resume_6.pdf',
    feedback: {
      overallScore: 91,
      ATS: {
        score: 95,
        tips: [],
      },
      toneAndStyle: {
        score: 87,
        tips: [],
      },
      content: {
        score: 91,
        tips: [],
      },
      structure: {
        score: 92,
        tips: [],
      },
      skills: {
        score: 88,
        tips: [],
      },
    },
  },
];

export const prepareInstructions = ({
                                      jobTitle,
                                      jobDescription,
                                    }: PrepareInstructionsParams): string =>
  `You are an expert ATS (Applicant Tracking System) analyst and resume reviewer with years of experience in recruitment and HR. Your task is to thoroughly analyze this resume image and provide detailed, constructive, and actionable feedback.

CONTEXT:
- Job Title: ${jobTitle || 'Not specified'}
- Job Description: ${jobDescription || 'Not provided - analyze based on industry best practices for this role'}

ANALYSIS REQUIREMENTS:
1. Be extremely thorough, specific, and honest in your analysis
2. Don't hesitate to give low scores (20-40) if the resume has significant issues
3. Provide concrete examples from the actual resume content you see
4. If a job description is provided, explicitly compare the resume against those requirements
5. Be constructive - explain WHY something is wrong and HOW to fix it
6. Write each explanation as if you're speaking directly to the candidate

RETURN FORMAT:
You MUST return ONLY a valid JSON object. Do not include markdown code blocks, backticks, or any text before or after the JSON.

{
  "overallScore": <number 0-100>,
  "ATS": {
    "score": <number 0-100>,
    "tips": [
      {
        "type": "improve",
        "tip": "Adopt a single-column layout",
        "explanation": "Two-column formats can confuse ATS parsers, causing them to read sections out of order or miss content entirely, especially from the right-hand column. A standard, top-to-bottom layout ensures all information is captured correctly."
      },
      {
        "type": "good",
        "tip": "Uses standard section headings",
        "explanation": "The resume uses ATS-friendly headings like 'Work Experience' and 'Education', which helps the system correctly categorize the information."
      }
    ]
  },
  "toneAndStyle": {
    "score": <number 0-100>,
    "tips": [
      {
        "type": "improve",
        "tip": "Mismatch Between Summary and Experience",
        "explanation": "The professional summary claims 'expertise' with tools like Selenium and Jira, but the work experience section contains no relevant roles. This creates a credibility gap. As a recent graduate, reframe your summary to highlight academic knowledge, project-based skills, and eagerness to learn."
      }
    ]
  },
  "content": {
    "score": <number 0-100>,
    "tips": [
      {
        "type": "improve",
        "tip": "Add a Technical Projects Section",
        "explanation": "For a recent graduate with no professional experience in this field, a 'Projects' section is essential. Detail 2-3 academic or personal projects where you applied the skills mentioned in your summary. For each project, describe the goal, technologies used (e.g., Selenium, Jira), and your specific contributions such as writing test cases or developing automated scripts."
      }
    ]
  },
  "structure": {
    "score": <number 0-100>,
    "tips": [
      {
        "type": "improve",
        "tip": "Prioritize Relevant Information",
        "explanation": "Your most relevant qualification is your Computer Science degree, but it's buried below irrelevant work experience. Reorder sections to: Contact Info → Summary → Skills → Technical Projects → Education → Work Experience (brief). This immediately showcases your strongest qualifications."
      }
    ]
  }
}

SCORING GUIDELINES:
- 90-100: Excellent, ready for submission with minimal tweaks
- 70-89: Good foundation, minor improvements will make it competitive
- 50-69: Average, significant improvements needed before applying
- 30-49: Below average, major revisions required across multiple areas
- 0-29: Poor, requires complete restructuring and rewriting

CRITICAL RULES:
1. Provide 3-6 tips for EACH section (ATS, toneAndStyle, content, structure)
2. Balance "improve" tips with "good" tips - acknowledge strengths while identifying weaknesses
3. Be SPECIFIC: Reference actual content you see in the resume (section names, job titles, skills mentioned)
4. Write explanations in 2-4 complete sentences that explain BOTH the problem AND the solution
5. If the resume lacks experience relevant to the job title, this MUST be called out in the "content" section with a score of 20-40
6. Check for common ATS killers: two-column layouts, graphics/icons, tables, special characters, non-standard fonts
7. If a job description is provided, explicitly mention which requirements are missing or not demonstrated
8. Use professional but conversational language - write as if you're coaching the candidate

EXAMPLES OF GOOD vs BAD TIPS:

BAD (too vague): "Improve your resume format"
GOOD: "Adopt a single-column layout. Two-column formats can confuse ATS parsers, causing them to read sections out of order or miss content entirely."

BAD (not actionable): "Add more details"
GOOD: "Quantify your achievements with specific metrics. Instead of 'Improved workflow', write 'Automated 50+ regression test cases using Selenium, reducing manual testing time by 10 hours per release cycle.'"

Return ONLY the JSON object with no additional text, markdown, or formatting.`;

// Supabase-specific helper functions

/**
 * Converts a local Resume object to Supabase database format
 */
export const resumeToSupabaseRow = (resume: Resume, userId: string): Omit<SupabaseResumeRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string } => ({
  id: resume.id,
  user_id: userId,
  company_name: resume.companyName ?? null,
  job_title: resume.jobTitle ?? null,
  image_path: resume.imagePath,
  resume_path: resume.resumePath,
  feedback: resume.feedback,
  created_at: resume.createdAt,
  updated_at: resume.updatedAt,
});

/**
 * Converts a Supabase database row to Resume object
 */
export const supabaseRowToResume = (row: SupabaseResumeRow): Resume => ({
  id: row.id,
  companyName: row.company_name || undefined,
  jobTitle: row.job_title || undefined,
  imagePath: row.image_path,
  resumePath: row.resume_path,
  feedback: row.feedback,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

/**
 * Parse Claude AI response to Feedback object
 */
export const parseClaudeFeedback = (response: string): Feedback | null => {
  try {
    // Remove any markdown code blocks if present
    const cleanResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanResponse);
    return parsed as Feedback;
  } catch (error) {
    console.error('Failed to parse Claude feedback:', error);
    return null;
  }
};

/**
 * Validate feedback structure
 */
export const isValidFeedback = (feedback: any): feedback is Feedback => {
  return (
    typeof feedback === 'object' &&
    feedback !== null &&
    typeof feedback.overallScore === 'number' &&
    typeof feedback.ATS === 'object' &&
    feedback.ATS !== null &&
    typeof feedback.ATS.score === 'number' &&
    Array.isArray(feedback.ATS.tips) &&
    typeof feedback.toneAndStyle === 'object' &&
    feedback.toneAndStyle !== null &&
    typeof feedback.toneAndStyle.score === 'number' &&
    Array.isArray(feedback.toneAndStyle.tips) &&
    typeof feedback.content === 'object' &&
    feedback.content !== null &&
    typeof feedback.content.score === 'number' &&
    Array.isArray(feedback.content.tips) &&
    typeof feedback.structure === 'object' &&
    feedback.structure !== null &&
    typeof feedback.structure.score === 'number' &&
    Array.isArray(feedback.structure.tips)
  );
};

/**
 * Get storage bucket name based on file type
 */
export const getStorageBucket = (fileType: 'resume' | 'image'): string => {
  return fileType === 'resume' ? 'resumes' : 'resume-images';
};

/**
 * Generate unique filename for uploads
 */
export const generateUniqueFilename = (originalName: string, userId: string): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
  return `${userId}/${timestamp}_${sanitizedName}`;
};