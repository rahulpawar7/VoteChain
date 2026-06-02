'use client';

import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Proposal {
  _id: string;
  title: string;
  description: string;
  options: string[];
}

interface VoteFormProps {
  proposal: Proposal;
  onVoteSuccess: () => void;
  onClose: () => void;
}

const OPTION_COLORS = [
  'from-purple-500 to-purple-600',
  'from-cyan-500 to-cyan-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-pink-500 to-pink-600',
  'from-indigo-500 to-indigo-600',
  'from-teal-500 to-teal-600',
];

const OPTION_BORDER_COLORS = [
  'border-purple-500',
  'border-cyan-500',
  'border-emerald-500',
  'border-amber-500',
  'border-rose-500',
  'border-pink-500',
  'border-indigo-500',
  'border-teal-500',
];

const OPTION_BG_COLORS = [
  'bg-purple-500/10',
  'bg-cyan-500/10',
  'bg-emerald-500/10',
  'bg-amber-500/10',
  'bg-rose-500/10',
  'bg-pink-500/10',
  'bg-indigo-500/10',
  'bg-teal-500/10',
];

export default function VoteForm({ proposal, onVoteSuccess, onClose }: VoteFormProps) {
  const { authFetch } = useAuth();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedOption === null) {
      setError('Please select an option');
      return;
    }

    // Confirmation step
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/votes', {
        method: 'POST',
        body: JSON.stringify({
          proposalId: proposal._id,
          optionIndex: selectedOption,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to cast vote');
      }

      setTxHash(data.txHash || data.transactionHash || '');
      setSuccess(true);

      setTimeout(() => {
        onVoteSuccess();
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cast vote';
      setError(message);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto glass-strong rounded-2xl shadow-2xl shadow-black/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h2 className="text-xl font-bold text-white">Cast Your Vote</h2>
            <p className="text-sm text-gray-400 mt-1">Your vote is recorded on-chain</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center animate-scale-in">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Vote Cast Successfully!</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your vote for &ldquo;{proposal.options[selectedOption!]}&rdquo; has been recorded.
            </p>
            {txHash && (
              <div className="bg-gray-800/50 rounded-xl px-4 py-3 text-xs">
                <span className="text-gray-500">TX Hash:</span>
                <p className="text-cyan-400 font-mono mt-1 break-all">{txHash}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Proposal Info */}
            <div className="bg-gray-800/30 rounded-xl px-4 py-3 border border-gray-700/30">
              <h3 className="font-semibold text-white text-sm">{proposal.title}</h3>
              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{proposal.description}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="animate-slide-down bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select your choice
              </label>
              {proposal.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const colorIdx = idx % OPTION_COLORS.length;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedOption(idx);
                      setConfirming(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-300 text-left ${
                      isSelected
                        ? `${OPTION_BORDER_COLORS[colorIdx]} ${OPTION_BG_COLORS[colorIdx]} shadow-lg`
                        : 'border-gray-700/40 hover:border-gray-600 hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Custom Radio */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected
                          ? `${OPTION_BORDER_COLORS[colorIdx]}`
                          : 'border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <div
                          className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${OPTION_COLORS[colorIdx]} animate-scale-in`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}
                    >
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Confirmation Warning */}
            {confirming && (
              <div className="animate-slide-down bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Confirm your vote</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    You are voting for &ldquo;{proposal.options[selectedOption!]}&rdquo;. This action cannot be undone.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={confirming ? () => setConfirming(false) : onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-700/50 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300 font-medium"
              >
                {confirming ? 'Go Back' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting || selectedOption === null}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  confirming
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    : 'btn-primary'
                }`}
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : confirming ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Vote
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cast Vote
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
