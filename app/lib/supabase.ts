import { create } from "zustand";
import { createClient, type User } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Types
interface SupabaseUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface UploadResponse {
  path: string;
  downloadURL: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
}

interface ChatMessageContent {
  type: "text" | "image" | "file";
  text?: string;
  imageData?: { data: string; mimeType: string };
  fileURL?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ChatMessageContent[];
}

interface GeminiOptions {
  model?: "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-pro-vision";
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

interface AIResponse {
  message: { role: "assistant"; content: string; refusal: null | string };
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  model: string;
  finishReason: string;
}

interface KVItem {
  key: string;
  value: string;
  updatedAt?: Date;
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  company_name?: string;
  job_title?: string;
  job_description?: string;
  rating?: number | null;
  feedback?: any;
  created_at: string;
  updated_at: string;
}

interface StorageFileObject {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: {
    eTag?: string;
    size?: number;
    mimetype?: string;
    cacheControl?: string;
    lastModified?: string;
    contentLength?: number;
    httpStatusCode?: number;
  };
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Fixed analyzeResumeImpl function with better JSON parsing
async function analyzeResumeImpl(
  imageFile: File | string,
  instructions: string
): Promise<{ feedback: any; rating: number } | null> {
  try {
    console.log('Starting AI analysis...');

    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }

      return btoa(binary);
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('Gemini API key is missing or empty');
      return null;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased from 4096
        topP: 0.95,
        topK: 40,
      },
    });

    let imageData: string;
    let mimeType: string;

    if (imageFile instanceof File) {
      const arrayBuffer = await imageFile.arrayBuffer();
      imageData = arrayBufferToBase64(arrayBuffer);
      mimeType = imageFile.type || 'image/png';
      console.log('Processing file directly:', imageFile.name, imageFile.type);
    } else if (typeof imageFile === 'string') {
      console.log('Fetching image from URL:', imageFile);
      const response = await fetch(imageFile, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch resume image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      imageData = arrayBufferToBase64(arrayBuffer);
      mimeType = blob.type || 'image/png';
    } else {
      throw new Error('Invalid image input type');
    }

    console.log('Sending request to Gemini API...');

    const result = await model.generateContent([
      instructions,
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      },
    ]);

    const text = result.response.text();
    console.log('AI raw response received, length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));
    console.log('Last 200 chars:', text.substring(text.length - 200));

    // Clean the response
    let cleanedText = text.trim();

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/gi, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    // Extract JSON object
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No JSON braces found in AI response');
      console.error('Full response:', cleanedText);
      return null;
    }

    let jsonStr = cleanedText.substring(firstBrace, lastBrace + 1);

    // Check if JSON is complete
    const openBraces = (jsonStr.match(/{/g) || []).length;
    const closeBraces = (jsonStr.match(/}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/]/g) || []).length;

    console.log('JSON validation - Braces:', openBraces, 'vs', closeBraces, '| Brackets:', openBrackets, 'vs', closeBrackets);

    // Attempt to fix incomplete JSON
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.warn('Incomplete JSON detected, attempting to fix...');

      // Close unclosed brackets first
      for (let i = 0; i < (openBrackets - closeBrackets); i++) {
        jsonStr += '\n]';
      }

      // Close unclosed braces
      for (let i = 0; i < (openBraces - closeBraces); i++) {
        jsonStr += '\n}';
      }

      console.log('Fixed JSON, new length:', jsonStr.length);
    }

    try {
      const parsed = JSON.parse(jsonStr);
      console.log('Parsed JSON successfully');
      console.log('Overall Score:', parsed.overallScore);
      console.log('ATS Score:', parsed.ATS?.score);
      console.log('ATS Tips Count:', parsed.ATS?.tips?.length);
      console.log('Tone & Style Score:', parsed.toneAndStyle?.score);
      console.log('Content Score:', parsed.content?.score);
      console.log('Structure Score:', parsed.structure?.score);
      console.log('Skills Score:', parsed.skills?.score);

      // Validate the structure
      if (!parsed.overallScore && !parsed.ATS && !parsed.toneAndStyle && !parsed.content) {
        console.error('Invalid feedback structure - missing all required fields');
        return null;
      }

      // Ensure all sections exist with default values
      const feedback = {
        overallScore: parsed.overallScore || 50,
        ATS: parsed.ATS || { score: 50, tips: [] },
        toneAndStyle: parsed.toneAndStyle || { score: 50, tips: [] },
        content: parsed.content || { score: 50, tips: [] },
        structure: parsed.structure || { score: 50, tips: [] },
        skills: parsed.skills || { score: 50, tips: [] }
      };

      // Use overallScore as rating, or calculate average if not present
      let rating = feedback.overallScore;
      if (!rating || rating === 50) {
        const scores = [
          feedback.ATS?.score || 50,
          feedback.toneAndStyle?.score || 50,
          feedback.content?.score || 50,
          feedback.structure?.score || 50,
          feedback.skills?.score || 50
        ];
        rating = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }

      // Convert 0-100 score to 1-10 scale
      const scaledRating = Math.round(rating / 10);
      const finalRating = Math.min(10, Math.max(1, scaledRating));

      console.log('Final Rating (scaled to 1-10):', finalRating);

      return {
        feedback: feedback,
        rating: finalRating,
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse (first 1000 chars):', jsonStr.substring(0, 1000));
      console.error('Attempted to parse (last 500 chars):', jsonStr.substring(jsonStr.length - 500));

      // Return a default structure so the app doesn't crash
      console.warn('Returning default feedback structure due to parse error');
      return {
        feedback: {
          overallScore: 50,
          ATS: { score: 50, tips: [{ type: 'error', tip: 'Analysis incomplete', explanation: 'Please try again' }] },
          toneAndStyle: { score: 50, tips: [] },
          content: { score: 50, tips: [] },
          structure: { score: 50, tips: [] },
          skills: { score: 50, tips: [] }
        },
        rating: 5
      };
    }
  } catch (err) {
    console.error('Error analyzing resume:', err);
    if (err instanceof Error) {
      console.error('Error details:', err.message, err.stack);
    }
    return null;
  }
}

