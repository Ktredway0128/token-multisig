const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contract with account:", deployer.address);

    const LiquidityLock = await hre.ethers.getContractFactory("LiquidityLock");
    const liquidityLock = await LiquidityLock.deploy();
    await liquidityLock.deployed();

    console.log("LiquidityLock deployed to:", liquidityLock.address);

    console.log("Waiting for block confirmations...");
    await liquidityLock.deployTransaction.wait(5);

    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
        address: liquidityLock.address,
        constructorArguments: [],
    });

    console.log("Contract verified!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});