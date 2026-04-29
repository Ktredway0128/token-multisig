// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title MultiSigWallet - Multi-signature wallet requiring multiple owner approvals
/// @author Kyle Tredway
/// @notice Allows multiple owners to submit, approve, and execute transactions together

contract MultiSigWallet is ReentrancyGuard {

    // ─── Events ───────────────────────────────────────────────────────────────

    event TransactionSubmitted(
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );

    event TransactionApproved(
        uint256 indexed txIndex,
        address indexed owner
    );

    event ApprovalRevoked(
        uint256 indexed txIndex,
        address indexed owner
    );

    event TransactionExecuted(
        uint256 indexed txIndex
    );

    // ─── State Variables ──────────────────────────────────────────────────────

    address[] public owners;
    uint256 public required;
    uint256 public transactionCount;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvalCount;
    }

    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public approved;
    mapping(address => bool) public isOwner;

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(
            _required > 0 && _required <= _owners.length,
            "Invalid required  number of owners"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactionCount, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Transaction already executed");
        _;
    }

    modifier notApproved(uint256 _txIndex) {
        require(!approved[_txIndex][msg.sender], "Transaction already approved");
        _;
    }

     // ─── functions ────────────────────────────────────────────────────────────

    /// @notice Submits a new transaction for approval
    /// @param _to The address to send the transaction to
    /// @param _value The amount of ETH to send with the transaction
    /// @param _data The encoded function call data
     
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyOwner {
        require(_to != address(0), "Invalid address");

        uint256 txIndex = transactionCount;

        transactions[txIndex] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            approvalCount: 0
        });

        transactionCount++;

        emit TransactionSubmitted(txIndex, _to, _value, _data);
    }

    /// @notice Approves a pending transaction
    /// @param _txIndex The index of the transaction to approve
    function approveTransaction(uint256 _txIndex) 
        external
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notApproved(_txIndex)
    {
        approved[_txIndex][msg.sender] = true;
        transactions[_txIndex].approvalCount++;

        emit TransactionApproved(_txIndex, msg.sender);
    }

    /// @notice Revokes a previously given approval
    /// @param _txIndex The index of the transaction to revoke approval from
    function revokeApproval(uint256 _txIndex)
        external
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(approved[_txIndex][msg.sender], "Transaction not approved");

        approved[_txIndex][msg.sender] = false;
        transactions[_txIndex].approvalCount--;

        emit ApprovalRevoked(_txIndex, msg.sender);
    }

    /// @notice Executes a transaction once the required approvals are met
    /// @param _txIndex The index of the transaction to execute
    function executeTransaction(uint256 _txIndex)
        external
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        nonReentrant
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.approvalCount >= required,
            "Not enough approvals"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );

        require(success, "Transaction failed");

        emit TransactionExecuted(_txIndex);
    }

    /// @notice Returns the list of all owners
    /// @return An array of owner addresses
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /// @notice Returns a specific transaction by index
    /// @param _txIndex The index of the transaction to retrieve
    /// @return to The destination address
    /// @return value The ETH value
    /// @return data The encoded call data
    /// @return executed Whether the transaction has been executed
    /// @return approvalCount The number of approvals
    function getTransaction(uint256 _txIndex)
        external
        view
        txExists(_txIndex)
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 approvalCount
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.approvalCount
        );
    }

}