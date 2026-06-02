import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import Proposal from '@/models/Proposal';
import User from '@/models/User';
import {
  authenticateRequest,
  requireRole,
  AuthError,
} from '@/lib/auth';
import { getContract, getVoterSigner } from '@/lib/contract';

/**
 * POST /api/votes
 * Cast a vote. Voter role only.
 * Validates proposal, timing, and duplicate votes. Attempts on-chain vote.
 */
export async function POST(request: Request) {
  try {
    const user = requireRole(request, 'voter');

    await connectDB();

    const body = await request.json();
    const { proposalId, optionIndex } = body;

    // ── Validate required fields ──────────────────────────────────────
    if (!proposalId || optionIndex === undefined || optionIndex === null) {
      return NextResponse.json(
        { success: false, error: 'proposalId and optionIndex are required' },
        { status: 400 }
      );
    }

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return NextResponse.json(
        { success: false, error: 'optionIndex must be a non-negative number' },
        { status: 400 }
      );
    }

    // ── Find the proposal ─────────────────────────────────────────────
    const proposal = await Proposal.findById(proposalId);

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // ── Check proposal is active ──────────────────────────────────────
    if (!proposal.isActive) {
      return NextResponse.json(
        { success: false, error: 'This proposal is no longer active' },
        { status: 400 }
      );
    }

    // ── Check voting window ───────────────────────────────────────────
    const now = new Date();
    if (now < new Date(proposal.startTime)) {
      return NextResponse.json(
        { success: false, error: 'Voting has not started yet for this proposal' },
        { status: 400 }
      );
    }

    if (now > new Date(proposal.endTime)) {
      return NextResponse.json(
        { success: false, error: 'Voting period has ended for this proposal' },
        { status: 400 }
      );
    }

    // ── Validate option index is within bounds ────────────────────────
    if (optionIndex >= proposal.options.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid option index. Must be between 0 and ${proposal.options.length - 1}`,
        },
        { status: 400 }
      );
    }

    // ── Check for duplicate vote in MongoDB ───────────────────────────
    const existingVote = await Vote.findOne({
      proposalId: proposal._id,
      voter: user.userId,
    });

    if (existingVote) {
      return NextResponse.json(
        { success: false, error: 'You have already voted on this proposal' },
        { status: 409 }
      );
    }

    // ── Attempt on-chain vote ─────────────────────────────────────────
    let txHash: string | undefined;
    let walletAddress: string | undefined;
    let blockchainError: string | undefined;

    if (proposal.contractProposalId && proposal.contractProposalId > 0) {
      try {
        // Retrieve the voter's private key to sign the on-chain transaction
        const voterUser = await User.findById(user.userId).select(
          '+walletPrivateKey +walletAddress'
        );

        if (voterUser?.walletPrivateKey) {
          const voterSigner = getVoterSigner(voterUser.walletPrivateKey);
          walletAddress = voterUser.walletAddress;

          // Fund the voter's wallet from admin if needed (Hardhat local dev)
          try {
            const { getAdminSigner } = await import('@/lib/contract');
            const adminSigner = getAdminSigner();
            const balance = await voterSigner.provider!.getBalance(
              voterSigner.address
            );

            // If balance is less than 0.01 ETH, send some funds from admin
            if (balance < BigInt('10000000000000000')) {
              const fundTx = await adminSigner.sendTransaction({
                to: voterSigner.address,
                value: BigInt('100000000000000000'), // 0.1 ETH
              });
              await fundTx.wait();
            }
          } catch (fundErr) {
            console.error('Failed to fund voter wallet:', fundErr);
            // Continue anyway — they might have funds already
          }

          const contract = getContract(voterSigner);
          const tx = await contract.vote(
            proposal.contractProposalId,
            optionIndex
          );
          const receipt = await tx.wait();
          txHash = receipt?.hash || tx.hash;
        }
      } catch (err: unknown) {
        console.error('On-chain vote failed:', err);
        blockchainError =
          err instanceof Error ? err.message : 'Unknown blockchain error';
        // Continue — we'll still record the vote in MongoDB
      }
    }

    // ── Create vote record in MongoDB ─────────────────────────────────
    const vote = await Vote.create({
      proposalId: proposal._id,
      voter: user.userId,
      optionIndex,
      txHash,
      walletAddress,
    });

    const populatedVote = await Vote.findById(vote._id)
      .populate('voter', 'username email')
      .populate('proposalId', 'title');

    const response: Record<string, unknown> = {
      success: true,
      vote: populatedVote,
      txHash: txHash || null,
    };

    if (blockchainError) {
      response.blockchainError = blockchainError;
      response.note =
        'Vote recorded in database but failed to cast on-chain.';
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/votes error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    // Handle duplicate key error (compound index)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: 'You have already voted on this proposal' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/votes
 * Retrieve votes. Authenticated users only.
 * - Voters: returns only their own votes
 * - Admins: returns all votes, optionally filtered by proposalId query param
 */
export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request);

    await connectDB();

    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('proposalId');

    let query: Record<string, unknown> = {};

    if (user.role === 'voter') {
      // Voters can only see their own votes
      query.voter = user.userId;
      if (proposalId) {
        query.proposalId = proposalId;
      }
    } else if (user.role === 'admin') {
      // Admins can see all votes, optionally filtered by proposalId
      if (proposalId) {
        query.proposalId = proposalId;
      }
    }

    const votes = await Vote.find(query)
      .populate('voter', 'username email walletAddress')
      .populate('proposalId', 'title options')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, votes },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('GET /api/votes error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
