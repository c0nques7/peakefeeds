// Stand-in for the optional @x402/* payment packages that Coinbase's CDP SDK imports (it comes in
// through the Base Account wallet connector). PeakeFeeds never makes x402 payments, so these only
// need to exist for the bundler; anything that actually calls them fails loudly. See next.config.ts.
const unsupported = (name: string): never => {
  throw new Error(`x402 payments are not supported in PeakeFeeds (${name})`);
};

export class x402Client {
  constructor() { unsupported('x402Client'); }
}
export class ExactEvmScheme {
  constructor() { unsupported('ExactEvmScheme'); }
}
export class UptoEvmScheme {
  constructor() { unsupported('UptoEvmScheme'); }
}
export class ExactSvmScheme {
  constructor() { unsupported('ExactSvmScheme'); }
}
export const toClientEvmSigner = (): never => unsupported('toClientEvmSigner');
export const registerExactEvmScheme = (): never => unsupported('registerExactEvmScheme');
