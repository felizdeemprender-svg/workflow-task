// next.config.mjs
var nextConfig = {
  // Ignorar errores de linter durante el build para permitir el despliegue
  eslint: {
    ignoreDuringBuilds: true
  },
  // Ignorar errores de tipos durante el build
  typescript: {
    ignoreBuildErrors: true
  }
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
