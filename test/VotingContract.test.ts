import { expect } from "chai";
import { ethers } from "hardhat";
import { VotingContract } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("VotingContract", function () {
  let votingContract: VotingContract;
  let owner: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;

  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    const VotingContractFactory = await ethers.getContractFactory("VotingContract");
    votingContract = await VotingContractFactory.deploy();
    await votingContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await votingContract.owner()).to.equal(owner.address);
    });

    it("Should initialize proposalCount to 0", async function () {
      expect(await votingContract.proposalCount()).to.equal(0);
    });
  });

  describe("Create Proposal", function () {
    it("Should create a proposal successfully", async function () {
      const now = await time.latest();
      const startTime = now + ONE_HOUR;
      const endTime = now + ONE_DAY;

      await expect(
        votingContract.createProposal(
          "Test Proposal",
          "A test proposal description",
          ["Option A", "Option B", "Option C"],
          startTime,
          endTime
        )
      )
        .to.emit(votingContract, "ProposalCreated")
        .withArgs(1, "Test Proposal", owner.address, startTime, endTime, 3);

      expect(await votingContract.proposalCount()).to.equal(1);

      const proposal = await votingContract.getProposal(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("A test proposal description");
      expect(proposal.options).to.deep.equal(["Option A", "Option B", "Option C"]);
      expect(proposal.isActive).to.be.true;
      expect(proposal.creator).to.equal(owner.address);
    });

    it("Should reject proposal from non-owner", async function () {
      const now = await time.latest();
      await expect(
        votingContract.connect(voter1).createProposal(
          "Test",
          "Desc",
          ["A", "B"],
          now + ONE_HOUR,
          now + ONE_DAY
        )
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should reject proposal with empty title", async function () {
      const now = await time.latest();
      await expect(
        votingContract.createProposal("", "Desc", ["A", "B"], now + ONE_HOUR, now + ONE_DAY)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should reject proposal with less than 2 options", async function () {
      const now = await time.latest();
      await expect(
        votingContract.createProposal("Test", "Desc", ["A"], now + ONE_HOUR, now + ONE_DAY)
      ).to.be.revertedWith("Must have at least 2 options");
    });

    it("Should reject proposal where end time <= start time", async function () {
      const now = await time.latest();
      await expect(
        votingContract.createProposal("Test", "Desc", ["A", "B"], now + ONE_DAY, now + ONE_HOUR)
      ).to.be.revertedWith("End time must be after start time");
    });

    it("Should create multiple proposals with incrementing IDs", async function () {
      const now = await time.latest();
      await votingContract.createProposal("P1", "D1", ["A", "B"], now + ONE_HOUR, now + ONE_DAY);
      await votingContract.createProposal("P2", "D2", ["C", "D"], now + ONE_HOUR, now + ONE_DAY);
      expect(await votingContract.proposalCount()).to.equal(2);
    });
  });

  describe("Voting", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const now = await time.latest();
      startTime = now + ONE_HOUR;
      endTime = now + ONE_DAY;
      await votingContract.createProposal(
        "Vote Test",
        "Testing voting",
        ["Yes", "No", "Abstain"],
        startTime,
        endTime
      );
      // Advance time to start of voting
      await time.increaseTo(startTime + 1);
    });

    it("Should allow a voter to cast a vote", async function () {
      await expect(votingContract.connect(voter1).vote(1, 0))
        .to.emit(votingContract, "VoteCast")
        .withArgs(1, voter1.address, 0, await time.latest() + 1);

      expect(await votingContract.hasVoted(1, voter1.address)).to.be.true;
    });

    it("Should prevent double voting", async function () {
      await votingContract.connect(voter1).vote(1, 0);
      await expect(
        votingContract.connect(voter1).vote(1, 1)
      ).to.be.revertedWith("You have already voted on this proposal");
    });

    it("Should prevent voting on non-existent proposal", async function () {
      await expect(
        votingContract.connect(voter1).vote(99, 0)
      ).to.be.revertedWith("Proposal does not exist");
    });

    it("Should prevent voting with invalid option index", async function () {
      await expect(
        votingContract.connect(voter1).vote(1, 5)
      ).to.be.revertedWith("Invalid option index");
    });

    it("Should prevent voting before start time", async function () {
      const now = await time.latest();
      await votingContract.createProposal(
        "Future",
        "Desc",
        ["A", "B"],
        now + ONE_DAY * 10,
        now + ONE_DAY * 20
      );
      await expect(
        votingContract.connect(voter1).vote(2, 0)
      ).to.be.revertedWith("Voting has not started yet");
    });

    it("Should prevent voting after end time", async function () {
      await time.increaseTo(endTime + 1);
      await expect(
        votingContract.connect(voter1).vote(1, 0)
      ).to.be.revertedWith("Voting has ended");
    });

    it("Should correctly count votes", async function () {
      await votingContract.connect(voter1).vote(1, 0); // Yes
      await votingContract.connect(voter2).vote(1, 0); // Yes
      await votingContract.connect(voter3).vote(1, 1); // No

      const results = await votingContract.getResults(1);
      expect(results.votes[0]).to.equal(2); // Yes = 2
      expect(results.votes[1]).to.equal(1); // No = 1
      expect(results.votes[2]).to.equal(0); // Abstain = 0
      expect(results.totalVotes).to.equal(3);
    });

    it("Should allow different voters to vote on same proposal", async function () {
      await votingContract.connect(voter1).vote(1, 0);
      await votingContract.connect(voter2).vote(1, 1);
      await votingContract.connect(voter3).vote(1, 2);

      expect(await votingContract.hasVoted(1, voter1.address)).to.be.true;
      expect(await votingContract.hasVoted(1, voter2.address)).to.be.true;
      expect(await votingContract.hasVoted(1, voter3.address)).to.be.true;
    });

    it("Should prevent voting on deactivated proposal", async function () {
      await votingContract.deactivateProposal(1);
      await expect(
        votingContract.connect(voter1).vote(1, 0)
      ).to.be.revertedWith("Proposal is not active");
    });
  });

  describe("Results", function () {
    it("Should return correct results", async function () {
      const now = await time.latest();
      await votingContract.createProposal(
        "Results Test",
        "Testing results",
        ["Alpha", "Beta"],
        now + ONE_HOUR,
        now + ONE_DAY
      );
      await time.increaseTo(now + ONE_HOUR + 1);

      await votingContract.connect(voter1).vote(1, 0);
      await votingContract.connect(voter2).vote(1, 1);

      const results = await votingContract.getResults(1);
      expect(results.options).to.deep.equal(["Alpha", "Beta"]);
      expect(results.votes[0]).to.equal(1);
      expect(results.votes[1]).to.equal(1);
      expect(results.totalVotes).to.equal(2);
    });
  });

  describe("Deactivation", function () {
    it("Should deactivate a proposal", async function () {
      const now = await time.latest();
      await votingContract.createProposal("Deact", "Desc", ["A", "B"], now + ONE_HOUR, now + ONE_DAY);

      await expect(votingContract.deactivateProposal(1))
        .to.emit(votingContract, "ProposalDeactivated")
        .withArgs(1);

      const proposal = await votingContract.getProposal(1);
      expect(proposal.isActive).to.be.false;
    });

    it("Should reject deactivation from non-owner", async function () {
      const now = await time.latest();
      await votingContract.createProposal("Deact", "Desc", ["A", "B"], now + ONE_HOUR, now + ONE_DAY);
      await expect(
        votingContract.connect(voter1).deactivateProposal(1)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await votingContract.transferOwnership(voter1.address);
      expect(await votingContract.owner()).to.equal(voter1.address);
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        votingContract.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });

    it("Should reject transfer from non-owner", async function () {
      await expect(
        votingContract.connect(voter1).transferOwnership(voter2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });
});
