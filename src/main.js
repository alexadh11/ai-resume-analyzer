import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pylqglgcebqiepepbbfq.supabase.co'
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bHFnbGdjZWJxaWVwZXBiYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzk4MjEsImV4cCI6MjA3NDcxNTgyMX0.Mlh_uPRiaeqZ6FDZTGizKDkB86zYcA4exAUM9iSz4a0";

export const supabase = createClient(supabaseUrl, supabaseKey)