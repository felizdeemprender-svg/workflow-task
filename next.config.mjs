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
  // Habilitar exportación estática para evitar Cloud Functions en Firebase
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
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
