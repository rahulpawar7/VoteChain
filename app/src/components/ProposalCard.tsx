'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// ===== Types =====
export interface Proposal {
  _id: string;
  title: string;
  description: string;
  options: string[];
  startTime: string;
  endTime: string;
  createdBy?: string | { username: string };
  votes?: number;
  totalVotes?: number;
  contractProposalId?: number;
  isActive?: boolean;
  txHash?: string;
  createdAt?: string;
}

interface ProposalCardProps {
  proposal: Proposal;
  onDelete?: (id: string) => void;
  onVote?: (proposal: Proposal) => void;
  showVoteButton?: boolean;
  userHasVoted?: boolean;
  onViewResults?: (id: string) => void;
  isAdmin?: boolean;
}

// ===== Helper Functions =====
function getStatus(startTime: string, endTime: string): 'upcoming' | 'active' | 'ended' {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

function getTimeDisplay(startTime: string, endTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  const status = getStatus(startTime, endTime);

  if (status === 'upcoming') {
    const diff = start.getTime() - now.getTime();
    return `Starts in ${formatDuration(diff)}`;
  }
  if (status === 'active') {
    const diff = end.getTime() - now.getTime();
    return `Ends in ${formatDuration(diff)}`;
  }
  const diff = now.getTime() - end.getTime();
  return `Ended ${formatDuration(diff)} ago`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// ===== Status Badge Component =====
function StatusBadge({ status }: { status: 'upcoming' | 'active' | 'ended' }) {
  const config = {
    upcoming: {
      label: 'Upcoming',
      classes: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-400',
    },
    active: {
      label: 'Active',
      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400 animate-pulse',
    },
    ended: {
      label: 'Ended',
      classes: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
      dot: 'bg-gray-400',
    },
  };

  const { label, classes, dot } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ===== Main Component =====
export default function ProposalCard({
  proposal,
  onDelete,
  onVote,
  showVoteButton = false,
  userHasVoted = false,
}: ProposalCardProps) {
  const router = useRouter();
  const status = getStatus(proposal.startTime, proposal.endTime);
  const timeDisplay = getTimeDisplay(proposal.startTime, proposal.endTime);
  const voteCount = proposal.totalVotes ?? proposal.votes ?? 0;

  return (
    <div className="group glass rounded-2xl p-6 hover:bg-white/[0.07] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 border border-white/5 hover:border-purple-500/20">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-purple-200 transition-colors line-clamp-1 flex-1">
          {proposal.title}
        </h3>
        <StatusBadge status={status} />
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
        {proposal.description}
      </p>

      {/* Options Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {proposal.options.slice(0, 4).map((option, idx) => (
          <span
            key={idx}
            className="px-2.5 py-1 rounded-lg bg-gray-800/60 text-gray-300 text-xs font-medium border border-gray-700/40"
          >
            {option}
          </span>
        ))}
        {proposal.options.length > 4 && (
          <span className="px-2.5 py-1 rounded-lg bg-gray-800/60 text-gray-500 text-xs font-medium border border-gray-700/40">
            +{proposal.options.length - 4} more
          </span>
        )}
      </div>

      {/* Meta Info Row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{timeDisplay}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>{proposal.options.length} option{proposal.options.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        {/* Vote Button */}
        {showVoteButton && status === 'active' && !userHasVoted && onVote && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote(proposal);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vote
          </button>
        )}

        {/* Already Voted Badge */}
        {userHasVoted && (
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-medium border border-purple-500/15">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Voted
          </span>
        )}

        {/* View Results */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/results/${proposal._id}`);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/15 text-sm font-medium transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Results
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Delete Button (only for upcoming proposals) */}
        {onDelete && status === 'upcoming' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this proposal?')) {
                onDelete(proposal._id);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-sm font-medium transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
