'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProposalCard from '@/components/ProposalCard';
import CreateProposalForm from '@/components/CreateProposalForm';
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

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, totalVotes: 0 });

  const fetchProposals = async () => {
    try {
      const res = await fetch('/api/proposals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProposals(data.proposals);
        const now = new Date();
        const active = data.proposals.filter(
          (p: Proposal) => p.isActive && new Date(p.startTime) <= now && new Date(p.endTime) >= now
        ).length;
        setStats({
          total: data.proposals.length,
          active,
          totalVotes: data.proposals.reduce((acc: number, p: Proposal) => acc + (p.contractProposalId || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard/voter');
      return;
    }
    fetchProposals();
  }, [user, token]);

  const handleDelete = async (proposalId: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchProposals();
      } else {
        alert(data.error || 'Failed to delete proposal');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete proposal');
    }
  };

  const handleProposalCreated = () => {
    setShowCreateForm(false);
    fetchProposals();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Welcome back, <span className="text-white font-medium">{user?.username}</span>
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Proposal
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Proposals', value: stats.total, icon: '📋', color: 'from-purple-500/20 to-purple-600/10' },
            { label: 'Active Now', value: stats.active, icon: '🟢', color: 'from-emerald-500/20 to-emerald-600/10' },
            { label: 'On-Chain Proposals', value: proposals.filter(p => p.contractProposalId > 0).length, icon: '⛓️', color: 'from-cyan-500/20 to-cyan-600/10' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`glass rounded-2xl p-6 bg-gradient-to-br ${stat.color} hover:scale-[1.02] transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Proposals List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">All Proposals</h2>
          {proposals.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-gray-400 text-lg">No proposals yet. Create your first proposal!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal._id}
                  proposal={proposal}
                  onDelete={handleDelete}
                  onViewResults={(id) => router.push(`/dashboard/results/${id}`)}
                  isAdmin
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Proposal Modal */}
      {showCreateForm && (
        <CreateProposalForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleProposalCreated}
        />
      )}
    </>
  );
}
