/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_API_KEY: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_NANGO_PUBLIC_KEY?: string
  readonly VITE_COMPANIES_HOUSE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
