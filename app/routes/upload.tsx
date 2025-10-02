import { type FormEvent, useState } from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { useSupabaseStore } from "~/lib/supabase";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

const Upload = () => {
  const user = useSupabaseStore((state) => state.user);
  const uploadFile = useSupabaseStore((state) => state.uploadFile);
  const analyzeResume = useSupabaseStore((state) => state.analyzeResume);
  const saveResumeData = useSupabaseStore((state) => state.saveResumeData);

  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  };

  // Helper function to clean and parse AI response
  const cleanAndParseFeedback = (rawFeedback: any): any => {
    try {
      let feedbackText = typeof rawFeedback === 'string' ? rawFeedback : JSON.stringify(rawFeedback);

      // Remove markdown code blocks
      feedbackText = feedbackText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/\\n/g, '')
        .trim();

      // Try to parse as JSON
      const parsed = JSON.parse(feedbackText);

      // If it has a summary field, unwrap it
      if (parsed.summary && typeof parsed.summary === 'string') {
        const summaryText = parsed.summary
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/\\n/g, '')
          .trim();
        return JSON.parse(summaryText);
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse feedback:', error);
      // Return a default structure if parsing completely fails
      return {
        overallScore: 50,
        ATS: {
          score: 50,
          tips: [{ type: 'improve', tip: 'Unable to analyze resume. Please try again.' }]
        },
        toneAndStyle: {
          score: 50,
          tips: [{ type: 'improve', tip: 'Analysis incomplete.' }]
        },
        content: {
          score: 50,
          tips: [{ type: 'improve', tip: 'Analysis incomplete.' }]
        }
      };
    }
  };

  const handleAnalyze = async ({
                                 companyName,
                                 jobTitle,
                                 jobDescription,
                                 file
                               }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);
    try {
      // Check API key first
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setStatusText('Error: Gemini API key not configured');
        setIsProcessing(false);
        return;
      }

      setStatusText('Converting PDF to image...');
      const imageFile = await convertPdfToImage(file);
      if (!imageFile.file) {
        setStatusText('Error: Failed to convert PDF');
        setIsProcessing(false);
        return;
      }

      const uuid = generateUUID();
      setStatusText('Uploading resume...');
      const imagePath = `resumes/${user?.id}/${uuid}.png`;
      const uploadedImage = await uploadFile(imageFile.file, imagePath);

      if (!uploadedImage) {
        setStatusText('Error: Failed to upload resume');
        setIsProcessing(false);
        return;
      }

      console.log('Upload successful:', uploadedImage);

      setStatusText('Saving initial resume data...');
      const initialResumeData = {
        id: uuid,
        user_id: user?.id!,
        file_name: file.name,
        file_url: uploadedImage.publicUrl,
        resume_path: imagePath,
        company_name: companyName || null,
        job_title: jobTitle,
        job_description: jobDescription || null,
        feedback: null,
        rating: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const savedInitial = await saveResumeData(initialResumeData);
      if (!savedInitial) {
        setStatusText('Error: Failed to save initial resume data');
        setIsProcessing(false);
        return;
      }

      console.log('Initial data saved successfully');

      setStatusText('Analyzing with AI... This may take 10-30 seconds');

      const aiResult = await analyzeResume(
        imageFile.file,
        prepareInstructions({ jobTitle, jobDescription })
      );

      console.log('AI Result received:', aiResult);

      if (!aiResult) {
        setStatusText('Error: AI analysis failed - please check your API key and try again');
        setIsProcessing(false);
        return;
      }

      // Clean and parse the feedback properly
      const parsedFeedback = cleanAndParseFeedback(aiResult.feedback);

      console.log('Cleaned feedback:', parsedFeedback);

      // Extract rating from various possible locations
      const finalRating: number =
        aiResult.rating ??
        parsedFeedback?.overallScore ??
        parsedFeedback?.rating ??
        5;

      // Store the clean, parsed feedback object
      const updatedResumeData = {
        ...initialResumeData,
        feedback: parsedFeedback, // This is now a clean JSON object
        rating: finalRating,
        updated_at: new Date().toISOString(),
      };

      const savedUpdated = await saveResumeData(updatedResumeData);

      if (!savedUpdated) {
        setStatusText('Error: Failed to save AI analysis results');
        setIsProcessing(false);
        return;
      }

      console.log('AI Feedback saved:', parsedFeedback);
      console.log('AI Rating:', finalRating);

      setStatusText(`Analysis complete! Rating: ${finalRating}/10, redirecting...`);
      setTimeout(() => {
        navigate(`/resume/${uuid}`);
      }, 1200);

    } catch (error) {
      console.error('handleAnalyze error:', error);
      setStatusText(
        `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`
      );
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form');
    if (!form) return;
    const formData = new FormData(form);

    const companyName = formData.get('company-name') as string;
    const jobTitle = formData.get('job-title') as string;
    const jobDescription = formData.get('job-description') as string;

    if (!file) return setStatusText('Please select a PDF file');
    if (!jobTitle.trim()) return setStatusText('Please enter a job title');
    if (!user) {
      setStatusText('Please log in to continue');
      navigate('/auth?next=/upload');
      return;
    }

    setStatusText('');
    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                className="w-full"
                alt="Processing..."
              />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}
          {!isProcessing && statusText && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {statusText}
            </div>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input type="text" name="company-name" id="company-name" />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title *</label>
                <input type="text" name="job-title" id="job-title" required />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea rows={5} name="job-description" id="job-description" />
              </div>
              <div className="form-div">
                <label htmlFor="uploader">Upload Resume *</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
              <button
                className="primary-button"
                type="submit"
                disabled={!file || isProcessing || !user}
              >
                {isProcessing ? 'Analyzing...' : 'Analyze Resume'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;