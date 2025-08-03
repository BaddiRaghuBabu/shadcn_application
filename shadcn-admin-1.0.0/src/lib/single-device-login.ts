import { createClient } from "@supabase/supabase-js"
import { getOrSetDeviceId } from "@/lib/device"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing public Supabase env variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
const deviceId = getOrSetDeviceId()

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error || !data?.session) {
    return { error }
  }

  await fetch("/api/register-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: data.session.user.id,
      refresh_token: data.session.refresh_token,
      device_id: deviceId,
    }),
  })

  return { session: data.session }
}

// Optional: react to forced logout
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    // Redirect to login or show a message
  }
})