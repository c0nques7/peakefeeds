import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PostVerifierModule = buildModule("PostVerifierModule", (m) => {
  const verifier = m.contract("PostVerifier");

  return { verifier };
});

export default PostVerifierModule;
