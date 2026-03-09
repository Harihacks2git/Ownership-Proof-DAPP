// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ContentRegistry {
    address public authority; // AU address

    struct Content {
        string cid; // IPFS CID
        string title;
        string description;
        string contentType;
        address owner; // current owner
        uint256 timestamp;
        address[] ownerHistory;
        uint256[] timeHistory;
    }

    struct TransferRequest {
        address requester;
        uint256 price; // 0 for free transfer
        bool isPending;
        uint256 timestamp;
    }

    mapping(string => bool) private cidExists;
    mapping(string => Content) private contents; // keyed by contentID / CID or some ID
    mapping(address => string[]) private userContents;
    mapping(string => mapping(address => TransferRequest)) private transferRequests; // contentId => requester => request
    mapping(string => address[]) private contentRequesters; // contentId => list of requester addresses

    struct Approval {
        address requester;
        uint256 price;
        uint256 timestamp;
        bool isActive;
    }

    uint256 public cooldownDuration = 86400; // 1 day default, configurable
    mapping(string => Approval) private activeApprovals; // contentId => Approval

    event ContentRegistered(string indexed contentId, address indexed owner, uint256 timestamp);
    event ContentTransferred(string indexed contentId, address indexed from, address indexed to, uint256 timestamp);
    event ContentAuthorityUpdated(string indexed contentId, string oldCid, string newCid, address indexed authority, uint256 timestamp);
    event OwnershipRequested(string indexed contentId, address indexed requester, uint256 price, uint256 timestamp);
    event OwnershipApproved(string indexed contentId, address indexed owner, address indexed buyer, uint256 timestamp);
    event OwnershipRejected(string indexed contentId, address indexed owner, address indexed requester, uint256 timestamp);
    event DuplicateRegistrationAttempt(string indexed contentId, address indexed attempter, address indexed currentOwner, uint256 timestamp);
    event TransferApproved(string indexed contentId, address indexed owner, address indexed requester, uint256 price, uint256 timestamp);
    event ApprovalCleared(string indexed contentId, address indexed requester, uint256 timestamp);
    event RequestWithdrawn(string indexed contentId, address indexed requester, uint256 timestamp);

    modifier onlyAuthority() {
        require(msg.sender == authority, "only authority can call");
        _;
    }

    constructor(address _authority) {
        require(_authority != address(0), "invalid authority");
        authority = _authority;
    }

    // Check if content exists (read-only, no gas required)
    function checkContentExists(string memory contentId) public view returns (bool) {
        return cidExists[contentId];
    }
    
    // Log duplicate attempt (separate transaction, called only when needed)
    function logDuplicateAttempt(string memory contentId) public {
        require(cidExists[contentId], "Content doesn't exist");
        Content storage existing = contents[contentId];
        emit DuplicateRegistrationAttempt(contentId, msg.sender, existing.owner, block.timestamp);
    }

    // Registration by owner (owner signs with their wallet off-chain - here we use msg.sender)
    function registerContent(string memory contentId, string memory title, string memory description, string memory contentType) public {
        // If content already exists, just revert (frontend will call logDuplicateAttempt separately)
        require(!cidExists[contentId], "content already registered");
        
        Content storage c = contents[contentId];
        c.cid = contentId;
        c.title = title;
        c.description = description;
        c.contentType = contentType;
        c.owner = msg.sender;
        c.timestamp = block.timestamp;
        c.ownerHistory.push(msg.sender);
        c.timeHistory.push(block.timestamp);
        cidExists[contentId] = true;
        userContents[msg.sender].push(contentId);

        emit ContentRegistered(contentId, msg.sender, block.timestamp);
    }

    // Owner initiates transfer (on-chain record)
    // This function implements transferOwnership as required by the base paper
    function transferContentToBuyer(string memory contentId, address buyer) public {
        require(cidExists[contentId], "not registered");
        Content storage c = contents[contentId];
        require(msg.sender == c.owner, "only owner can transfer");
        address prev = c.owner;
        c.owner = buyer;
        c.ownerHistory.push(buyer);
        c.timeHistory.push(block.timestamp);
        userContents[buyer].push(contentId);

        emit ContentTransferred(contentId, prev, buyer, block.timestamp);
    }

    // Alias for transferOwnership (matches requirement naming)
    function transferOwnership(string memory contentId, address newOwner) public {
        transferContentToBuyer(contentId, newOwner);
    }

    // Authority-controlled update: replaces the stored CID (redact/update) while keeping owner history.
    function authorityUpdateCID(string memory contentId, string memory newCid) public onlyAuthority {
        require(cidExists[contentId], "not registered");
        require(bytes(newCid).length > 0, "new cid required");
        Content storage c = contents[contentId];
        string memory old = c.cid;
        c.cid = newCid;
        // record authority action in history
        c.ownerHistory.push(msg.sender);
        c.timeHistory.push(block.timestamp);

        emit ContentAuthorityUpdated(contentId, old, newCid, msg.sender, block.timestamp);
    }

    // getter
    function getUserContents(address _user) public view returns (string[] memory) {
        return userContents[_user];
    }

    function getContent(string memory _cid) public view returns (Content memory) {
        require(cidExists[_cid], "Content not found");
        return contents[_cid];
    }

    function isContentRegistered(string memory _cid) public view returns (bool) {
        return cidExists[_cid];
    }

    // Request ownership transfer (buyer initiates)
    function requestOwnership(string memory contentId, uint256 price) public {
        require(cidExists[contentId], "Content not registered");
        Content storage c = contents[contentId];
        require(msg.sender != c.owner, "Owner cannot request own content");
        
        // Allow multiple requests - each user can have one pending request
        TransferRequest storage existingReq = transferRequests[contentId][msg.sender];
        require(!existingReq.isPending, "You already have a pending request for this content");

        transferRequests[contentId][msg.sender] = TransferRequest({
            requester: msg.sender,
            price: price,
            isPending: true,
            timestamp: block.timestamp
        });
        contentRequesters[contentId].push(msg.sender);

        emit OwnershipRequested(contentId, msg.sender, price, block.timestamp);
    }

    // Approve transfer request (owner approves — records approval without transferring)
    function approveTransfer(string memory contentId, address requester) public {
        require(cidExists[contentId], "Content not registered");
        Content storage c = contents[contentId];
        require(msg.sender == c.owner, "Only owner can approve");
        TransferRequest storage req = transferRequests[contentId][requester];
        require(req.isPending, "No pending request from this user");

        // Check that no other active non-expired approval exists for this content
        Approval storage existing = activeApprovals[contentId];
        if (existing.isActive && block.timestamp <= existing.timestamp + cooldownDuration) {
            revert("another approval is active");
        }

        // Record the approval — keep request pending so it stays visible
        activeApprovals[contentId] = Approval({
            requester: requester,
            price: req.price,
            timestamp: block.timestamp,
            isActive: true
        });

        // Do NOT set isPending = false here — the request stays visible until payment completes or is cancelled

        emit TransferApproved(contentId, msg.sender, requester, req.price, block.timestamp);
    }

    // Finalize transfer after payment confirmed (authority-only)
    function finalizeTransfer(string memory contentId, address requester) public onlyAuthority {
        Approval storage approval = activeApprovals[contentId];
        require(approval.isActive == true && approval.requester == requester, "no active approval");
        require(block.timestamp <= approval.timestamp + cooldownDuration, "approval expired");

        Content storage c = contents[contentId];
        address previousOwner = c.owner;

        // Execute ownership transfer
        c.owner = requester;
        c.ownerHistory.push(requester);
        c.timeHistory.push(block.timestamp);
        userContents[requester].push(contentId);

        // Clear the approval
        approval.isActive = false;

        // Now reject all pending requests (including the approved one) since transfer is done
        address[] memory requesters = contentRequesters[contentId];
        for (uint256 i = 0; i < requesters.length; i++) {
            TransferRequest storage req = transferRequests[contentId][requesters[i]];
            if (req.isPending) {
                req.isPending = false;
                if (requesters[i] != requester) {
                    emit OwnershipRejected(contentId, previousOwner, requesters[i], block.timestamp);
                }
            }
        }

        // Delete contentRequesters for this content
        delete contentRequesters[contentId];

        emit OwnershipApproved(contentId, previousOwner, requester, block.timestamp);
        emit ContentTransferred(contentId, previousOwner, requester, block.timestamp);
    }

    // Cancel an active approval (requester decides not to pay)
    function cancelApproval(string memory contentId) public {
        Approval storage approval = activeApprovals[contentId];
        require(approval.isActive, "no active approval");
        require(approval.requester == msg.sender, "only approved requester can cancel");

        approval.isActive = false;

        // Withdraw the requester's pending request
        TransferRequest storage req = transferRequests[contentId][msg.sender];
        if (req.isPending) {
            req.isPending = false;
        }

        emit RequestWithdrawn(contentId, msg.sender, block.timestamp);
    }

    // Clear an expired approval so the owner can approve someone else
    function clearExpiredApproval(string memory contentId) public {
        Approval storage approval = activeApprovals[contentId];
        require(approval.isActive == true, "no active approval");
        require(block.timestamp > approval.timestamp + cooldownDuration, "approval not expired");

        approval.isActive = false;

        emit ApprovalCleared(contentId, approval.requester, block.timestamp);
    }

    // Update cooldown duration (authority-only, for testing with shorter durations)
    function setCooldownDuration(uint256 newDuration) public onlyAuthority {
        cooldownDuration = newDuration;
    }

    // View function to get the approval for a content item
    function getApproval(string memory contentId) public view returns (Approval memory) {
        return activeApprovals[contentId];
    }

    // Reject transfer request (owner rejects)
    function rejectTransfer(string memory contentId, address requester) public {
        require(cidExists[contentId], "Content not registered");
        Content storage c = contents[contentId];
        require(msg.sender == c.owner, "Only owner can reject");
        TransferRequest storage req = transferRequests[contentId][requester];
        require(req.isPending, "No pending request from this user");

        req.isPending = false;

        emit OwnershipRejected(contentId, msg.sender, requester, block.timestamp);
    }

    // Withdraw a pending transfer request (requester cancels their own request)
    function withdrawRequest(string memory contentId) public {
        require(cidExists[contentId], "Content not registered");
        TransferRequest storage req = transferRequests[contentId][msg.sender];
        require(req.isPending, "No pending request to withdraw");

        req.isPending = false;

        emit RequestWithdrawn(contentId, msg.sender, block.timestamp);
    }

    // Get pending transfer request for a content from specific requester
    function getTransferRequest(string memory contentId, address requester) public view returns (TransferRequest memory) {
        return transferRequests[contentId][requester];
    }
}
