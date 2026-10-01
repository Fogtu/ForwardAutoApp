import { supabase } from '../lib/supabaseClient.js'

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('label')
  if (error) throw error
  return data
}

export async function fetchCategoryById(id) {
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
