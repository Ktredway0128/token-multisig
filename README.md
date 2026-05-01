# TOKEN MULTISIG WALLET CONTRACT

[![Verified on Etherscan](https://img.shields.io/badge/Etherscan-Verified-brightgreen)](https://sepolia.etherscan.io/address/0xdF102938A7E1a9b387f70a229C8D2D43f5663368#code)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)

Built by [Tredway Development](https://tredwaydev.com) — professional Solidity smart contract packages for Web3 companies.

A secure and production-ready multi-signature wallet contract built with Solidity, OpenZeppelin, and Hardhat.

> ⚠️ These contracts have not been professionally audited. A full security audit is strongly recommended before any mainnet deployment.

This project allows multiple owners to collectively control contract execution. No single wallet can submit and execute a transaction alone — a configurable threshold of approvals is required before any action is taken.

Smart contract development
Automated testing
Deployment scripting
Security best practices

This contract is part of the Tredway Development full token suite, which includes token launch, vesting, airdrop, staking, crowdsale, governance, and multisig infrastructure.

## DASHBOARD

Live dashboard: [token-multisig-dashboard.netlify.app](https://token-multisig-dashboard.netlify.app)

Dashboard repository: [token-multisig-dashboard](https://github.com/Ktredway0128/token-multisig-dashboard)


## PROJECT GOALS

The purpose of this project is to give Web3 projects a trustless way to manage shared control over smart contracts and protocol actions.

The contract includes the core features required by a production multisig wallet:

Multi-owner transaction approval
Configurable approval threshold
Transaction submission and queuing
Approval revocation before execution
Reentrancy protected execution


## SMART CONTRACT FEATURES

MULTI-OWNER CONTROL

Transactions require a configurable number of owner approvals before execution. No single wallet has unilateral control regardless of their role in the project.

CONFIGURABLE THRESHOLD

The required number of approvals is set at deployment. A 2 of 3 or 3 of 5 configuration can be chosen to match the team structure of any project.

TRANSACTION QUEUING

Proposed transactions are stored on chain with their destination, value, and encoded call data. Owners can review, approve, or revoke at any time before execution.

APPROVAL REVOCATION

Any owner can revoke their approval before a transaction is executed. If approvals drop below the threshold the transaction cannot proceed until the threshold is met again.

ARBITRARY EXECUTION

The multisig can call any function on any contract by encoding the call data into the transaction. This makes it suitable as the owner or admin of any contract in the suite.

REENTRANCY PROTECTION

The contract uses OpenZeppelin's ReentrancyGuard on the execute function. State is updated before any external call to prevent reentrancy attacks.

DUPLICATE OWNER PREVENTION

The constructor validates that no address appears twice in the owner list and that no zero address is included.

EVENT TRACKING

The contract emits events for every major action:

TransactionSubmitted

TransactionApproved

ApprovalRevoked

TransactionExecuted

Events are indexed by transaction index and owner address for efficient frontend filtering.


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
    MultiSigWallet.sol

scripts/
    deploy-multisig.js

test/
    MultiSigWallet.test.js

hardhat.config.js
.env

CONTRACTS

MultiSigWallet.sol is the core deliverable. No auxiliary token contract is required — the multisig operates independently of any specific token standard.

SCRIPTS

deploy-multisig.js deploys MultiSigWallet to the target network, saves deployment info to a JSON file, and verifies on Etherscan when deploying to Sepolia.

TESTS

Contains 28 automated tests verifying all major contract behaviors and edge cases.


## SMART CONTRACT ARCHITECTURE

The MultiSigWallet contract extends OpenZeppelin's ReentrancyGuard and implements the following:

ReentrancyGuard – Prevents reentrancy attacks on execute

Custom owner validation – Built without OpenZeppelin Ownable to support multi-owner consensus logic

Dual owner tracking – Uses both an address array for iteration and a mapping for O(1) ownership lookups

Each transaction is stored as a struct containing the destination address, ETH value, call data, execution status, and approval count. Transactions are organized in a mapping from transaction index to Transaction struct, exposed through controlled view functions.


## INSTALLATION

### CLONE THE REPOSITORY:

git clone https://github.com/Ktredway0128/token-multisig

cd token-multisig

### INSTALL DEPENDENCIES:

npm install

### COMPILE THE CONTRACT:

npx hardhat compile

### RUN THE TEST SUITE:

npx hardhat test

### THE TESTS VALIDATE:

Correct owner and threshold setup at deployment

Rejection of invalid deployment configurations

Transaction submission by owners

Rejection of submission by non owners

Approval tracking per owner

Double approval prevention

Approval revocation

Execution after threshold is met

Execution rejection below threshold

Double execution prevention

Edge case — revoke drops below threshold before execution


## ENVIRONMENT SETUP

Create a .env file in the root directory.

ALCHEMY_API_URL=YOUR_SEPOLIA_RPC_URL

DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY

ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY


## DEPLOYMENT

To deploy the contract to Sepolia:

npx hardhat run scripts/deploy-multisig.js --network sepolia

The deployment script performs the following steps:

Retrieves the deployer wallet

Creates the contract factory

Deploys MultiSigWallet with owner addresses and required threshold

Saves deployment info to deployments/sepolia.json

Waits for block confirmations

Verifies the contract on Etherscan


### SEPOLIA TESTNET DEPLOYMENT

| Contract | Address | Etherscan |
|----------|---------|-----------|
| MultiSigWallet | 0xdF102938A7E1a9b387f70a229C8D2D43f5663368 | https://sepolia.etherscan.io/address/0xdF102938A7E1a9b387f70a229C8D2D43f5663368#code |

Deployed: 2026/5/01


## SECURITY PRACTICES

The contract uses well-established patterns from OpenZeppelin and Gnosis Safe including:

ReentrancyGuard on the execute function

Checks-effects-interactions pattern — state updated before external call

Dual owner tracking for gas efficient validation

No single point of control — all actions require multi-owner consensus

These are common practices used in production smart contracts.


## EXAMPLE USE CASES

This multisig wallet contract is suitable for:

Protocol teams requiring shared control over admin functions

DAOs needing trustless multi-owner execution

Projects transferring contract ownership to a multisig for security

Any team handling treasury or privileged contract actions


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
| MultiSigWallet | Multi-owner transaction approval |


## AUTHOR

Kyle Tredway

Smart Contract Developer / Token Launch Specialist

tredwaydev.com | @kyletredwaydev

## LICENSE

MIT License