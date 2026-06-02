'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ResultsChart from '@/components/ResultsChart';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ResultsData {
  proposal: {
    _id: string;
    title: string;
    description: string;
    options: string[];
    startTime: string;
    endTime: string;
    isActive: boolean;
  };
  results: {
    options: string[];
    votes: number[];
    totalVotes: number;
  };
  onChain: boolean;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/results/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to load results');
      }
    } catch (err) {
      setError('Failed to load results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && params.id) fetchResults();
  }, [token, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading results..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <span className="text-6xl mb-4 block">❌</span>
        <p className="text-red-400 text-lg">{error || 'Results not found'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 text-gray-400 hover:text-white transition"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const { proposal, results, onChain } = data;
  const now = new Date();
  const isActive = proposal.isActive && new Date(proposal.startTime) <= now && new Date(proposal.endTime) >= now;
  const hasEnded = new Date(proposal.endTime) < now;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      {/* Proposal Header */}
      <div className="glass rounded-2xl p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {proposal.title}
              </h1>
              {isActive && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              {hasEnded && (
                <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full font-medium">
                  Ended
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-2 max-w-2xl">{proposal.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {onChain && (
              <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium flex items-center gap-1">
                ⛓️ On-Chain Verified
              </span>
            )}
            <button
              onClick={fetchResults}
              className="px-4 py-2 glass rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Time Info */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Start: {new Date(proposal.startTime).toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            End: {new Date(proposal.endTime).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Total Votes */}
      <div className="glass rounded-2xl p-6 text-center bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
        <p className="text-gray-400 text-sm uppercase tracking-wider">Total Votes Cast</p>
        <p className="text-5xl font-bold text-white mt-2">{results.totalVotes}</p>
      </div>

      {/* Charts */}
      <ResultsChart results={results} />

      {/* Breakdown Table */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Vote Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">#</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Option</th>
                <th className="text-right text-gray-400 text-sm font-medium py-3 px-4">Votes</th>
                <th className="text-right text-gray-400 text-sm font-medium py-3 px-4">Percentage</th>
                <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Bar</th>
              </tr>
            </thead>
            <tbody>
              {results.options.map((option, idx) => {
                const percentage = results.totalVotes > 0
                  ? ((results.votes[idx] / results.totalVotes) * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={idx} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-4 text-white font-medium">{option}</td>
                    <td className="py-3 px-4 text-right text-white">{results.votes[idx]}</td>
                    <td className="py-3 px-4 text-right text-purple-400">{percentage}%</td>
                    <td className="py-3 px-4 w-48">
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
