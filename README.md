# TOKEN LIQUIDITY LOCK CONTRACT

[![Verified on Etherscan](https://img.shields.io/badge/Etherscan-Verified-brightgreen)](https://sepolia.etherscan.io/address/0x1BA24F8ebA2d865493b8e4B3D6cd1bDe8d42338B#code
)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)

Built by [Tredway Development](https://tredwaydev.com) — professional Solidity smart contract packages for Web3 companies.

A secure and production-ready liquidity lock contract built with Solidity, OpenZeppelin, and Hardhat.

> ⚠️ These contracts have not been professionally audited. A full security audit is strongly recommended before any mainnet deployment.

This project allows projects to lock LP tokens from a decentralized exchange, proving to investors that liquidity cannot be removed after launch.

Smart contract development
Automated testing
Deployment scripting
Security best practices

This contract is part of the Tredway Development full token suite, which includes token launch, vesting, airdrop, staking, crowdsale, and governance infrastructure.

## DASHBOARD

Live dashboard: [token-liquidity-lock-dashboard.netlify.app](https://token-liquidity-lock-dashboard.netlify.app)

Dashboard repository: [token-liquidity-lock-dashboard](https://github.com/Ktredway0128/token-liquidity-lock-dashboard)


## PROJECT GOALS

The purpose of this project is to give Web3 projects a trustless way to prove liquidity commitment to their community.

The contract includes the core features required by a production liquidity lock:

LP token deposits from any DEX
Time-based unlock enforcement
Multiple locks per wallet
Public lock visibility
Rug pull prevention


## SMART CONTRACT FEATURES

TRUSTLESS CUSTODY

Once LP tokens are deposited, no one — including the contract deployer — can access them before the unlock time. The contract itself is the sole authority.

MULTI-TOKEN SUPPORT

Any ERC-20 LP token can be locked. Uniswap, Sushiswap, or any DEX pair token is supported without modification.

MULTIPLE LOCKS PER OWNER

A single wallet can create multiple locks for different tokens or different unlock periods simultaneously.

TIME-BASED UNLOCKING

Each lock stores a Unix timestamp. Withdrawals are rejected until `block.timestamp` reaches the unlock time.

REENTRANCY PROTECTION

The contract uses OpenZeppelin's ReentrancyGuard on all state-changing functions. State is updated before any token transfer to prevent reentrancy attacks.

SAFE TOKEN TRANSFERS

All token transfers use OpenZeppelin's SafeERC20 library, protecting against non-standard ERC-20 implementations that don't return a boolean on transfer.

EVENT TRACKING

The contract emits events for every major action:

TokensLocked

TokensWithdrawn

Events are indexed by owner and token address for efficient frontend filtering.


## TECHNOLOGY STACK

Solidity – Smart contract programming language

Hardhat – Ethereum development environment

Ethers.js – Contract interaction library

OpenZeppelin Contracts – Secure smart contract libraries

Mocha & Chai – JavaScript testing framework

Alchemy – Ethereum RPC provider

Sepolia Test Network – Deployment environment


## PROJECT STRUCTURE

contracts/
    LiquidityLock.sol
    SampleToken.sol

scripts/
    deploy.js
    deploy-demo.js
    deploy-token.js

test/
    LiquidityLock.test.js

hardhat.config.js
.env

CONTRACTS

LiquidityLock.sol is the core deliverable. SampleToken.sol is included as a test fixture only and is not part of the production deployment.

SCRIPTS

deploy.js deploys LiquidityLock to Sepolia and verifies on Etherscan.
deploy-demo.js deploys the full local environment with two test tokens for dashboard development.
deploy-token.js deploys SampleToken independently for testing purposes.

TESTS

Contains automated tests verifying all major contract behaviors.


## SMART CONTRACT ARCHITECTURE

The LiquidityLock contract extends OpenZeppelin's ReentrancyGuard and uses the following libraries:

ReentrancyGuard – Prevents reentrancy attacks on withdraw
SafeERC20 – Safe token transfer handling
IERC20 – Interface for interacting with any ERC-20 token

Each lock is stored as a struct containing the token address, owner address, amount, unlock timestamp, and withdrawal status. Locks are organized in a private mapping from owner address to an array of Lock structs, exposed through controlled view functions.


## INSTALLATION

### CLONE THE REPOSITORY:

git clone https://github.com/Ktredway0128/token-liquidity-lock

cd token-liquidity-lock

### INSTALL DEPENDENCIES:

npm install

### COMPILE THE CONTRACT:

npx hardhat compile

### RUN THE TEST SUITE:

npx hardhat test

### THE TESTS VALIDATE:

Successful token locking

Multiple locks per owner

Zero amount rejection

Zero address rejection

Withdrawal after unlock time

Withdrawal rejection before unlock time

Double withdrawal prevention

Cross-wallet withdrawal prevention


## ENVIRONMENT SETUP

Create a .env file in the root directory.

ALCHEMY_API_URL=YOUR_SEPOLIA_RPC_URL

DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY

ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY


## DEPLOYMENT

To deploy the contract to Sepolia:

npx hardhat run scripts/deploy.js --network sepolia

The deployment script performs the following steps:

Retrieves the deployer wallet

Creates the contract factory

Deploys LiquidityLock with no constructor arguments

Waits for block confirmations

Verifies the contract on Etherscan


### SEPOLIA TESTNET DEPLOYMENT

| Contract | Address | Etherscan |
|----------|---------|-----------|
| LiquidityLock | 0x1BA24F8ebA2d865493b8e4B3D6cd1bDe8d42338B | https://sepolia.etherscan.io/address/0x1BA24F8ebA2d865493b8e4B3D6cd1bDe8d42338B#code
 |

Deployed: 2026/4/27


## SECURITY PRACTICES

The contract uses well-established patterns from OpenZeppelin including:

ReentrancyGuard on all state-changing functions

SafeERC20 for all token transfers

State updates before external calls

No admin privileges or owner controls

These are common practices used in production smart contracts.


## EXAMPLE USE CASES

This liquidity lock contract is suitable for:

Token launch projects proving liquidity commitment

DEX launches requiring investor trust

Presale projects locking LP after launch

Any project needing verifiable liquidity lockup


## FULL TOKEN SUITE

This contract is part of the Tredway Development token suite:

| Contract | Description |
|----------|-------------|
| SampleToken V1 | ERC-20 token with minting, burning, and pause |
| TokenVesting | Cliff and linear vesting schedules |
| TokenAirdrop | Merkle tree airdrop distribution |
| TokenStaking | ERC-20 staking with rewards |
| TokenCrowdsale | Capped token crowdsale |
| SampleToken V2 | Governance token with voting and permit |
| TimelockController | Time-delayed governance execution |
| TokenGovernance | On-chain DAO voting |
| NftMembership | ERC-721 membership NFT |
| LiquidityLock | LP token time lock |


## AUTHOR

Kyle Tredway

Smart Contract Developer / Token Launch Specialist

tredwaydev.com | @kyletredwaydev

## LICENSE

MIT License