/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: process.env.H5_EXPORT === '1' ? '.next-h5' : '.next',
  // GitHub Pages is hosted under /island, while TapTap mounts the H5 package
  // beneath a package directory. Relative assets keep scripts available in both
  // file-like and container launch environments.
  basePath: process.env.H5_EXPORT === '1' ? '' : '/island',
  assetPrefix: process.env.H5_EXPORT === '1' ? './' : undefined,
};

export default nextConfig;
