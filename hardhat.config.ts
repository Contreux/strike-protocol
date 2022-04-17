
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

// This adds support for typescript paths mappings
import "tsconfig-paths/register";


export default {
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
    },
    testnet: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
    }
  },
}

