const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
    let multiSig;
    let owner1, owner2, owner3, nonOwner;

    beforeEach(async function () {
        [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();

        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSig = await MultiSigWallet.deploy(
            [owner1.address, owner2.address, owner3.address],
            2
        );
        await multiSig.deployed();
    });

    // ─── Deployment ───────────────────────────────────────────────────────────

    describe("Deployment", function () {
        it("Should set the correct owners", async function () {
            const owners = await multiSig.getOwners();
            expect(owners).to.deep.equal([owner1.address, owner2.address, owner3.address]);
        });

        it("Should set the correct required approvals", async function () {
            expect(await multiSig.required()).to.equal(2);
        });

        it("Should set isOwner correctly", async function () {
            expect(await multiSig.isOwner(owner1.address)).to.equal(true);
            expect(await multiSig.isOwner(nonOwner.address)).to.equal(false);
        });

        it("Should reject deployment with no owners", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([], 1)
            ).to.be.revertedWith("Owners required");
        });

        it("Should reject deployment with invalid required", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([owner1.address, owner2.address], 3)
            ).to.be.revertedWith("Invalid required  number of owners");
        });

        it("Should reject duplicate owners", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([owner1.address, owner1.address], 1)
            ).to.be.revertedWith("Owner not unique");
        });

        it("Should reject zero address as owner", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([ethers.constants.AddressZero, owner1.address], 1)
            ).to.be.revertedWith("Invalid owner");
        });
    });

    // ─── Submit Transaction ───────────────────────────────────────────────────

    describe("submitTransaction", function () {
        it("Should allow owner to submit a transaction", async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            expect(await multiSig.transactionCount()).to.equal(1);
        });

        it("Should store transaction details correctly", async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            const tx = await multiSig.getTransaction(0);
            expect(tx.to).to.equal(owner2.address);
            expect(tx.value).to.equal(0);
            expect(tx.executed).to.equal(false);
            expect(tx.approvalCount).to.equal(0);
        });

        it("Should reject submission from non owner", async function () {
            await expect(
                multiSig.connect(nonOwner).submitTransaction(owner2.address, 0, "0x")
            ).to.be.revertedWith("Not an owner");
        });

        it("Should reject zero address as destination", async function () {
            await expect(
                multiSig.connect(owner1).submitTransaction(ethers.constants.AddressZero, 0, "0x")
            ).to.be.revertedWith("Invalid address");
        });
    });

    // ─── Approve Transaction ──────────────────────────────────────────────────

    describe("approveTransaction", function () {
        beforeEach(async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
        });

        it("Should allow owner to approve a transaction", async function () {
            await multiSig.connect(owner1).approveTransaction(0);
            const tx = await multiSig.getTransaction(0);
            expect(tx.approvalCount).to.equal(1);
        });

        it("Should track approvals per owner", async function () {
            await multiSig.connect(owner1).approveTransaction(0);
            expect(await multiSig.approved(0, owner1.address)).to.equal(true);
            expect(await multiSig.approved(0, owner2.address)).to.equal(false);
        });

        it("Should reject approval from non owner", async function () {
            await expect(
                multiSig.connect(nonOwner).approveTransaction(0)
            ).to.be.revertedWith("Not an owner");
        });

        it("Should reject double approval", async function () {
            await multiSig.connect(owner1).approveTransaction(0);
            await expect(
                multiSig.connect(owner1).approveTransaction(0)
            ).to.be.revertedWith("Transaction already approved");
        });

        it("Should reject approval of non existent transaction", async function () {
            await expect(
                multiSig.connect(owner1).approveTransaction(99)
            ).to.be.revertedWith("Transaction does not exist");
        });
    });

    // ─── Revoke Approval ──────────────────────────────────────────────────────

    describe("revokeApproval", function () {
        beforeEach(async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            await multiSig.connect(owner1).approveTransaction(0);
        });

        it("Should allow owner to revoke approval", async function () {
            await multiSig.connect(owner1).revokeApproval(0);
            const tx = await multiSig.getTransaction(0);
            expect(tx.approvalCount).to.equal(0);
        });

        it("Should set approved to false after revoke", async function () {
            await multiSig.connect(owner1).revokeApproval(0);
            expect(await multiSig.approved(0, owner1.address)).to.equal(false);
        });

        it("Should reject revoke from non owner", async function () {
            await expect(
                multiSig.connect(nonOwner).revokeApproval(0)
            ).to.be.revertedWith("Not an owner");
        });

        it("Should reject revoke if not approved", async function () {
            await expect(
                multiSig.connect(owner2).revokeApproval(0)
            ).to.be.revertedWith("Transaction not approved");
        });
    });

    // ─── Execute Transaction ──────────────────────────────────────────────────

    describe("executeTransaction", function () {
        beforeEach(async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            await multiSig.connect(owner1).approveTransaction(0);
            await multiSig.connect(owner2).approveTransaction(0);
        });

        it("Should execute transaction with enough approvals", async function () {
            await multiSig.connect(owner1).executeTransaction(0);
            const tx = await multiSig.getTransaction(0);
            expect(tx.executed).to.equal(true);
        });

        it("Should reject execution with not enough approvals", async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            await multiSig.connect(owner1).approveTransaction(1);
            await expect(
                multiSig.connect(owner1).executeTransaction(1)
            ).to.be.revertedWith("Not enough approvals");
        });

        it("Should reject double execution", async function () {
            await multiSig.connect(owner1).executeTransaction(0);
            await expect(
                multiSig.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Transaction already executed");
        });

        it("Should reject execution from non owner", async function () {
            await expect(
                multiSig.connect(nonOwner).executeTransaction(0)
            ).to.be.revertedWith("Not an owner");
        });
    });

    // ─── Edge Cases ───────────────────────────────────────────────────────────

    describe("Edge Cases", function () {
        it("Should fail execution after approval revoked below threshold", async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            await multiSig.connect(owner1).approveTransaction(0);
            await multiSig.connect(owner2).approveTransaction(0);
            await multiSig.connect(owner2).revokeApproval(0);
            await expect(
                multiSig.connect(owner1).executeTransaction(0)
            ).to.be.revertedWith("Not enough approvals");
        });

        it("Should increment transaction count correctly", async function () {
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            await multiSig.connect(owner1).submitTransaction(owner2.address, 0, "0x");
            expect(await multiSig.transactionCount()).to.equal(3);
        });

        it("Should reject getTransaction for non existent index", async function () {
            await expect(
                multiSig.getTransaction(99)
            ).to.be.revertedWith("Transaction does not exist");
        });

        it("Should reject deployment with required of zero", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([owner1.address, owner2.address], 0)
            ).to.be.revertedWith("Invalid required  number of owners");
        });
    });
});