require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Use the pinned local solc package so compilation works without a compiler download.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }, _hre, runSuper) => {
  if (solcVersion !== "0.8.30") return runSuper();
  return {
    compilerPath: require.resolve("solc/soljson.js"),
    isSolcJs: true,
    version: solcVersion,
    longVersion: require("solc").version(),
  };
});

const sepolia =
  process.env.SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY
    ? {
        sepolia: {
          url: process.env.SEPOLIA_RPC_URL,
          accounts: [process.env.DEPLOYER_PRIVATE_KEY],
          chainId: 11155111,
        },
      }
    : {};

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: { hardhat: {}, ...sepolia },
};
