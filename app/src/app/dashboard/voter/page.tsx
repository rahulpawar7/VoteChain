'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProposalCard from '@/components/ProposalCard';
import VoteForm from '@/components/VoteForm';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Proposal {
  _id: string;
  title: string;
  description: string;
  options: string[];
  contractProposalId: number;
  createdBy: { username: string };
  startTime: string;
  endTime: string;
  isActive: boolean;
  txHash: string;
  createdAt: string;
}

interface Vote {
  _id: string;
  proposalId: { _id: string; title: string; options: string[] };
  optionIndex: number;
  txHash: string;
  createdAt: string;
}

export default function VoterDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'votes'>('proposals');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [votedProposalIds, setVotedProposalIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const [proposalsRes, votesRes] = await Promise.all([
        fetch('/api/proposals', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/votes', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const proposalsData = await proposalsRes.json();
      const votesData = await votesRes.json();

      if (proposalsData.success) {
        setProposals(proposalsData.proposals);
      }
      if (votesData.success) {
        setMyVotes(votesData.votes);
        const votedIds = new Set<string>(
          votesData.votes.map((v: Vote) =>
            typeof v.proposalId === 'object' ? v.proposalId._id : v.proposalId
          )
        );
        setVotedProposalIds(votedIds);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'voter') {
      router.push('/dashboard/admin');
      return;
    }
    fetchData();
  }, [user, token]);

  const handleVoteSuccess = () => {
    setSelectedProposal(null);
    fetchData();
  };

  const now = new Date();
  const activeProposals = proposals.filter(
    (p) => p.isActive && new Date(p.startTime) <= now && new Date(p.endTime) >= now
  );
  const upcomingProposals = proposals.filter(
    (p) => p.isActive && new Date(p.startTime) > now
  );
  const endedProposals = proposals.filter(
    (p) => !p.isActive || new Date(p.endTime) < now
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Voter Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome, <span className="text-white font-medium">{user?.username}</span> — cast your votes on active proposals
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 glass rounded-xl w-fit">
          {[
            { key: 'proposals', label: 'Active Proposals', count: activeProposals.length },
            { key: 'votes', label: 'My Votes', count: myVotes.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'proposals' | 'votes')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Active Proposals Tab */}
        {activeTab === 'proposals' && (
          <div className="space-y-6">
            {activeProposals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Active Now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal._id}
                      proposal={proposal}
                      showVoteButton
                      userHasVoted={votedProposalIds.has(proposal._id)}
                      onVote={(p) => {
                        const found = proposals.find((pr) => pr._id === p._id);
                        if (found) setSelectedProposal(found);
                      }}
                      onViewResults={(id) => router.push(`/dashboard/results/${id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingProposals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  Upcoming
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal._id}
                      proposal={proposal}
                      onViewResults={(id) => router.push(`/dashboard/results/${id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {endedProposals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-500 mb-4">Ended</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {endedProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal._id}
                      proposal={proposal}
                      onViewResults={(id) => router.push(`/dashboard/results/${id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {proposals.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center">
                <span className="text-6xl mb-4 block">🗳️</span>
                <p className="text-gray-400 text-lg">No proposals available yet. Check back soon!</p>
              </div>
            )}
          </div>
        )}

        {/* My Votes Tab */}
        {activeTab === 'votes' && (
          <div>
            {myVotes.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <span className="text-6xl mb-4 block">📝</span>
                <p className="text-gray-400 text-lg">You haven&apos;t cast any votes yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myVotes.map((vote) => (
                  <div
                    key={vote._id}
                    className="glass rounded-xl p-5 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/results/${typeof vote.proposalId === 'object' ? vote.proposalId._id : vote.proposalId}`
                      )
                    }
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-white font-semibold">
                          {typeof vote.proposalId === 'object' ? vote.proposalId.title : 'Proposal'}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Voted for:{' '}
                          <span className="text-purple-400 font-medium">
                            {typeof vote.proposalId === 'object'
                              ? vote.proposalId.options[vote.optionIndex]
                              : `Option ${vote.optionIndex + 1}`}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {vote.txHash && (
                          <span className="text-xs text-cyan-400 font-mono bg-cyan-400/10 px-3 py-1 rounded-full">
                            TX: {vote.txHash.slice(0, 10)}...
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(vote.createdAt).toLocaleDateString()}
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
                          ✓ Voted
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vote Form Modal */}
      {selectedProposal && (
        <VoteForm
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onVoteSuccess={handleVoteSuccess}
        />
      )}
    </>
  );
}
