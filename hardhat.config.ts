// require("@nomiclabs/hardhat-waffle");
// module.exports = {
//   solidity: {
//     version: "0.7.5",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200
//       }
//     }
//   },
//   defaultNetwork: "mainnet",
//   networks:{
//     mainnet: {
//       url: "https://api.avax.network/ext/bc/C/rpc",
//       accounts: ["d6314c428ef4600d9f501b114e44241d6fd37df704dd3a184557a111bc96db1f"],
//     }
//   },
// };

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
  // defaultNetwork: "mainnet",
  // networks:{
  //   mainnet: {
  //     url: "https://api.avax.network/ext/bc/C/rpc",
  //   }
  // },
}