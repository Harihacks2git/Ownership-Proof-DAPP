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

    mapping(string => bool) private cidExists;
    mapping(string => Content) private contents; // keyed by contentID / CID or some ID
    mapping(address => string[]) private userContents;

    event ContentRegistered(string indexed contentId, address indexed owner, uint256 timestamp);
    event ContentTransferred(string indexed contentId, address indexed from, address indexed to, uint256 timestamp);
    event ContentAuthorityUpdated(string indexed contentId, string oldCid, string newCid, address indexed authority, uint256 timestamp);

    modifier onlyAuthority() {
        require(msg.sender == authority, "only authority can call");
        _;
    }

    constructor(address _authority) {
        require(_authority != address(0), "invalid authority");
        authority = _authority;
    }

    // Registration by owner (owner signs with their wallet off-chain - here we use msg.sender)
    function registerContent(string memory contentId, string memory title, string memory description, string memory contentType) public {
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
}
