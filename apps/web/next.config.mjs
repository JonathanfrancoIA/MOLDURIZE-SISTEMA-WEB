/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@moldurize/ui", "@moldurize/shared"],
  webpack: (config, { isServer }) => {
    // Konva uses 'canvas' on the server side — exclude it from SSR bundle
    if (isServer) {
      config.externals = [...(config.externals || []), "canvas"];
    }
    return config;
  },
};

export default nextConfig;
