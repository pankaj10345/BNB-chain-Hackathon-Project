require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "";

function getNetworkAccounts(privateKey) {
  const normalized = privateKey.trim();
  if (!normalized) {
    return [];
  }

  const stripped = normalized.startsWith("0x") ? normalized.slice(2) : normalized;
  const isValidHexKey = /^[0-9a-fA-F]{64}$/.test(stripped);
  return isValidHexKey ? [`0x${stripped}`] : [];
}

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url: process.env.BSC_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: getNetworkAccounts(AGENT_PRIVATE_KEY),
      gasPrice: 5_000_000_000
    },
    opbnbTestnet: {
      url: process.env.OPBNB_RPC || "https://opbnb-testnet-rpc.bnbchain.org",
      chainId: 5611,
      accounts: getNetworkAccounts(AGENT_PRIVATE_KEY),
      gasPrice: 1_000_000
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || ""
    }
  }
};
