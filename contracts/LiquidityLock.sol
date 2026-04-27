// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

/// @title LiquidityLock - Lock LP tokens to prove liquidity commitment
/// @author Kyle Tredway
/// @notice Allows projects to lock LP tokens for a set period of time

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LiquidityLock is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        address token;
        address owner;
        uint256 amount;
        uint256 unlockTime;
        bool withdrawn;
    }

    mapping(address => Lock[]) private locks;

    event TokensLocked(
        address indexed owner,
        address indexed token,
        uint256 amount,
        uint256 unlockTime,
        uint256 lockIndex
    );

    event TokensWithdrawn(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    constructor() ReentrancyGuard() {}

    /// @notice Locks LP tokens for a specified duration
    /// @param tokenAddress The LP token contract address to lock
    /// @param amount The number of tokens to lock
    /// @param unlockTime The unix timestamp when tokens can be withdrawn

    function lockTokens(
        address tokenAddress,
        uint256 amount, 
        uint256 unlockTime
    ) external nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(unlockTime > block.timestamp, "Unlock time must be in the future");

        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), amount);

        locks[msg.sender].push(Lock({
            token: tokenAddress,
            owner: msg.sender,
            amount: amount,
            unlockTime: unlockTime,
            withdrawn: false
        }));

        uint256 lockIndex = locks[msg.sender].length -1;

        emit TokensLocked(msg.sender, tokenAddress, amount, unlockTime, lockIndex);
    }

    /// @notice Withdraws locked tokens after the unlock time has passed
    /// @param lockIndex The index of the lock to withdraw from 
    function withdrawTokens(uint256 lockIndex) external nonReentrant {
        require(lockIndex < locks[msg.sender].length, "Invalid lock index");

        Lock storage lock = locks[msg.sender][lockIndex];

        require(lock.owner == msg.sender, "Not the lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Tokens are still locked");

        lock.withdrawn = true;

        IERC20(lock.token).safeTransfer(msg.sender, lock.amount);

        emit TokensWithdrawn(msg.sender, lock.token, lock.amount);
    }

    /// @notice Returns all locks for a given owner
    /// @param owner The address to query locks for
    /// @return An array of Lock structs belonging to the owner
    function getLocks(address owner) external view returns (Lock[] memory) {
        return locks[owner];
    }

    /// @notice Returns a specific lock for a given owner and index
    /// @param owner The address to query
    /// @param lockIndex The index of the lock to retrieve
    /// @return The Lock struct at the given index
    function getLock(
        address owner,
        uint256 lockIndex
    ) external view returns (Lock memory) {
        require(lockIndex < locks[owner].length, "Invalid lock index");
        return locks[owner][lockIndex];
    }

}
