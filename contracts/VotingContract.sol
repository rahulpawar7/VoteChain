// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VotingContract
 * @dev On-chain proposal creation and voting with restrictions
 * @notice Supports multiple proposals with multiple options, one vote per address per proposal
 */
contract VotingContract {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        string[] options;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        address creator;
        uint256 totalVotes;
    }

    // State variables
    uint256 public proposalCount;
    address public owner;

    // Mappings
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => uint256)) public voteCounts; // proposalId => optionIndex => count
    mapping(uint256 => mapping(address => bool)) public hasVoted; // proposalId => voter => voted
    mapping(uint256 => mapping(address => uint256)) public voterChoice; // proposalId => voter => optionIndex

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        string title,
        address indexed creator,
        uint256 startTime,
        uint256 endTime,
        uint256 optionCount
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 optionIndex,
        uint256 timestamp
    );

    event ProposalDeactivated(uint256 indexed proposalId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Proposal does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        proposalCount = 0;
    }

    /**
     * @dev Create a new proposal (only owner/admin)
     * @param _title Title of the proposal
     * @param _description Description of the proposal
     * @param _options Array of option strings
     * @param _startTime Unix timestamp for voting start
     * @param _endTime Unix timestamp for voting end
     */
    function createProposal(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_options.length >= 2, "Must have at least 2 options");
        require(_options.length <= 10, "Maximum 10 options allowed");
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime >= block.timestamp, "Start time must be in the future");

        proposalCount++;
        
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.options = _options;
        newProposal.startTime = _startTime;
        newProposal.endTime = _endTime;
        newProposal.isActive = true;
        newProposal.creator = msg.sender;
        newProposal.totalVotes = 0;

        emit ProposalCreated(
            proposalCount,
            _title,
            msg.sender,
            _startTime,
            _endTime,
            _options.length
        );

        return proposalCount;
    }

    /**
     * @dev Cast a vote on a proposal
     * @param _proposalId ID of the proposal
     * @param _optionIndex Index of the chosen option
     */
    function vote(uint256 _proposalId, uint256 _optionIndex) external proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.isActive, "Proposal is not active");
        require(block.timestamp >= proposal.startTime, "Voting has not started yet");
        require(block.timestamp <= proposal.endTime, "Voting has ended");
        require(!hasVoted[_proposalId][msg.sender], "You have already voted on this proposal");
        require(_optionIndex < proposal.options.length, "Invalid option index");

        hasVoted[_proposalId][msg.sender] = true;
        voterChoice[_proposalId][msg.sender] = _optionIndex;
        voteCounts[_proposalId][_optionIndex]++;
        proposal.totalVotes++;

        emit VoteCast(_proposalId, msg.sender, _optionIndex, block.timestamp);
    }

    /**
     * @dev Deactivate a proposal (only owner)
     * @param _proposalId ID of the proposal to deactivate
     */
    function deactivateProposal(uint256 _proposalId) external onlyOwner proposalExists(_proposalId) {
        proposals[_proposalId].isActive = false;
        emit ProposalDeactivated(_proposalId);
    }

    /**
     * @dev Get proposal details
     * @param _proposalId ID of the proposal
     */
    function getProposal(uint256 _proposalId) external view proposalExists(_proposalId) returns (
        uint256 id,
        string memory title,
        string memory description,
        string[] memory options,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        address creator,
        uint256 totalVotes
    ) {
        Proposal storage p = proposals[_proposalId];
        return (
            p.id,
            p.title,
            p.description,
            p.options,
            p.startTime,
            p.endTime,
            p.isActive,
            p.creator,
            p.totalVotes
        );
    }

    /**
     * @dev Get vote counts for all options of a proposal
     * @param _proposalId ID of the proposal
     */
    function getResults(uint256 _proposalId) external view proposalExists(_proposalId) returns (
        string[] memory options,
        uint256[] memory votes,
        uint256 totalVotes
    ) {
        Proposal storage p = proposals[_proposalId];
        uint256[] memory counts = new uint256[](p.options.length);
        
        for (uint256 i = 0; i < p.options.length; i++) {
            counts[i] = voteCounts[_proposalId][i];
        }

        return (p.options, counts, p.totalVotes);
    }

    /**
     * @dev Check if an address has voted on a proposal
     * @param _proposalId ID of the proposal
     * @param _voter Address of the voter
     */
    function checkVoted(uint256 _proposalId, address _voter) external view proposalExists(_proposalId) returns (bool) {
        return hasVoted[_proposalId][_voter];
    }

    /**
     * @dev Get the number of options for a proposal
     * @param _proposalId ID of the proposal
     */
    function getOptionCount(uint256 _proposalId) external view proposalExists(_proposalId) returns (uint256) {
        return proposals[_proposalId].options.length;
    }

    /**
     * @dev Transfer contract ownership
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        owner = _newOwner;
    }
}
