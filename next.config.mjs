/**
 * STATIC_EXPORT=1 builds a static site into ./out for GitHub Pages QA builds.
 * BASE_PATH sets the sub-path the site is served from (e.g. /AI-GTM-Deal-Master).
 * All progress lives in the browser, so the static site behaves like the server build.
 */
import { existsSync, readFileSync } from 'node:fs';

const staticExport = process.env.STATIC_EXPORT === '1';
/** Matches public/version.json, written by scripts/write-version.mjs before each build. */
const buildId = existsSync('public/version.json') ? JSON.parse(readFileSync('public/version.json', 'utf8')).id : 'dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_ID: buildId, NEXT_PUBLIC_BASE_PATH: staticExport ? process.env.BASE_PATH || '' : '' },
  ...(staticExport && {
    output: 'export',
    basePath: process.env.BASE_PATH || '',
    trailingSlash: true,
    images: { unoptimized: true }
  })
};

export default nextConfig;
