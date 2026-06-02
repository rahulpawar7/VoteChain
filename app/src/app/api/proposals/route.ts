import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Proposal from '@/models/Proposal';
import {
  authenticateRequest,
  requireRole,
  AuthError,
} from '@/lib/auth';
import { getContract, getAdminSigner } from '@/lib/contract';

/**
 * GET /api/proposals
 * Fetch all proposals. Requires authentication.
 */
export async function GET(request: Request) {
  try {
    const _user = authenticateRequest(request);

    await connectDB();

    const proposals = await Proposal.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, proposals },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('GET /api/proposals error:', error);

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
 * POST /api/proposals
 * Create a new proposal. Admin only.
 * Attempts to create on-chain, falls back to MongoDB-only on blockchain failure.
 */
export async function POST(request: Request) {
  try {
    const user = requireRole(request, 'admin');

    await connectDB();

    const body = await request.json();
    const { title, description, options, startTime, endTime } = body;

    // ── Validate required fields ──────────────────────────────────────
    if (!title || !description || !options || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'All fields are required: title, description, options, startTime, endTime',
        },
        { status: 400 }
      );
    }

    // ── Validate options ──────────────────────────────────────────────
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 options are required' },
        { status: 400 }
      );
    }

    // ── Validate times ────────────────────────────────────────────────
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format for startTime or endTime' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: 'endTime must be after startTime' },
        { status: 400 }
      );
    }

    // ── Convert to unix timestamps for on-chain ───────────────────────
    const startTimeUnix = Math.floor(startDate.getTime() / 1000);
    const endTimeUnix = Math.floor(endDate.getTime() / 1000);

    // ── Attempt on-chain creation ─────────────────────────────────────
    let contractProposalId: number = 0;
    let txHash: string | undefined;
    let blockchainError: string | undefined;

    try {
      const adminSigner = getAdminSigner();
      const contract = getContract(adminSigner);

      const tx = await contract.createProposal(
        title,
        description,
        options,
        startTimeUnix,
        endTimeUnix
      );

      const receipt = await tx.wait();

      // Extract proposalId from the ProposalCreated event
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (parsed && parsed.name === 'ProposalCreated') {
              contractProposalId = Number(parsed.args[0]);
              break;
            }
          } catch {
            // Not our event, skip
          }
        }
      }

      txHash = receipt?.hash || tx.hash;
    } catch (err: unknown) {
      console.error('Blockchain proposal creation failed:', err);
      blockchainError =
        err instanceof Error ? err.message : 'Unknown blockchain error';
      // Continue — we'll still save to MongoDB
    }

    // ── Save to MongoDB ───────────────────────────────────────────────
    const proposal = await Proposal.create({
      title,
      description,
      options,
      contractProposalId,
      createdBy: user.userId,
      startTime: startDate,
      endTime: endDate,
      isActive: true,
      txHash,
    });

    const populatedProposal = await Proposal.findById(proposal._id).populate(
      'createdBy',
      'username'
    );

    const response: Record<string, unknown> = {
      success: true,
      proposal: populatedProposal,
      txHash: txHash || null,
    };

    if (blockchainError) {
      response.blockchainError = blockchainError;
      response.note =
        'Proposal created in database but failed to create on-chain. You can retry the on-chain creation later.';
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/proposals error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    // Handle Mongoose validation error
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
