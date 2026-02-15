/**
 * Applications Service
 * Handles all application CRUD operations with Supabase
 */

import { supabase } from './supabase.js';

// Get all applications for current user
export async function getAllApplications() {
  // We check for the user first to ensure we only fetch their data
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { data: [], error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', user.id) // Explicitly filter by user_id for safety
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// Create new application
export async function createApplication(appData) {
  // Get the current user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // Validation: If user is not logged in, the RLS policy will fail
  if (authError || !user) {
    console.error("Auth error:", authError);
    return { data: null, error: new Error("You must be logged in to add applications.") };
  }
  
  const { data, error } = await supabase
    .from('applications')
    .insert([{
      user_id: user.id, // Must match auth.uid() per your RLS policy
      name: appData.name,
      organization: appData.organization,
      amount: appData.amount,
      deadline: appData.deadline,
      status: appData.status || 'not_started',
      reminder: appData.reminder,
      notes: appData.notes
    }])
    .select()
    .single();
  
  return { data, error };
}

// Update application
export async function updateApplication(id, updates) {
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
}

// Delete application
export async function deleteApplication(id) {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get statistics
export async function getStats() {
  const { data } = await getAllApplications();
  
  if (!data) return null;
  
  const stats = {
    total: data.length,
    inProgress: data.filter(a => a.status === 'in_progress').length,
    awaiting: data.filter(a => a.status === 'awaiting').length,
    potentialAwards: data.reduce((sum, app) => {
      // Cleans the string (like '00,00') to be a pure number for calculations
      const amount = parseInt(app.amount?.replace(/[^0-9]/g, '') || '0');
      return sum + amount;
    }, 0)
  };
  
  return stats;
}