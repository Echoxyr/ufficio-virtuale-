import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Profile {
  id: string
  org_id: string
  handle: string
  display_name: string
  role: 'user' | 'moderator' | 'admin'
  department?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  org_id: string
  name: string
  description?: string
  type: 'public' | 'private' | 'dm'
  created_by: string
  retention_days?: number
  created_at: string
  updated_at: string
}

export interface Thread {
  id: string
  channel_id: string
  title?: string
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string
}

export interface Message {
  id: string
  thread_id: string
  user_id: string
  body_md: string
  reply_to?: string
  ttl_hours?: number
  edited_at?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Attachment {
  id: string
  message_id: string
  filename: string
  original_name: string
  content_type: string
  size_bytes: number
  storage_path: string
  uploaded_by: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message?: string
  data?: any
  read_at?: string
  created_at: string
}

// Auth helpers
export const createAccount = async (handle: string, password: string, displayName: string, orgId: string) => {
  const email = `${handle}@org.local`
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (authError) throw authError
  if (!authData.user) throw new Error('Failed to create user')
  
  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      org_id: orgId,
      handle,
      display_name: displayName,
    })
  
  if (profileError) throw profileError
  
  return authData
}

export const signInWithHandle = async (handle: string, password: string) => {
  const email = `${handle}@org.local`
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// Utility functions
export const getSignedUrl = async (path: string, expiresIn = 300) => {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, expiresIn)
    
  if (error) throw error
  return data.signedUrl
}

export const uploadAttachment = async (file: File, messageId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const path = `${messageId}/${fileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, file)
    
  if (uploadError) throw uploadError
  
  const { error: dbError } = await supabase
    .from('attachments')
    .insert({
      message_id: messageId,
      filename: fileName,
      original_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      storage_path: path,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    })
    
  if (dbError) throw dbError
  
  return path
}

// DLP client-side pre-check (optional feedback)
export const checkDLP = (text: string) => {
  const ibanPattern = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/i
  const cfPattern = /\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/i
  
  const warnings = []
  
  if (ibanPattern.test(text)) {
    warnings.push('IBAN codes are not allowed and will be blocked')
  }
  
  if (cfPattern.test(text)) {
    warnings.push('Codice Fiscale will be automatically masked')
  }
  
  return warnings
}
