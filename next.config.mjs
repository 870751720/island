const isH5Export = process.env.H5_EXPORT === '1';
const isXiaohongshuExport = process.env.XHS_EXPORT === '1';
const isContainerExport = isH5Export || isXiaohongshuExport;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: isXiaohongshuExport ? '.next-xiaohongshu' : isH5Export ? '.next-h5' : '.next',
  // GitHub Pages is hosted under /island, while TapTap mounts the H5 package
  // beneath a package directory. Relative assets keep scripts available in both
  // file-like and container launch environments.
  basePath: isContainerExport ? '' : '/island',
  assetPrefix: isContainerExport ? './' : undefined,
  env: {
    NEXT_PUBLIC_XHS_EXPORT: isXiaohongshuExport ? '1' : '0',
    NEXT_PUBLIC_TAPTAP_H5: isH5Export && !isXiaohongshuExport ? '1' : '0',
  },
};

export default nextConfig;
