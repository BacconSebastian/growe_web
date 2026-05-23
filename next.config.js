/** @type {import('next').NextConfig} */
const nextConfig = {
  // SPA — sin SSR en v1
  // Todos los componentes que usan localStorage o browser APIs son "use client"
  reactStrictMode: true,
};

module.exports = nextConfig;
