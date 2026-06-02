import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Proposal from '@/models/Proposal';
import Vote from '@/models/Vote';
import { authenticateRequest, AuthError } from '@/lib/auth';
import { getContract, getAdminSigner } from '@/lib/contract';

interface RouteContext {
  params: Promise<{ proposalId: string }>;
}

/**
 * GET /api/results/[proposalId]
 * Get voting results for a proposal.
 * Returns both on-chain results (if available) and MongoDB aggregated results.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const _user = authenticateRequest(request);
    const { proposalId } = await context.params;

    await connectDB();

    // ── Find the proposal ─────────────────────────────────────────────
    const proposal = await Proposal.findById(proposalId);

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // ── Aggregate MongoDB votes ───────────────────────────────────────
    const voteAggregation = await Vote.aggregate([
      {
        $match: {
          proposalId: proposal._id,
        },
      },
      {
        $group: {
          _id: '$optionIndex',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Build vote counts array aligned to proposal options
    const dbVotes: number[] = new Array(proposal.options.length).fill(0);
    let dbTotalVotes = 0;

    for (const agg of voteAggregation) {
      if (agg._id >= 0 && agg._id < proposal.options.length) {
        dbVotes[agg._id] = agg.count;
        dbTotalVotes += agg.count;
      }
    }

    // ── Attempt to fetch on-chain results ─────────────────────────────
    let onChain = false;
    let onChainOptions: string[] = proposal.options;
    let onChainVotes: number[] = dbVotes;
    let onChainTotalVotes: number = dbTotalVotes;

    if (proposal.contractProposalId && proposal.contractProposalId > 0) {
      try {
        const contract = getContract(getAdminSigner());
        const result = await contract.getResults(proposal.contractProposalId);

        onChainOptions = result[0] as string[];
        onChainVotes = (result[1] as bigint[]).map((v: bigint) => Number(v));
        onChainTotalVotes = Number(result[2]);
        onChain = true;
      } catch (err) {
        console.error('Failed to fetch on-chain results:', err);
        // Fall back to MongoDB results
      }
    }

    return NextResponse.json(
      {
        success: true,
        proposal: {
          id: proposal._id,
          title: proposal.title,
          description: proposal.description,
          options: proposal.options,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          isActive: proposal.isActive,
        },
        results: {
          options: onChain ? onChainOptions : proposal.options,
          votes: onChain ? onChainVotes : dbVotes,
          totalVotes: onChain ? onChainTotalVotes : dbTotalVotes,
        },
        onChain,
        dbResults: {
          options: proposal.options,
          votes: dbVotes,
          totalVotes: dbTotalVotes,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('GET /api/results/[proposalId] error:', error);

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
