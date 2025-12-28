module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Configure autoprefixer to support modern browsers
      // Next.js handles browser targets, but we can be explicit
      overrideBrowserslist: [
        'defaults',
        'not IE 11', // Drop IE 11 support (Next.js doesn't support it anyway)
        'not op_mini all', // Drop Opera Mini
        '> 0.5%', // Support browsers with > 0.5% market share
        'last 2 versions', // Support last 2 versions
        'Firefox ESR', // Support Firefox ESR
      ],
    },
  },
};
