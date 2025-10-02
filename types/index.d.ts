// index.d.ts - Type definitions for Supabase Resume Application

interface Resume {
  id: string;
  companyName?: string;
  jobTitle?: string;
  imagePath: string;
  resumePath: string;
  feedback: Feedback;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

interface Feedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
    }[];
  };
  toneAndStyle: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  content: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  structure: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  skills: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
}

// Supabase Database Types
interface Database {
  public: {
    Tables: {
      resumes: {
        Row: {
          id: string;
          user_id: string;
          company_name: string | null;
          job_title: string | null;
          image_path: string;
          resume_path: string;
          feedback: Feedback;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name?: string | null;
          job_title?: string | null;
          image_path: string;
          resume_path: string;
          feedback: Feedback;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string | null;
          job_title?: string | null;
          image_path?: string;
          resume_path?: string;
          feedback?: Feedback;
          created_at?: string;
          updated_at?: string;
        };
      };
      kv_store: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Resume Store Types
interface ResumeStore {
  resumes: Resume[];
  currentResume: Resume | null;
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  createResume: (resume: Omit<Resume, 'id'>) => Promise<Resume | undefined>;
  getResume: (id: string) => Promise<Resume | undefined>;
  updateResume: (id: string, updates: Partial<Resume>) => Promise<boolean>;
  deleteResume: (id: string) => Promise<boolean>;
  listResumes: (userId?: string) => Promise<Resume[]>;

  // File operations
  uploadResumeFile: (file: File) => Promise<string | undefined>;
  uploadResumeImage: (file: File) => Promise<string | undefined>;
  getResumeFileUrl: (path: string) => Promise<string | undefined>;

  // Feedback operations
  generateFeedback: (resumeText: string, jobTitle?: string, companyName?: string) => Promise<Feedback | undefined>;
  updateFeedback: (id: string, feedback: Feedback) => Promise<boolean>;

  // State management
  setCurrentResume: (resume: Resume | null) => void;
  clearError: () => void;
}

// Claude AI Response Types
interface ClaudeFeedbackResponse {
  overallScore: number;
  sections: {
    ATS: {
      score: number;
      tips: Array<{
        type: "good" | "improve";
        tip: string;
      }>;
    };
    toneAndStyle: {
      score: number;
      tips: Array<{
        type: "good" | "improve";
        tip: string;
        explanation: string;
      }>;
    };
    content: {
      score: number;
      tips: Array<{
        type: "good" | "improve";
        tip: string;
        explanation: string;
      }>;
    };
    structure: {
      score: number;
      tips: Array<{
        type: "good" | "improve";
        tip: string;
        explanation: string;
      }>;
    };
    skills: {
      score: number;
      tips: Array<{
        type: "good" | "improve";
        tip: string;
        explanation: string;
      }>;
    };
  };
}

// Supabase Storage Bucket Names
type StorageBucket = 'resumes' | 'resume-images' | 'uploads';

// Supabase RLS Policy Types
interface RLSPolicies {
  resumes: {
    select: 'authenticated users can view their own resumes';
    insert: 'authenticated users can create resumes';
    update: 'authenticated users can update their own resumes';
    delete: 'authenticated users can delete their own resumes';
  };
}

// Supabase Row Types (for conversion functions)
interface SupabaseResumeRow {
  id: string;
  user_id: string;
  company_name: string | null;
  job_title: string | null;
  image_path: string;
  resume_path: string;
  feedback: Feedback;
  created_at: string;
  updated_at: string;
}

// Function parameter types
interface PrepareInstructionsParams {
  jobTitle: string;
  jobDescription: string;
}

// Export all types
export type {
  Resume,
  Feedback,
  Database,
  ResumeStore,
  ClaudeFeedbackResponse,
  StorageBucket,
  RLSPolicies,
  SupabaseResumeRow,
  PrepareInstructionsParams
};