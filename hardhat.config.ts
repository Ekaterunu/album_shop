import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
    solidity: "0.8.28",
    networks: {
        hardhat:{},
        sepolia: {
      
            url: process.env.INFURA_URL,
            accounts: [process.env.SEPOLIA_PRIVATE_KEY1 as string, process.env.SEPOLIA_PRIVATE_KEY2 as string] // Приведение типа
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API
      },
};

export default config;