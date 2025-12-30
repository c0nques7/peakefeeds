export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress [DEP0169] DeprecationWarning: url.parse() behavior is not standardized...
    // This warning is caused by next-auth v4 dependency on openid-client
    const originalEmitWarning = process.emitWarning;
    process.emitWarning = (warning: any, ...args: any[]) => {
      if (typeof warning === 'string') {
        if (warning.includes('url.parse()')) return;
      } else if (warning && typeof warning === 'object' && 'code' in warning && warning.code === 'DEP0169') {
        return;
      }
      return originalEmitWarning.call(process, warning, ...args);
    };
  }
}
