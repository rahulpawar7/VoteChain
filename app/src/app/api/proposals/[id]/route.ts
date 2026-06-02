import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Proposal from '@/models/Proposal';
import { requireRole, authenticateRequest, AuthError } from '@/lib/auth';
import { getContract, getAdminSigner } from '@/lib/contract';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]
 * Get a single proposal by MongoDB _id. If it has a contractProposalId,
 * also fetch on-chain results.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const _user = authenticateRequest(request);
    const { id } = await context.params;

    await connectDB();

    const proposal = await Proposal.findById(id).populate(
      'createdBy',
      'username email'
    );

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // ── Fetch on-chain results if available ───────────────────────────
    let onChainResults: {
      options: string[];
      votes: number[];
      totalVotes: number;
    } | null = null;

    if (proposal.contractProposalId && proposal.contractProposalId > 0) {
      try {
        const contract = getContract(getAdminSigner());
        const result = await contract.getResults(proposal.contractProposalId);

        onChainResults = {
          options: result[0] as string[],
          votes: (result[1] as bigint[]).map((v: bigint) => Number(v)),
          totalVotes: Number(result[2]),
        };
      } catch (err) {
        console.error('Failed to fetch on-chain results:', err);
        // Non-fatal — return proposal without on-chain data
      }
    }

    const response: Record<string, unknown> = {
      success: true,
      proposal,
    };

    if (onChainResults) {
      response.onChainResults = onChainResults;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('GET /api/proposals/[id] error:', error);

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

/**
 * PUT /api/proposals/[id]
 * Update a proposal. Admin only.
 * Can only update proposals that haven't started yet (startTime > now).
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const _user = requireRole(request, 'admin');
    const { id } = await context.params;

    await connectDB();

    const proposal = await Proposal.findById(id);

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // ── Check if the proposal has started ─────────────────────────────
    if (new Date(proposal.startTime) <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot update a proposal that has already started',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, options, startTime, endTime } = body;

    // ── Update fields if provided ─────────────────────────────────────
    if (title !== undefined) proposal.title = title;
    if (description !== undefined) proposal.description = description;

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { success: false, error: 'At least 2 options are required' },
          { status: 400 }
        );
      }
      proposal.options = options;
    }

    if (startTime !== undefined) {
      const startDate = new Date(startTime);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid startTime format' },
          { status: 400 }
        );
      }
      proposal.startTime = startDate;
    }

    if (endTime !== undefined) {
      const endDate = new Date(endTime);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid endTime format' },
          { status: 400 }
        );
      }
      proposal.endTime = endDate;
    }

    // ── Validate endTime > startTime ──────────────────────────────────
    if (new Date(proposal.endTime) <= new Date(proposal.startTime)) {
      return NextResponse.json(
        { success: false, error: 'endTime must be after startTime' },
        { status: 400 }
      );
    }

    await proposal.save();

    const updatedProposal = await Proposal.findById(id).populate(
      'createdBy',
      'username'
    );

    return NextResponse.json(
      { success: true, proposal: updatedProposal },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('PUT /api/proposals/[id] error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proposals/[id]
 * Delete a proposal. Admin only.
 * Can only delete proposals that haven't started yet.
 * If the proposal has a contractProposalId, deactivates it on-chain first.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const _user = requireRole(request, 'admin');
    const { id } = await context.params;

    await connectDB();

    const proposal = await Proposal.findById(id);

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // ── Check if the proposal has started ─────────────────────────────
    if (new Date(proposal.startTime) <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete a proposal that has already started',
        },
        { status: 400 }
      );
    }

    // ── Deactivate on-chain if applicable ─────────────────────────────
    if (proposal.contractProposalId && proposal.contractProposalId > 0) {
      try {
        const adminSigner = getAdminSigner();
        const contract = getContract(adminSigner);

        const tx = await contract.deactivateProposal(
          proposal.contractProposalId
        );
        await tx.wait();
      } catch (err) {
        console.error('Failed to deactivate proposal on-chain:', err);
        // Continue with MongoDB deletion even if on-chain fails
      }
    }

    // ── Delete from MongoDB ───────────────────────────────────────────
    await Proposal.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: 'Proposal deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('DELETE /api/proposals/[id] error:', error);

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
