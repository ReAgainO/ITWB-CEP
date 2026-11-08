const fs = require("node:fs/promises");
const path = require("node:path");
const { ethers, network } = require("hardhat");

async function main() {
  if (network.name !== "hardhat") {
    throw new Error("Gas measurement must run on the local Hardhat network.");
  }

  const [organizer, attendee] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("CampusEventPass");
  const contract = await factory.deploy();
  const deployment = await contract.deploymentTransaction().wait();
  const claim = await (await contract.connect(attendee).claim()).wait();
  const checkIn = await (await contract.connect(organizer).checkIn(1)).wait();
  const outputPath = path.resolve(__dirname, "..", "docs", "local-gas-measurements.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({
    source: "Local ephemeral Hardhat network; not a Sepolia transaction or price estimate",
    measuredAt: new Date().toISOString(),
    compiler: require("solc").version(),
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    gasUsed: {
      deploy: deployment.gasUsed.toString(),
      claim: claim.gasUsed.toString(),
      checkIn: checkIn.gasUsed.toString(),
    },
  }, null, 2) + "\n");

  console.log("Local Hardhat gas measurements (not Sepolia transactions):");
  console.log(`Deploy: ${deployment.gasUsed.toString()}`);
  console.log(`Claim: ${claim.gasUsed.toString()}`);
  console.log(`Check-in: ${checkIn.gasUsed.toString()}`);
  console.log(`Measurement record: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
