/**
 * Conversation Service - Manages conversation history for projects
 * 
 * This service stores and retrieves conversation messages to provide
 * context to the AI for better continuity across edits.
 */

import { supabase } from './supabaseClient';

export interface ConversationMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  build_version?: number | null;
  created_at: string;
}

/**
 * Save a message to the conversation history
 */
export async function saveMessage(args: {
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  buildVersion?: number;
}): Promise<ConversationMessage | null> {
  const { projectId, role, content, buildVersion } = args;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      project_id: projectId,
      role,
      content,
      build_version: buildVersion || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }

  return data;
}

/**
 * Save multiple messages at once (for bulk operations)
 */
export async function saveMessages(
  messages: Array<{
    projectId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    buildVersion?: number;
  }>
): Promise<ConversationMessage[]> {
  if (messages.length === 0) return [];

  const inserts = messages.map(msg => ({
    project_id: msg.projectId,
    role: msg.role,
    content: msg.content,
    build_version: msg.buildVersion || null,
  }));

  const { data, error } = await supabase
    .from('messages')
    .insert(inserts)
    .select();

  if (error) {
    console.error('Error saving messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Get conversation history for a project
 * Returns messages in chronological order (oldest first)
 */
export async function getConversationHistory(
  projectId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get recent conversation history formatted for OpenAI API
 * Returns array of { role, content } objects
 */
export async function getConversationHistoryForAI(
  projectId: string,
  limit: number = 30
): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
  const messages = await getConversationHistory(projectId, limit);
  
  // Format for OpenAI API (exclude system messages from history, they're in system prompt)
  return messages
    .filter(msg => msg.role !== 'system') // System messages handled separately
    .map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
}

/**
 * Delete all messages for a project (cleanup utility)
 */
export async function deleteConversationHistory(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('Error deleting conversation history:', error);
    return false;
  }

  return true;
}

/**
 * Delete messages older than a certain date (cleanup utility)
 */
export async function deleteOldMessages(olderThan: Date): Promise<number> {
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .lt('created_at', olderThan.toISOString())
    .select();

  if (error) {
    console.error('Error deleting old messages:', error);
    return 0;
  }

  return data?.length || 0;
}

