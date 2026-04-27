const hre = require("hardhat");

async function main() {
    const [deployer, user1] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("User1 address:", user1.address);

    // Deploy LiquidityLock
    const LiquidityLock = await hre.ethers.getContractFactory("LiquidityLock");
    const liquidityLock = await LiquidityLock.deploy();
    await liquidityLock.deployed();
    console.log("LiquidityLock deployed to:", liquidityLock.address);

    // Deploy Token A
    const SampleToken = await hre.ethers.getContractFactory("SampleToken");
    const tokenA = await SampleToken.deploy(
        "Uniswap LP Token",
        "UNI-LP",
        hre.ethers.utils.parseUnits("1000000", 18),
        hre.ethers.utils.parseUnits("100000", 18)
    );
    await tokenA.deployed();
    console.log("Token A deployed to:", tokenA.address);

    // Deploy Token B
    const tokenB = await SampleToken.deploy(
        "Sushiswap LP Token",
        "SUSHI-LP",
        hre.ethers.utils.parseUnits("1000000", 18),
        hre.ethers.utils.parseUnits("100000", 18)
    );
    await tokenB.deployed();
    console.log("Token B deployed to:", tokenB.address);

    // Transfer tokens to user1
    const amountA = hre.ethers.utils.parseUnits("5000", 18);
    const amountB = hre.ethers.utils.parseUnits("3000", 18);
    await tokenA.transfer(user1.address, amountA);
    await tokenB.transfer(user1.address, amountB);
    console.log("Tokens transferred to user1");

    console.log("\n--- COPY THESE INTO YOUR DASHBOARD ---");
    console.log("LiquidityLock:", liquidityLock.address);
    console.log("Token A:", tokenA.address);
    console.log("Token B:", tokenB.address);
    console.log("User1 private key: check Hardhat default accounts");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});