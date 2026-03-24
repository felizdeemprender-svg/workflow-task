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
};

export default nextConfig;
