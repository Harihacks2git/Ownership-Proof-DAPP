// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ContentRegistry {
    struct Content {
        string cid;
        string title;
        string description;
        string contentType;
        address owner;
        uint256 timestamp;
    }

    mapping(string => bool) private cidExists;
    mapping(string => Content) private contents;
    mapping(address => string[]) private userContents;

    event ContentRegistered(
        string cid,
        string title,
        string contentType,
        address indexed owner
    );

    function registerContent(
        string memory _cid,
        string memory _title,
        string memory _description,
        string memory _contentType
    ) public {
        require(bytes(_cid).length > 0, "CID cannot be empty");
        require(!cidExists[_cid], "Content already registered");

        cidExists[_cid] = true;
        
        contents[_cid] = Content({
            cid: _cid,
            title: _title,
            description: _description,
            contentType: _contentType,
            owner: msg.sender,
            timestamp: block.timestamp
        });

        userContents[msg.sender].push(_cid);

        emit ContentRegistered(
            _cid,
            _title,
            _contentType,
            msg.sender
        );
    }

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
