const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * @title TokenVesting Test Suite
 * @notice Tests for the TokenVesting contract including schedule creation,
 * releasing, revoking, withdrawing, edge cases, and access control
 */

describe("TokenVesting", function () {
    let Token, token;
    let Vesting, vesting;
    let owner, admin, alice, bob;
    const totalSupply = ethers.utils.parseEther("10000");

    beforeEach(async function () {
        [owner, admin, alice, bob] = await ethers.getSigners();

        // Deploy your SampleToken
        Token = await ethers.getContractFactory("SampleToken");
        token = await Token.deploy(
        "TestToken",        // name
        "TTK",              // symbol
        ethers.utils.parseEther("1000000"), // cap
        totalSupply         // initial supply
        );
        await token.deployed();

        // Deploy vesting contract
        Vesting = await ethers.getContractFactory("TokenVesting");
        vesting = await Vesting.deploy(token.address);
        await vesting.deployed();

        // Transfer some tokens to the vesting contract
        await token.transfer(vesting.address, ethers.utils.parseEther("5000"));

        // Grant ADMIN_ROLE to admin account
        const ADMIN_ROLE = await vesting.ADMIN_ROLE();
        await vesting.grantRole(ADMIN_ROLE, admin.address);
    });

    // @notice Verifies admin can create a vesting schedule and it stores correct data
    it("should allow admin to create vesting schedule", async function () {
        const start = Math.floor(Date.now() / 1000);
        const cliff = 60; // 1 min
        const duration = 3600; // 1 hour
        const amount = ethers.utils.parseEther("1000");

        await expect(
        vesting.connect(admin).createVestingSchedule(alice.address, amount, start, cliff, duration)
        ).to.emit(vesting, "VestingScheduleCreated");

        const scheduleId = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
        const schedule = await vesting.getVestingSchedule(scheduleId);

        expect(schedule.beneficiary).to.equal(alice.address);
        expect(schedule.totalAmount).to.equal(amount);
        expect(schedule.released).to.equal(0);
    });

    // @notice Verifies non-admin cannot create a vesting schedule
    it("should fail if non-admin tries to create vesting", async function () {
        const start = Math.floor(Date.now() / 1000);
        await expect(
            vesting.connect(bob).createVestingSchedule(alice.address, 100, start, 10, 100)
        ).to.be.revertedWith(
            `AccessControl: account ${bob.address.toLowerCase()} is missing role ${await vesting.ADMIN_ROLE()}`
        );
    });

    // @notice Verifies that a zero address cannot be set as beneficiary
    it("should revert when creating vesting with zero address beneficiary", async function () {
        const start = Math.floor(Date.now() / 1000);
        await expect(
            vesting.connect(admin).createVestingSchedule(
                ethers.constants.AddressZero,
                ethers.utils.parseEther("100"),
                start,
                10,
                100
            )
        ).to.be.revertedWith("Beneficiary cannot be zero address");
    });

    describe("Vesting release functionality", function () {
        let start, cliff, duration, amount, scheduleId;
    
        beforeEach(async function () {
            start = Math.floor(Date.now() / 1000);
            duration = 3600; // 1 hour
            cliff = Math.floor(duration / 4); // 25% of duration
            amount = ethers.utils.parseEther("100"); // total amount
    
            // Admin creates a vesting schedule for Alice
            await vesting.connect(admin).createVestingSchedule(
                alice.address, amount, start, cliff, duration
            );
    
            scheduleId = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
        });
    
        // @notice Verifies tokens cannot be released before the cliff period ends
        it("should not allow release before cliff", async function () {
            await expect(vesting.connect(alice).release(scheduleId))
                .to.be.revertedWith("No tokens available");
        });
    
        // @notice Verifies correct partial release amount is claimable after cliff
        it("should allow partial release after cliff", async function () {
            // Move blockchain time to exactly the cliff
            await ethers.provider.send("evm_setNextBlockTimestamp", [start + cliff]);
            await ethers.provider.send("evm_mine");
        
            // Get vesting schedule
            const schedule = await vesting.getVestingSchedule(scheduleId);
        
            // Compute expected releasable amount using contract
            const expectedReleasable = await vesting.computeReleasableAmount(schedule);
        
            // Release tokens and capture the event
            const tx = await vesting.connect(alice).release(scheduleId);
            const receipt = await tx.wait();
        
            // Extract TokensReleased event from receipt
            const event = receipt.events.find(e => e.event === "TokensReleased");
            const amountReleased = event.args.amount;
        
            // Compute Solidity-style tolerance: max 1 second of rounding error
            const tolerance = schedule.totalAmount.div(duration);
        
            // Assert the amount released is within rounding tolerance
            expect(amountReleased.sub(expectedReleasable).abs()).to.be.lte(tolerance);
        
            // Check schedule's released amount is also within tolerance
            const updatedSchedule = await vesting.getVestingSchedule(scheduleId);
            expect(updatedSchedule.released.sub(expectedReleasable).abs()).to.be.lte(tolerance);
        });
    
        // @notice Verifies all tokens are releasable after full vesting duration
        it("should release all tokens after full duration", async function () {
            // Move blockchain time past full vesting
            await ethers.provider.send("evm_setNextBlockTimestamp", [start + duration]);
            await ethers.provider.send("evm_mine");
    
            // Compute expected releasable (should be all remaining)
            const schedule = await vesting.getVestingSchedule(scheduleId);
            const expectedReleasable = await vesting.computeReleasableAmount(schedule);
    
            await expect(vesting.connect(alice).release(scheduleId))
                .to.emit(vesting, "TokensReleased")
                .withArgs(scheduleId, alice.address, expectedReleasable);
    
            const updatedSchedule = await vesting.getVestingSchedule(scheduleId);
            expect(updatedSchedule.released).to.equal(schedule.totalAmount);
        });
    });

    describe("Vesting revoke functionality", function () {
        let start, cliff, duration, amount, scheduleId;
    
        beforeEach(async function () {
            start = Math.floor(Date.now() / 1000);
            duration = 3600; // 1 hour
            cliff = Math.floor(duration / 4); // 25% of duration
            amount = ethers.utils.parseEther("100"); // total amount
    
            // Admin creates a vesting schedule for Alice
            await vesting.connect(admin).createVestingSchedule(
                alice.address, amount, start, cliff, duration
            );
    
            scheduleId = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
        });
    
        // @notice Verifies admin can revoke a schedule and unvested tokens are returned
        it("should allow admin to revoke a vesting schedule", async function () {
            // Move time past cliff so some tokens are vested
            const latestBlock = await ethers.provider.getBlock("latest");
            const currentTime = latestBlock.timestamp;
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime + cliff]);
            await ethers.provider.send("evm_mine");
        
            // Get schedule before revoke to compute expected unvested
            const schedule = await vesting.getVestingSchedule(scheduleId);
            const vested = await vesting.computeReleasableAmount(schedule);
            const unvested = schedule.totalAmount.sub(schedule.released).sub(vested);
        
            await expect(vesting.connect(admin).revoke(scheduleId))
                .to.emit(vesting, "VestingRevoked")
                .withArgs(scheduleId, alice.address, unvested);
        
            const scheduleAfter = await vesting.getVestingSchedule(scheduleId);
            expect(scheduleAfter.revoked).to.be.true;
        });
    
        // @notice Verifies non-admin cannot revoke a vesting schedule
        it("should not allow non-admin to revoke", async function () {
            await expect(vesting.connect(bob).revoke(scheduleId)).to.be.revertedWith(
                `AccessControl: account ${bob.address.toLowerCase()} is missing role ${await vesting.ADMIN_ROLE()}`
            );
        });
    
        // @notice Verifies beneficiary can still claim vested tokens after revocation
        it("should allow beneficiary to release vested tokens even after revoke", async function () {
            // Move blockchain time past cliff
            const latestBlock = await ethers.provider.getBlock("latest");
            const currentTime = latestBlock.timestamp;
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime + cliff]);
            await ethers.provider.send("evm_mine");
        
            // Admin revokes the vesting schedule
            await vesting.connect(admin).revoke(scheduleId);
        
            // Get schedule before release
            const scheduleBefore = await vesting.getVestingSchedule(scheduleId);
        
            // Compute releasable amount
            const releasable = await vesting.computeReleasableAmount(scheduleBefore);
        
            // Beneficiary releases vested tokens
            await expect(vesting.connect(alice).release(scheduleId))
                .to.emit(vesting, "TokensReleased")
                .withArgs(scheduleId, alice.address, releasable);
        
            // Confirm the released amount matches what was vested
            const scheduleAfter = await vesting.getVestingSchedule(scheduleId);
            expect(scheduleAfter.released).to.equal(releasable);
        });

        it("should correctly decrement totalAmount when revoked beneficiary releases frozen tokens", async function () {
            // Move time to halfway — some vested, some unvested
            const latestBlock = await ethers.provider.getBlock("latest");
            const currentTime = latestBlock.timestamp;
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime + cliff + 10]);
            await ethers.provider.send("evm_mine");
        
            const totalBefore = await vesting.vestingSchedulesTotalAmount();
        
            // Get releasable before revoke
            const scheduleBeforeRevoke = await vesting.getVestingSchedule(scheduleId);
            const releasable = await vesting.computeReleasableAmount(scheduleBeforeRevoke);
        
            // Admin revokes
            await vesting.connect(admin).revoke(scheduleId);
        
            const totalAfterRevoke = await vesting.vestingSchedulesTotalAmount();
        
            // Beneficiary releases frozen amount
            await vesting.connect(alice).release(scheduleId);
        
            const totalAfterRelease = await vesting.vestingSchedulesTotalAmount();
        
            // KEY ASSERTION: total locked should have decreased by the releasable amount
            expect(totalAfterRelease).to.equal(totalAfterRevoke.sub(releasable));
        
            // And total should now be 0 since this was the only schedule
            expect(totalAfterRelease).to.equal(0);
        });

        // @notice Verifies activeSchedulesCount decrements when beneficiary releases final tokens
        it("should decrement activeSchedulesCount when beneficiary releases final tokens", async function () {
            // Move time past full duration
            const latestBlock = await ethers.provider.getBlock("latest");
            const currentTime = latestBlock.timestamp;
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime + duration]);
            await ethers.provider.send("evm_mine");

            // Active count should still be 1
            expect(await vesting.activeSchedulesCount()).to.equal(1);

            // Release all tokens
            await vesting.connect(alice).release(scheduleId);

            // Active count should now be 0
            expect(await vesting.activeSchedulesCount()).to.equal(0);
        });

        // @notice Verifies activeSchedulesCount decrements on revoke and NOT again on final release
        it("should decrement activeSchedulesCount on revoke and not again on final release", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const currentTime = latestBlock.timestamp;
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime + cliff]);
            await ethers.provider.send("evm_mine");

            // Revoke — should decrement immediately
            await vesting.connect(admin).revoke(scheduleId);
            expect(await vesting.activeSchedulesCount()).to.equal(0);

            // Beneficiary releases frozen amount — should NOT decrement again
            await vesting.connect(alice).release(scheduleId);
            expect(await vesting.activeSchedulesCount()).to.equal(0);
        });
    });

    describe("Withdraw functionality", function () {
        
        // @notice Verifies admin can withdraw tokens not locked in any schedule
        it("should allow admin to withdraw unallocated tokens", async function () {
            // Get initial contract balance
            const initialBalance = await token.balanceOf(vesting.address);
    
            // Compute withdrawable amount
            const withdrawable = await vesting.getWithdrawableAmount();
    
            // Admin withdraws
            await vesting.connect(admin).withdraw(withdrawable);
    
            // Check admin balance increased
            const adminBalance = await token.balanceOf(admin.address);
            expect(adminBalance).to.equal(withdrawable);
    
            // Contract balance decreased
            const finalBalance = await token.balanceOf(vesting.address);
            expect(finalBalance).to.equal(initialBalance.sub(withdrawable));
        });
    
        // @notice Verifies non-admin cannot withdraw tokens from the contract
        it("should not allow non-admin to withdraw", async function () {
            const withdrawable = await vesting.getWithdrawableAmount();
            await expect(
                vesting.connect(alice).withdraw(withdrawable)
            ).to.be.revertedWith(
                `AccessControl: account ${alice.address.toLowerCase()} is missing role ${await vesting.ADMIN_ROLE()}`
            );
        });
    
        // @notice Verifies withdrawal reverts when amount exceeds free balance
        it("should not allow withdrawing more than available", async function () {
            const withdrawable = await vesting.getWithdrawableAmount();
            const tooMuch = withdrawable.add(ethers.utils.parseEther("1"));
    
            await expect(
                vesting.connect(admin).withdraw(tooMuch)
            ).to.be.revertedWith("Not enough free tokens");
        });
    });

    describe("TokenVesting - Edge Cases", function () {
        let Token, token;
        let Vesting, vesting;
        let owner, admin, alice, bob;
        const totalSupply = ethers.utils.parseEther("10000");

        beforeEach(async function () {
            [owner, admin, alice, bob] = await ethers.getSigners();

            // Deploy token
            Token = await ethers.getContractFactory("SampleToken");
            token = await Token.deploy("TestToken", "TTK", ethers.utils.parseEther("1000000"), totalSupply);
            await token.deployed();

            // Deploy vesting
            Vesting = await ethers.getContractFactory("TokenVesting");
            vesting = await Vesting.deploy(token.address);
            await vesting.deployed();

            // Fund vesting contract
            await token.transfer(vesting.address, ethers.utils.parseEther("5000"));

            // Grant admin role
            const ADMIN_ROLE = await vesting.ADMIN_ROLE();
            await vesting.grantRole(ADMIN_ROLE, admin.address);
        });

        // @notice Verifies schedule creation reverts with zero token amount
        it("should revert when creating vesting with zero amount", async function () {
            const start = Math.floor(Date.now() / 1000);
            await expect(
                vesting.connect(admin).createVestingSchedule(alice.address, 0, start, 10, 100)
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        // @notice Verifies schedule creation reverts when cliff exceeds duration
        it("should revert when cliff > duration", async function () {
            const start = Math.floor(Date.now() / 1000);
            await expect(
                vesting.connect(admin).createVestingSchedule(alice.address, ethers.utils.parseEther("100"), start, 200, 100)
            ).to.be.revertedWith("Cliff longer than duration");
        });

        // @notice Verifies multiple schedules for the same beneficiary get unique IDs
        it("should allow multiple vestings for same beneficiary independently", async function () {
            const start = Math.floor(Date.now() / 1000);
            await vesting.connect(admin).createVestingSchedule(alice.address, ethers.utils.parseEther("100"), start, 10, 100);
            await vesting.connect(admin).createVestingSchedule(alice.address, ethers.utils.parseEther("200"), start, 20, 200);

            const id1 = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
            const id2 = await vesting.computeVestingIdForAddressAndIndex(alice.address, 1);

            expect(id1).to.not.equal(id2);
        });

        // @notice Verifies zero tokens are releasable before vesting start time
        it("should return 0 releasable if before start", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const start = latestBlock.timestamp + 1000; // 1000 seconds in the future
            await vesting.connect(admin).createVestingSchedule(alice.address, ethers.utils.parseEther("50"), start, 0, 1000);

            const schedule = await vesting.getVestingSchedule(await vesting.computeVestingIdForAddressAndIndex(alice.address, 2));
            const releasable = await vesting.computeReleasableAmount(schedule);
            expect(releasable).to.equal(0);
        });

        // @notice Verifies immediate revocation blocks all releases when cliff not reached
        it("should allow revoke immediately after creation, beneficiary can release 0", async function () {

            const latestBlock = await ethers.provider.getBlock("latest");
            const start = latestBlock.timestamp;
        
            const cliffDuration = 1000; // long cliff
            const duration = 2000;
            const amount = ethers.utils.parseEther("10");
        
            // Create vesting schedule
            await vesting.connect(admin).createVestingSchedule(
                alice.address,
                amount,
                start,
                cliffDuration,
                duration
            );
        
            const id = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
        
            // Revoke immediately
            await vesting.connect(admin).revoke(id);
        
            // Releasable should be zero
            const schedule = await vesting.getVestingSchedule(id);
            const releasable = await vesting.computeReleasableAmount(schedule);
        
            expect(releasable).to.equal(0);
        
            // Release should revert
            await expect(
                vesting.connect(alice).release(id)
            ).to.be.revertedWith("No tokens available");
        });
        
        // @notice Verifies beneficiary can claim remaining vested tokens after partial release and revoke
        it("should allow revoke after partial release, beneficiary can release vested amount", async function () {

            const latestBlock = await ethers.provider.getBlock("latest");
            const start = latestBlock.timestamp;
        
            const cliffDuration = 100;
            const duration = 1000;
            const amount = ethers.utils.parseEther("10");
        
            // Create vesting schedule
            await vesting.connect(admin).createVestingSchedule(
                alice.address,
                amount,
                start,
                cliffDuration,
                duration
            );
        
            const id = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
        
            // Move time past cliff
            await ethers.provider.send("evm_setNextBlockTimestamp", [start + cliffDuration + 10]);
            await ethers.provider.send("evm_mine");
        
            // Compute releasable amount
            const scheduleBefore = await vesting.getVestingSchedule(id);
            const releasableBefore = await vesting.computeReleasableAmount(scheduleBefore);
        
            // Alice releases partial vested tokens
            await vesting.connect(alice).release(id);
        
            // Admin revokes the schedule
            await vesting.connect(admin).revoke(id);
        
            // Remaining vested tokens should still be releasable
            const scheduleAfter = await vesting.getVestingSchedule(id);
            const releasableAfter = await vesting.computeReleasableAmount(scheduleAfter);
        
            if (releasableAfter.gt(0)) {

                const tx = await vesting.connect(alice).release(id);
                const receipt = await tx.wait();
            
                const event = receipt.events.find(e => e.event === "TokensReleased");
                const released = event.args.amount;
            
                // Allow small rounding / timestamp tolerance
                const tolerance = scheduleAfter.totalAmount.div(duration);
            
                expect(released.sub(releasableAfter).abs()).to.be.lte(tolerance);
            }
        });

        // @notice Verifies withdrawal reverts when amount exceeds contract free balance
        it("should revert withdraw if trying to withdraw more than free balance", async function () {
            await expect(vesting.connect(admin).withdraw(ethers.utils.parseEther("100000"))).to.be.revertedWith("Not enough free tokens");
        });

        // @notice Verifies admin can withdraw all free tokens after a revoke frees them up
        it("should allow withdraw of available tokens after revokes", async function () {
            const start = Math.floor(Date.now() / 1000);
            await vesting.connect(admin).createVestingSchedule(bob.address, ethers.utils.parseEther("50"), start, 0, 1000);
            const id = await vesting.computeVestingIdForAddressAndIndex(bob.address, 0);
            await vesting.connect(admin).revoke(id);

            const freeBefore = await vesting.getWithdrawableAmount();
            await vesting.connect(admin).withdraw(freeBefore);
            const freeAfter = await vesting.getWithdrawableAmount();
            expect(freeAfter).to.equal(0);
        });
    });

    describe("renounceRole Protection", function () {
        
        // @notice Verifies admin cannot renounce DEFAULT_ADMIN_ROLE to prevent permanent lockout
        it("Admin cannot renounce DEFAULT_ADMIN_ROLE", async function () {
            const adminRole = await vesting.DEFAULT_ADMIN_ROLE();
            await expect(
                vesting.connect(owner).renounceRole(adminRole, owner.address)
            ).to.be.revertedWith("Cannot renounce admin role");
        });
    
        // @notice Verifies ADMIN_ROLE can still be renounced freely
        it("ADMIN_ROLE can still be renounced", async function () {
            const adminRole = await vesting.ADMIN_ROLE();
            await expect(
                vesting.connect(admin).renounceRole(adminRole, admin.address)
            ).to.not.be.reverted;
    
            expect(await vesting.hasRole(adminRole, admin.address)).to.equal(false);
        });
    });

    describe("getVestingIdAtIndex", function () {
        
        // @notice Verifies getVestingIdAtIndex returns the same ID as computeVestingIdForAddressAndIndex
        it("should return correct vesting ID for holder and index", async function () {
            const start = Math.floor(Date.now() / 1000);
            await vesting.connect(admin).createVestingSchedule(
                alice.address,
                ethers.utils.parseEther("100"),
                start,
                10,
                100
            );
    
            const idFromGetter = await vesting.getVestingIdAtIndex(alice.address, 0);
            const idFromCompute = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
    
            expect(idFromGetter).to.equal(idFromCompute);
        });
    });

    // @notice Verifies holdersVestingCount starts at 0 and increments correctly with each new schedule created for a beneficiary
    it("should correctly track holdersVestingCount", async function () {
        const start = Math.floor(Date.now() / 1000);
    
        expect(await vesting.holdersVestingCount(alice.address)).to.equal(0);
    
        await vesting.connect(admin).createVestingSchedule(
            alice.address, ethers.utils.parseEther("100"), start, 10, 100
        );
        expect(await vesting.holdersVestingCount(alice.address)).to.equal(1);
    
        await vesting.connect(admin).createVestingSchedule(
            alice.address, ethers.utils.parseEther("100"), start, 10, 100
        );
        expect(await vesting.holdersVestingCount(alice.address)).to.equal(2);
    });

    describe("Revocation freeze - vestedAtRevocation fix", function () {
        let start, cliff, duration, amount, scheduleId;

        beforeEach(async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            start     = latestBlock.timestamp;
            duration  = 3600;  // 1 hour
            cliff     = 0;     // no cliff so tokens vest immediately
            amount    = ethers.utils.parseEther("100");

            await vesting.connect(admin).createVestingSchedule(
                alice.address, amount, start, cliff, duration
            );
            scheduleId = await vesting.computeVestingIdForAddressAndIndex(alice.address, 0);
        });

        // THE CRITICAL TEST
        // Proves a beneficiary cannot claim tokens that vested AFTER revocation
        it("should freeze releasable amount at revocation — cannot climb after revoke", async function () {

            // Advance to 50% through vesting — ~50 tokens vested
            const halfwayPoint = start + (duration / 2);
            await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayPoint]);
            await ethers.provider.send("evm_mine");

            // Snapshot releasable RIGHT before revoke
            const scheduleBeforeRevoke = await vesting.getVestingSchedule(scheduleId);
            const releasableAtRevoke   = await vesting.computeReleasableAmount(scheduleBeforeRevoke);
            console.log("    Releasable at revoke:", ethers.utils.formatEther(releasableAtRevoke), "tokens");

            // Admin revokes
            await vesting.connect(admin).revoke(scheduleId);

            // Advance PAST full duration — without the fix this would show 100 tokens
            const pastEnd = start + duration + 1000;
            await ethers.provider.send("evm_setNextBlockTimestamp", [pastEnd]);
            await ethers.provider.send("evm_mine");

            // Releasable must still equal what it was at revoke time — not the full 100
            const scheduleAfterWait   = await vesting.getVestingSchedule(scheduleId);
            const releasableAfterWait = await vesting.computeReleasableAmount(scheduleAfterWait);
            console.log("    Releasable after waiting past full duration:", ethers.utils.formatEther(releasableAfterWait), "tokens");

            // The key assertion — releasable must equal vestedAtRevocation - released (frozen value)
            // We compare against the stored vestedAtRevocation since the revoke tx mines 1 block
            // after our snapshot, causing a tiny timestamp difference
            const frozenAmount = scheduleAfterWait.vestedAtRevocation.sub(scheduleAfterWait.released);
            expect(releasableAfterWait).to.equal(frozenAmount);

            // Also confirm it is nowhere near the full 100 tokens
            expect(releasableAfterWait).to.be.lt(amount.div(2).add(ethers.utils.parseEther("1")));

            // Beneficiary releases — must only receive ~50, NOT 100
            await vesting.connect(alice).release(scheduleId);
            const aliceBalance = await token.balanceOf(alice.address);
            console.log("    Alice received:", ethers.utils.formatEther(aliceBalance), "tokens");

            const tolerance = amount.div(duration); // 1 second worth of tokens
            expect(aliceBalance).to.be.closeTo(amount.div(2), tolerance.mul(5));
        });

        // After claiming the frozen amount, releasable must be exactly 0
        it("should return 0 releasable after beneficiary claims frozen vested amount", async function () {
            const halfwayPoint = start + (duration / 2);
            await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayPoint]);
            await ethers.provider.send("evm_mine");

            await vesting.connect(admin).revoke(scheduleId);
            await vesting.connect(alice).release(scheduleId);

            const scheduleAfter  = await vesting.getVestingSchedule(scheduleId);
            const releasableLeft = await vesting.computeReleasableAmount(scheduleAfter);

            expect(releasableLeft).to.equal(0);
        });

        // Second release attempt must revert after frozen amount is claimed
        it("should revert if beneficiary tries to release again after claiming frozen amount", async function () {
            const halfwayPoint = start + (duration / 2);
            await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayPoint]);
            await ethers.provider.send("evm_mine");

            await vesting.connect(admin).revoke(scheduleId);
            await vesting.connect(alice).release(scheduleId);

            await expect(
                vesting.connect(alice).release(scheduleId)
            ).to.be.revertedWith("No tokens available");
        });

        // vestedAtRevocation must be stored correctly on the schedule
        it("should store vestedAtRevocation correctly on the schedule struct", async function () {
            const halfwayPoint = start + (duration / 2);
            await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayPoint]);
            await ethers.provider.send("evm_mine");

            const scheduleBeforeRevoke = await vesting.getVestingSchedule(scheduleId);
            const releasableAtRevoke   = await vesting.computeReleasableAmount(scheduleBeforeRevoke);
            const expectedVested       = scheduleBeforeRevoke.released.add(releasableAtRevoke);

            await vesting.connect(admin).revoke(scheduleId);

            const scheduleAfterRevoke = await vesting.getVestingSchedule(scheduleId);
            const tolerance = amount.div(duration);
            expect(scheduleAfterRevoke.vestedAtRevocation).to.be.closeTo(expectedVested, tolerance.mul(2));
        });
    });
});