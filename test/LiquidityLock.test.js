const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Liquidity Lock", function () {
    let  liquidityLock;
    let sampleToken;
    let owner;
    let user1;
    let user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy SampleToken
        const SampleToken = await ethers.getContractFactory("SampleToken");
        sampleToken = await SampleToken.deploy(
            "Sample Token",
            "STK",
            ethers.utils.parseUnits("1000000", 18),
            ethers.utils.parseUnits("100000", 18)
        );
        await sampleToken.deployed();

        // Deploy LiquidityLock
        const LiquidityLock = await ethers.getContractFactory("LiquidityLock");
        liquidityLock = await LiquidityLock.deploy();
        await liquidityLock.deployed();
    });

    it("Should lock tokens successfully", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
        await sampleToken.transfer(user1.address, amount);
        await sampleToken.connect(user1).approve(liquidityLock.address, amount);
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
    
        const lock = await liquidityLock.getLock(user1.address, 0);
        expect(lock.amount).to.equal(amount);
        expect(lock.withdrawn).to.equal(false);
        expect(lock.owner).to.equal(user1.address);
    });

    it("Should allow multiple locks from the same owner", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
        await sampleToken.transfer(user1.address, amount.mul(2));
        await sampleToken.connect(user1).approve(liquidityLock.address, amount.mul(2));
    
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
    
        const locks = await liquidityLock.getLocks(user1.address);
        expect(locks.length).to.equal(2);
    });

    it("Should not allow locking zero tokens", async function () {
        const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
        await expect(
            liquidityLock.connect(user1).lockTokens(sampleToken.address, 0, unlockTime)
        ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow zero address as token", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
        await expect(
            liquidityLock.connect(user1).lockTokens(ethers.constants.AddressZero, amount, unlockTime)
        ).to.be.revertedWith("Invalid token address");
    });

    it("Should not allow withdrawal before unlock time", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
        await sampleToken.transfer(user1.address, amount);
        await sampleToken.connect(user1).approve(liquidityLock.address, amount);
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
    
        await expect(
            liquidityLock.connect(user1).withdrawTokens(0)
        ).to.be.revertedWith("Tokens are still locked");
    });

    it("Should allow withdrawal after unlock time", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const unlockTime = Math.floor(Date.now() / 1000) + 3600;
    
        await sampleToken.transfer(user1.address, amount);
        await sampleToken.connect(user1).approve(liquidityLock.address, amount);
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
    
        await ethers.provider.send("evm_increaseTime", [3601]);
        await ethers.provider.send("evm_mine");
    
        await liquidityLock.connect(user1).withdrawTokens(0);
    
        const lock = await liquidityLock.getLock(user1.address, 0);
        expect(lock.withdrawn).to.equal(true);
    });

    it("Should not allow withdrawing twice", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const blockTime = (await ethers.provider.getBlock("latest")).timestamp;
        const unlockTime = blockTime + 3600;
    
        await sampleToken.transfer(user1.address, amount);
        await sampleToken.connect(user1).approve(liquidityLock.address, amount);
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
    
        await ethers.provider.send("evm_increaseTime", [3601]);
        await ethers.provider.send("evm_mine");
    
        await liquidityLock.connect(user1).withdrawTokens(0);
    
        await expect(
            liquidityLock.connect(user1).withdrawTokens(0)
        ).to.be.revertedWith("Already withdrawn");
    });

    it("Should not allow withdrawing someone else's lock", async function () {
        const amount = ethers.utils.parseUnits("1000", 18);
        const blockTime = (await ethers.provider.getBlock("latest")).timestamp;
        const unlockTime = blockTime + 3600;
    
        await sampleToken.transfer(user1.address, amount);
        await sampleToken.connect(user1).approve(liquidityLock.address, amount);
        await liquidityLock.connect(user1).lockTokens(sampleToken.address, amount, unlockTime);
    
        await ethers.provider.send("evm_increaseTime", [3601]);
        await ethers.provider.send("evm_mine");
    
        await expect(
            liquidityLock.connect(user2).withdrawTokens(0)
        ).to.be.revertedWith("Invalid lock index");
    });
});