// Zustand store
interface SupabaseStore {
  isLoading: boolean;
  error: string | null;
  supabaseReady: boolean;
  user: User | null;

  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;

  uploadFile: (file: File, path: string) => Promise<{ publicUrl: string; path: string } | null>;
  analyzeResume: (imageFile: File | string, instructions: string) => Promise<{ feedback: any; rating: number } | null>;
  saveResumeData: (data: any) => Promise<boolean>;

  getUserResumes: () => Promise<Resume[]>;
  getResumeById: (id: string) => Promise<Resume | null>;

  auth: {
    user: SupabaseUser | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => SupabaseUser | null;
  };

  fs: {
    write: (path: string, data: string | File | Blob) => Promise<UploadResponse | undefined>;
    read: (path: string) => Promise<Blob | undefined>;
    upload: (files: File[] | Blob[]) => Promise<UploadResponse | undefined>;
    delete: (path: string) => Promise<void>;
    readDir: (path: string) => Promise<UploadResponse[] | undefined>;
  };

  ai: {
    chat: (
      prompt: string | ChatMessage[],
      imageURL?: string | GeminiOptions,
      testMode?: boolean,
      options?: GeminiOptions
    ) => Promise<AIResponse | undefined>;
    feedback: (imagePath: string, message: string) => Promise<AIResponse | undefined>;
    img2txt: (image: string | File | Blob, testMode?: boolean) => Promise<string | undefined>;
  };

  db: {
    get: (key: string) => Promise<string | null | undefined>;
    set: (key: string, value: string) => Promise<boolean | undefined>;
    delete: (key: string) => Promise<boolean | undefined>;
    list: (pattern: string, returnValues?: boolean) => Promise<string[] | KVItem[] | undefined>;
    flush: () => Promise<boolean | undefined>;
  };

