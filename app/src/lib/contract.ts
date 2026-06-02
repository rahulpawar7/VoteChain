
import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import VotingContractABI from './VotingContractABI.json';

const HARDHAT_RPC_URL =
  process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';

/**
 * Get a JSON-RPC provider connected to the Hardhat/local node.
 */
export function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(HARDHAT_RPC_URL);
}

/**
 * Get the admin signer (wallet) connected to the provider.
 * Uses the ADMIN_PRIVATE_KEY environment variable.
 */
export function getAdminSigner(): Wallet {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error(
      'ADMIN_PRIVATE_KEY environment variable is not set. Cannot create admin signer.'
    );
  }
  const provider = getProvider();
  return new Wallet(ADMIN_PRIVATE_KEY, provider);
}

/**
 * Get a Contract instance for the VotingContract.
 * Optionally accepts a custom signer or provider; defaults to the admin signer.
 */
export function getContract(
  signerOrProvider?: ethers.Signer | ethers.Provider
): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      'CONTRACT_ADDRESS environment variable is not set. Cannot create contract instance.'
    );
  }

  const runner = signerOrProvider || getAdminSigner();
  return new Contract(CONTRACT_ADDRESS, VotingContractABI, runner);
}

/**
 * Get a voter signer from a given private key, connected to the provider.
 */
export function getVoterSigner(privateKey: string): Wallet {
  const provider = getProvider();
  return new Wallet(privateKey, provider);
}
