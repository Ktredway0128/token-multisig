const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Network:", hre.network.name);

    let owners;
    let deployer;

    if (hre.network.name === "sepolia") {
        [deployer] = await hre.ethers.getSigners();
        owners = [
            "0x51782f68362dda6873dB835153DDC2Dc7c92A514",
            "0xB6266E4Fd8e161A702c3c87fDC67C418bF941D90",
            "0xad08767a27bdbfE65d1D84F2ea79fa62A3009E9F"
        ];
    } else {
        [deployer] = await hre.ethers.getSigners();
        const [, owner2, owner3] = await hre.ethers.getSigners();
        owners = [deployer.address, owner2.address, owner3.address];
    }

    console.log("Deploying MultiSigWallet with account:", deployer.address);

    const required = 2;

    const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");
    const multiSig = await MultiSigWallet.deploy(owners, required);
    await multiSig.deployed();

    console.log("MultiSigWallet deployed to:", multiSig.address);
    console.log("Owners:", owners);
    console.log("Required approvals:", required);

    const deploymentInfo = {
        MultiSigWallet: {
            address: multiSig.address,
            owners: owners,
            required: required,
        }
    };

    const networkName = hre.network.name === "hardhat" ? "localhost" : hre.network.name;
    const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);

    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log(`Deployment info saved to deployments/${networkName}.json`);

    if (hre.network.name === "sepolia") {
        console.log("Waiting for block confirmations...");
        await multiSig.deployTransaction.wait(6);

        console.log("Verifying contract on Etherscan...");
        await hre.run("verify:verify", {
            address: multiSig.address,
            constructorArguments: [owners, required],
        });

        console.log("Contract verified on Etherscan");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});