  init: () => void;
  clearError: () => void;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => {
  const setError = (msg: string) => set({ error: msg, isLoading: false });

  const convertUser = (user: User | null): SupabaseUser | null => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || null,
      displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
      photoURL: user.user_metadata?.avatar_url || null,
      emailVerified: user.email_confirmed_at !== null,
    };
  };

  // Auth functions
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      set({ isLoading: true, error: null });
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      const supUser = convertUser(user);
      set({
        user,
        auth: {
          ...get().auth,
          user: supUser,
          isAuthenticated: !!user,
        },
        isLoading: false,
      });
      return !!user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to check auth status";
      setError(msg);
      return false;
    }
  };

  const signIn = async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
      await checkAuthStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
    }
  };

  const signOutUser = async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({
        user: null,
        auth: { ...get().auth, user: null, isAuthenticated: false },
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      setError(msg);
    }
  };

  const refreshUser = async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await checkAuthStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh user";
      setError(msg);
    }
  };

  const initialize = async (): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      const supUser = convertUser(user);

      set({
        user,
        auth: { ...get().auth, user: supUser, isAuthenticated: !!user },
        isLoading: false,
        supabaseReady: true,
      });

      supabase.auth.onAuthStateChange((_event: string, session: any) => {
        const user = session?.user ?? null;
        const supUser = convertUser(user);
        set({
          user,
          auth: { ...get().auth, user: supUser, isAuthenticated: !!user },
          isLoading: false,
        });
      });
    } catch (err) {
      console.error('Error initializing auth:', err);
      set({ isLoading: false });
    }
  };

  const init = (): void => {
    set({ supabaseReady: true });
    checkAuthStatus();
  };

  // File upload
  const uploadFile = async (file: File, path: string): Promise<{ publicUrl: string; path: string } | null> => {
    try {
      console.log('Uploading file:', { fileName: file.name, path, size: file.size });

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(path);

      return { publicUrl, path: data.path };
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  };

  // Database operations
  const saveResumeData = async (data: any): Promise<boolean> => {
    try {
      console.log('Saving resume data:', data);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return false;
      }

      let truncatedJobDesc = data.job_description || null;
      if (truncatedJobDesc && truncatedJobDesc.length > 2000) {
        truncatedJobDesc = truncatedJobDesc.substring(0, 2000) + '...';
        console.log('Truncated job description to 2000 chars');
      }

      let feedbackData = data.feedback;
      if (feedbackData && typeof feedbackData === 'object') {
        try {
          feedbackData = JSON.stringify(feedbackData);
          if (feedbackData.length > 10000) {
            feedbackData = feedbackData.substring(0, 10000) + '..."}';
          }
        } catch (e) {
          console.error('Error stringifying feedback:', e);
          feedbackData = null;
        }
      }

      const resumeData = {
        id: data.id,
        user_id: data.user_id,
        file_name: data.file_name,
        file_url: data.file_url,
        image_path: data.resume_path || data.file_path,
        resume_path: data.resume_path,
        company_name: data.company_name || null,
        job_title: data.job_title,
        job_description: truncatedJobDesc,
        feedback: feedbackData,
        rating: data.rating,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      console.log('Attempting upsert with data:', resumeData);

      const { data: result, error } = await supabase
        .from("resumes")
        .upsert(resumeData, {
          onConflict: "id",
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Database save error:', error);
        throw error;
      }

      console.log('Resume saved successfully:', result);
      return true;
    } catch (err) {
      console.error('Save error:', err);
      return false;
    }
  };

  const getUserResumes = async (): Promise<Resume[]> => {
    const user = get().user;
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Resume[];
    } catch (err) {
      console.error("Error fetching resumes:", err);
      return [];
    }
  };

  const getResumeById = async (id: string): Promise<Resume | null> => {
    if (!id) return null;

    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Resume;
    } catch (err) {
      console.error("Error fetching resume by ID:", err);
      return null;
    }
  };

  // Legacy FS operations
  const write = async (path: string, data: string | File | Blob): Promise<UploadResponse | undefined> => {
    try {
      let file: File | Blob;
      let fileName: string;

      if (typeof data === 'string') {
        file = new Blob([data], { type: 'text/plain' });
        fileName = path;
      } else {
        file = data;
        fileName = data instanceof File ? data.name : path;
      }

      const filePath = `${Date.now()}_${fileName}`;
      const { data: uploadData, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return {
        path: uploadData.path,
        downloadURL: publicUrl,
        fullPath: uploadData.fullPath,
        name: fileName,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
      };
    } catch (err) {
      console.error('Write error:', err);
      return undefined;
    }
  };

  const readFile = async (path: string): Promise<Blob | undefined> => {
    try {
      const { data, error } = await supabase.storage.from('uploads').download(path);
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Read error:', err);
      return undefined;
    }
  };

  const upload = async (files: File[] | Blob[]): Promise<UploadResponse | undefined> => {
    try {
      const file = files[0];
      const fileName = file instanceof File ? file.name : `upload_${Date.now()}`;
      const filePath = `${Date.now()}_${fileName}`;

      const { data: uploadData, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return {
        path: uploadData.path,
        downloadURL: publicUrl,
        fullPath: uploadData.fullPath,
        name: fileName,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
      };
    } catch (err) {
      console.error('Upload error:', err);
      return undefined;
    }
  };

  const deleteFile = async (path: string): Promise<void> => {
    try {
      const { error } = await supabase.storage.from('uploads').remove([path]);
      if (error) throw error;
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const readDir = async (path: string): Promise<UploadResponse[] | undefined> => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .list(path, { limit: 100, offset: 0 });

      if (error) throw error;

      const results: UploadResponse[] = data.map((file: StorageFileObject) => {
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(`${path}/${file.name}`);

        return {
          path: `${path}/${file.name}`,
          downloadURL: publicUrl,
          fullPath: `${path}/${file.name}`,
          name: file.name,
          size: file.metadata?.size || 0,
          contentType: file.metadata?.mimetype || 'application/octet-stream'
        };
      });

      return results;
    } catch (err) {
      console.error('Read dir error:', err);
      return undefined;
    }
  };

  // AI operations
  const chat = async (
    prompt: string | ChatMessage[],
    imageURL?: string | GeminiOptions,
    testMode?: boolean,
    options?: GeminiOptions
  ): Promise<AIResponse | undefined> => {
    try {
      const modelOptions = typeof imageURL === 'object' ? imageURL : options;
      const model = genAI.getGenerativeModel({
        model: modelOptions?.model || 'gemini-2.5-pro',
        generationConfig: {
          temperature: modelOptions?.temperature,
          maxOutputTokens: modelOptions?.maxTokens,
          topK: modelOptions?.topK,
          topP: modelOptions?.topP,
        }
      });

      let promptText = typeof prompt === 'string' ? prompt :
        prompt.map(msg => typeof msg.content === 'string' ? msg.content : '').join('\n');

      const result = await model.generateContent(promptText);
      const response = result.response;
      const text = response.text();

      return {
        message: { role: "assistant", content: text, refusal: null },
        model: modelOptions?.model || 'gemini-2.5-pro',
        finishReason: "stop"
      };
    } catch (err) {
      console.error('Chat error:', err);
      return undefined;
    }
  };

  const feedback = async (imagePath: string, message: string): Promise<AIResponse | undefined> => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

      let imageData: string;
      let mimeType: string;

      if (imagePath.startsWith('http')) {
        const response = await fetch(imagePath);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        mimeType = blob.type;
      } else {
        const blob = await readFile(imagePath);
        if (!blob) throw new Error('Failed to read image');
        const arrayBuffer = await blob.arrayBuffer();
        imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        mimeType = blob.type;
      }

      const result = await model.generateContent([
        message,
        { inlineData: { data: imageData, mimeType: mimeType } }
      ]);

      const text = result.response.text();
      return {
        message: { role: "assistant", content: text, refusal: null },
        model: 'gemini-2.5-pro',
        finishReason: "stop"
      };
    } catch (err) {
      console.error('Feedback error:', err);
      return undefined;
    }
  };

  const img2txt = async (image: string | File | Blob, testMode?: boolean): Promise<string | undefined> => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

      let imageData: string;
      let mimeType: string;

      if (typeof image === 'string') {
        if (image.startsWith('http')) {
          const response = await fetch(image);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          mimeType = blob.type;
        } else {
          const blob = await readFile(image);
          if (!blob) throw new Error('Failed to read image');
          const arrayBuffer = await blob.arrayBuffer();
          imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          mimeType = blob.type;
        }
      } else {
        const arrayBuffer = await image.arrayBuffer();
        imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        mimeType = image instanceof File ? image.type : 'image/jpeg';
      }

      const result = await model.generateContent([
        'Extract all text from this image. Return only the text content, no additional commentary.',
        { inlineData: { data: imageData, mimeType: mimeType } }
      ]);

      return result.response.text();
    } catch (err) {
      console.error('img2txt error:', err);
      return undefined;
    }
  };

  // KV Store operations
  const getKV = async (key: string): Promise<string | null | undefined> => {
    try {
      const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.value || null;
    } catch (err) {
      console.error('Get KV error:', err);
      return undefined;
    }
  };

  const setKV = async (key: string, value: string): Promise<boolean | undefined> => {
    try {
      const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value, updated_at: new Date().toISOString() });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Set KV error:', err);
      return undefined;
    }
  };

  const deleteKV = async (key: string): Promise<boolean | undefined> => {
    try {
      const { error } = await supabase.from('kv_store').delete().eq('key', key);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Delete KV error:', err);
      return undefined;
    }
  };

  const listKV = async (
    pattern: string,
    returnValues?: boolean
  ): Promise<string[] | KVItem[] | undefined> => {
    try {
      const { data, error } = await supabase
        .from('kv_store')
        .select('*')
        .ilike('key', `%${pattern}%`);

      if (error) throw error;

      if (returnValues) {
        return data.map((item: any) => ({
          key: item.key,
          value: item.value,
          updatedAt: new Date(item.updated_at)
        }));
      } else {
        return data.map((item: any) => item.key);
      }
    } catch (err) {
      console.error('List KV error:', err);
      return undefined;
    }
  };

  const flushKV = async (): Promise<boolean | undefined> => {
    try {
      const { error } = await supabase.from('kv_store').delete().neq('key', '');
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Flush KV error:', err);
      return undefined;
    }
  };

  return {
    isLoading: true,
    error: null,
    supabaseReady: false,
    user: null,

    signInWithGoogle: signIn,
    signOut: signOutUser,
    initialize,
    uploadFile,
    saveResumeData,
    analyzeResume: analyzeResumeImpl,
    getUserResumes,
    getResumeById,

    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signOut: signOutUser,
      refreshUser,
      checkAuthStatus,
      getUser: () => convertUser(get().user),
    },

    fs: {
      write,
      read: readFile,
      upload,
      delete: deleteFile,
      readDir,
    },

    ai: {
      chat,
      feedback,
      img2txt,
    },

    db: {
      get: getKV,
      set: setKV,
      delete: deleteKV,
      list: listKV,
      flush: flushKV,
    },

    init,
    clearError: () => set({ error: null }),
  };
});