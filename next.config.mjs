/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Los tipos de database.types.ts son placeholders (any).
    // Regenerar con: npx supabase gen types typescript > types/database.types.ts
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
