import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVote extends Document {
  _id: mongoose.Types.ObjectId;
  proposalId: mongoose.Types.ObjectId;
  voter: mongoose.Types.ObjectId;
  optionIndex: number;
  txHash?: string;
  walletAddress?: string;
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
      required: [true, 'Proposal ID is required'],
    },
    voter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Voter is required'],
    },
    optionIndex: {
      type: Number,
      required: [true, 'Option index is required'],
    },
    txHash: {
      type: String,
      default: undefined,
    },
    walletAddress: {
      type: String,
      default: undefined,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

/**
 * Compound unique index to prevent double voting at the database level.
 * A voter can only vote once per proposal.
 */
VoteSchema.index({ proposalId: 1, voter: 1 }, { unique: true });

const Vote: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>('Vote', VoteSchema);

export default Vote;
