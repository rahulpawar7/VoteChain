# VoteChain: On-Chain Proposal & Voting Board

VoteChain is a premium, full-stack, blockchain-based voting application. Admins can create proposals, define voting options, and set active windows, while Voters can securely log in, view active items, cast votes on-chain, and watch real-time charts powered by Recharts.

---

## 🚀 Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, JWT Auth, MongoDB (Mongoose)
- **Blockchain**: Solidity, Hardhat, Ethers.js v6
- **Aesthetics**: Sleek Dark Theme, glassmorphism, responsive cards, state-of-the-art gradients, and micro-animations.

---

## 🛠️ Step-by-Step Installation & Local Setup

### Prerequisites
1. **Node.js**: v18+ is recommended.
2. **MongoDB**: Make sure you have a MongoDB instance running locally (default URI: `mongodb://localhost:27017/voting-board`) or a MongoDB Atlas connection string.

---

### Step 1: Clone and Install Dependencies
Install dependencies in both the root directory (for Hardhat contracts) and the `app` directory (for the Next.js app).

1. In the **root directory**:
   ```bash
   npm install
   ```

2. In the **`app` directory**:
   ```bash
   cd app
   npm install
   ```

---

### Step 2: Configure Environment Variables
Inside the `app` directory, copy the environment configuration or check/update the `.env.local` file:

```env
MONGODB_URI=mongodb://localhost:27017/voting-board
JWT_SECRET=votechain-super-secret-jwt-key-2024-atharva-syscom
HARDHAT_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<deployed-contract-address>
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_APP_NAME=VoteChain
```
*(Note: `ADMIN_PRIVATE_KEY` defaults to Account #0 of the standard Hardhat local accounts. This is the owner of the VotingContract).*

---

### Step 3: Start the Local Hardhat Node
In the root directory, start the local Ethereum development node:
```bash
npx hardhat node
```
This runs a local blockchain at `http://127.0.0.1:8545` and outputs 20 development accounts funded with 10000 test ETH each. Keep this running in its own terminal.

---

### Step 4: Compile and Deploy the Smart Contract
In the root directory (in a new terminal), run:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```
This script will:
1. Compile the `VotingContract.sol` Solidity contract.
2. Deploy it to your local node.
3. Automatically write the new `CONTRACT_ADDRESS` inside `app/.env.local`.
4. Copy the compiled contract ABI into `app/src/lib/VotingContractABI.json`.

---

### Step 5: Start the Next.js Application
Go into the `app` directory and start the local development server:
```bash
cd app
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧪 Running Tests

### 1. Smart Contract Tests
To run unit tests for the Solidity contract, navigate to the root directory and run:
```bash
npx hardhat test
```
All 23 unit tests (testing creation restrictions, double-voting prevention, dates, deactivation, and ownership transfer) will compile and execute.

### 2. Next.js Build Check
To ensure the type-safety and structural integrity of the Next.js application, navigate to the `app` directory and run:
```bash
npm run build
```

---

## 🎨 User Flows & Key Mechanics

### 1. Registration & Auth
- Navigate to `/register` and create an account. You can choose the **Admin** or **Voter** role.
- Upon registration:
  - **Voters** are automatically assigned a unique, random Ethereum wallet (wallet address + encrypted private key saved in the database).
  - Credentials and tokens are securely signed via JWT.

### 2. Admin Dashboard (`/dashboard/admin`)
- **Stats Card**: Total Proposals, Active Now, and On-Chain Proposals.
- **Create Proposal**: Open the modal, enter a title/description, add up to 10 options dynamically, and select start/end datetimes.
  - On submit, the app invokes the `VotingContract` to register the proposal on the local blockchain, waits for confirmation, extracts the contract-assigned Proposal ID, and saves the details to MongoDB.
- **Delete Proposals**: Admins can delete upcoming proposals. This deactivates the proposal on-chain before removing it from the database.

### 3. Voter Dashboard (`/dashboard/voter`)
- **Proposals Tab**: Lists proposals grouped by status:
  - **Active Now**: Voter can click "Vote" to open a ballot overlay.
  - **Upcoming**: Details visible, vote button disabled.
  - **Ended**: Shows history.
- **Vote Form**: Voter selects their option, clicks "Cast Vote", sees a security confirmation prompt, and submits.
  - **Auto-funding mechanism**: If the voter's newly generated wallet balance is low on gas, the backend automatically sends a small amount of ETH from the Admin wallet to fund the transaction.
  - The voter's private key signs the transaction, executing an on-chain vote transaction.
- **My Votes Tab**: Shows history of votes cast by the current user, complete with dates, option chosen, and a link to the **On-Chain Transaction Hash**.

### 4. Real-time Results (`/dashboard/results/[id]`)
- Real-time page displaying stats.
- Fetches voting options, count, and status directly from the smart contract (`getResults()`) using an admin signer.
- Visualized with gorgeous Recharts charts:
  - **Bar Chart**: Shows votes per option with purple-cyan gradient bars.
  - **Pie Chart**: Illustrates vote share percentage per option.
  - **Detailed Table**: Table showing absolute count, percentage share, and progress bars.

---

## 🔒 Security and Edge Cases Handled

1. **On-Chain Double Voting**: The smart contract reverts if the same address votes twice on a proposal.
2. **Database Double Voting**: A unique compound index `{ proposalId, voter }` in MongoDB prevents database-level duplicate records.
3. **Voting Window Enforcement**: Both contract modifiers and backend route handlers reject votes submitted before the `startTime` or after the `endTime`.
4. **Admin Route Protection**: Next.js auth utilities and JWT headers enforce role access. A Voter trying to POST to `/api/proposals` receives a 403 Forbidden.
5. **No Password Exposure**: Password fields use `select: false` in Mongoose and are omitted from all JSON responses.
6. **Robust Blockchain Fallback**: If the blockchain RPC is down, proposals and votes are recorded in MongoDB and flag a `blockchainError` rather than crashing the application.
