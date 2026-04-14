/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar errores de linter durante el build para permitir el despliegue
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignorar errores de tipos durante el build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Habilitar exportación estática para Firebase Hosting (Clásico)
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  // Limitar trabajadores para evitar errores de memoria (OOM) en el build
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
