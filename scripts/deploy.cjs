const fs = require("node:fs/promises");
const path = require("node:path");
const { ethers, network, artifacts } = require("hardhat");

async function main() {
  if (network.name !== "sepolia") {
    throw new Error("This deployment script only runs with --network sepolia.");
  }

  const [organizer] = await ethers.getSigners();
  if (!organizer) throw new Error("No deployer configured. Set DEPLOYER_PRIVATE_KEY in .env.");
  const actualNetwork = await ethers.provider.getNetwork();
  if (actualNetwork.chainId !== 11155111n) {
    throw new Error(`RPC returned chain ${actualNetwork.chainId}; expected Sepolia (11155111).`);
  }
  const balance = await ethers.provider.getBalance(organizer.address);
  if (balance === 0n) throw new Error("Deployer has no Sepolia ETH. Fund the test account before deployment.");
  console.log(`Organizer: ${organizer.address}`);
  console.log(`Sepolia balance: ${ethers.formatEther(balance)} ETH`);
  const factory = await ethers.getContractFactory("CampusEventPass");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployment = contract.deploymentTransaction();
  const receipt = await deployment.wait(2);
  if (!receipt || receipt.status !== 1) throw new Error("Deployment transaction did not succeed.");
  if (await ethers.provider.getCode(address) === "0x") throw new Error("No contract bytecode at deployed address.");
  if ((await contract.owner()).toLowerCase() !== organizer.address.toLowerCase()) {
    throw new Error("Deployed contract organizer does not match the signing account.");
  }
  const artifact = await artifacts.readArtifact("CampusEventPass");
  const manifest = {
    schemaVersion: 1,
    network: "sepolia",
    chainId: 11155111,
    contractName: "CampusEventPass",
    address,
    organizer: organizer.address,
    transactionHash: deployment.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    createdAt: new Date().toISOString(),
    explorerUrl: `https://sepolia.etherscan.io/address/${address}`,
    abi: artifact.abi,
  };
  const root = path.resolve(__dirname, "..");
  await fs.mkdir(path.join(root, "deployments"), { recursive: true });
  // Timestamped history prevents accidentally discarding an earlier contract address.
  const stamp = manifest.createdAt.replace(/[:.]/g, "-");
  await fs.writeFile(path.join(root, "deployments", `sepolia-${stamp}.json`), JSON.stringify(manifest, null, 2) + "\n");
  await fs.writeFile(path.join(root, "deployments", "sepolia.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Contract: ${address}`);
  console.log(`Deployment transaction: ${deployment.hash}`);
  console.log(`Explorer: https://sepolia.etherscan.io/address/${address}`);
  console.log("Verified deployment details and ABI saved under deployments/.");
  console.log(`Set VITE_CONTRACT_ADDRESS=${address} in .env and your hosting provider build variables, then rebuild the UI.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
