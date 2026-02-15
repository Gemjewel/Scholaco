// Replace with real Supabase credentials
const supabaseUrl = 'https://PROJECT_ID.supabase.co'
const supabaseKey = 'ANON_PUBLIC_KEY'

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

console.log("Supabase connected:", supabase)
