import { ethers } from "hardhat";

async function main() {
  console.log("Deploying VotingContract...");

  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContract.deploy();
  await votingContract.waitForDeployment();

  const address = await votingContract.getAddress();
  console.log(`VotingContract deployed to: ${address}`);
  console.log(`Owner: ${(await ethers.getSigners())[0].address}`);
  
  // Write the contract address to a file for the app to use
  const fs = require("fs");
  const path = require("path");
  
  const envPath = path.join(__dirname, "..", "app", ".env.local");
  let envContent = "";
  
  try {
    envContent = fs.readFileSync(envPath, "utf8");
  } catch {
    envContent = "";
  }
  
  // Update or add CONTRACT_ADDRESS
  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}`;
  }
  
  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log(`Contract address written to .env.local`);
  
  // Also write the ABI
  const artifact = require("../artifacts/contracts/VotingContract.sol/VotingContract.json");
  const abiPath = path.join(__dirname, "..", "app", "src", "lib", "VotingContractABI.json");
  fs.mkdirSync(path.dirname(abiPath), { recursive: true });
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`ABI written to src/lib/VotingContractABI.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
