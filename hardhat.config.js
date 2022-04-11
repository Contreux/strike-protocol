require("@nomiclabs/hardhat-waffle");
module.exports = {
  solidity: {
    version: "0.7.5",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "mainnet",
  networks:{
    mainnet: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: ["d6314c428ef4600d9f501b114e44241d6fd37df704dd3a184557a111bc96db1f"],
    }
  },
};

