/**
 * STATIC_EXPORT=1 builds a static site into ./out for GitHub Pages QA builds.
 * BASE_PATH sets the sub-path the site is served from (e.g. /AI-GTM-Deal-Master).
 * All progress lives in the browser, so the static site behaves like the server build.
 */
const staticExport = process.env.STATIC_EXPORT === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(staticExport && {
    output: 'export',
    basePath: process.env.BASE_PATH || '',
    trailingSlash: true,
    images: { unoptimized: true }
  })
};

export default nextConfig;
