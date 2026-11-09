// Define the allowed verification methods here
export type VerificationMethod = 'NONE' | 'WALLET' | 'SKIP';

// You can also add other shared interfaces here later
export interface PostData {
    content: string;
    method: VerificationMethod;
}