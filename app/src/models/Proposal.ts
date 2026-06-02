import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProposal extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  options: string[];
  contractProposalId?: number;
  createdBy: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  txHash?: string;
  createdAt: Date;
}

const ProposalSchema = new Schema<IProposal>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: function (val: string[]) {
          return val.length >= 2;
        },
        message: 'At least 2 options are required',
      },
    },
    contractProposalId: {
      type: Number,
      default: undefined,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    txHash: {
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

const Proposal: Model<IProposal> =
  mongoose.models.Proposal ||
  mongoose.model<IProposal>('Proposal', ProposalSchema);

export default Proposal;
