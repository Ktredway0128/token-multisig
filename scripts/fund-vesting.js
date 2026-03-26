const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const vestingAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    
    const token = await hre.ethers.getContractAt("SampleToken", tokenAddress);
    
    await token.transfer(vestingAddress, hre.ethers.utils.parseUnits("1000", 18));
    
    console.log("Sent 1000 STK to vesting contract");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});