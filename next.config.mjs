const isH5Export = process.env.H5_EXPORT === '1';
const isXiaohongshuExport = process.env.XHS_EXPORT === '1';
const isContainerExport = isH5Export || isXiaohongshuExport;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: isXiaohongshuExport ? '.next-xiaohongshu' : isH5Export ? '.next-h5' : '.next',
  // Server builds use the site root; legacy static builds retain /island.
  // Container packages use relative assets for file and H5 launch environments.
  basePath: isContainerExport || process.env.SERVER_EXPORT === '1' ? '' : '/island',
  assetPrefix: isContainerExport ? './' : undefined,
  env: {
    NEXT_PUBLIC_XHS_EXPORT: isXiaohongshuExport ? '1' : '0',
    NEXT_PUBLIC_CLOUD_API_URL: process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://43.110.116.98',
  },
};

export default nextConfig;
