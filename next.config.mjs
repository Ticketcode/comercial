/** @type {import('next').NextConfig} */
const nextConfig = {
  // El paso 1 se llamaba "Tarifario"; los enlaces viejos siguen funcionando.
  async redirects() {
    return [{ source: "/proposals/:id/tarifario", destination: "/proposals/:id/diagnostico", permanent: true }];
  },
};

export default nextConfig;
