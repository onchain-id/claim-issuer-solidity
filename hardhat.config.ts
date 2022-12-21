import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    local: {
      url: "http://localhost:7545",
      accounts: {
        mnemonic: "acid squeeze fade now border stumble client task embrace open auto second",
      }
    }
  }
};

export default config;
