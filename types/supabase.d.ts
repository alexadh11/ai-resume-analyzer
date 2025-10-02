// supabase.d.ts - Type definitions for Supabase Zustand store

import type { User } from '@supabase/supabase-js';

export interface SupabaseUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
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

export interface AIAnalysisResult {
  feedback: string;
  rating: number;
}

export interface UploadResponse {
  path: string;
  downloadURL: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
}

export interface ChatMessageContent {
  type: "text" | "image" | "file";
  text?: string;
  imageData?: { data: string; mimeType: string };
  fileURL?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ChatMessageContent[];
}

export interface GeminiOptions {
  model?: "gemini-1.5-pro" | "gemini-1.5-flash" | "gemini-pro-vision";
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

export interface AIResponse {
  message: { role: "assistant"; content: string; refusal: null | string };
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  model: string;
  finishReason: string;
}

export interface KVItem {
  key: string;
  value: string;
  updatedAt?: Date;
}