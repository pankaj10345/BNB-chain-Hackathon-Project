const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function verify(address, args) {
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: args
    });
    console.log(`Verified: ${address}`);
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    if (msg.toLowerCase().includes("already verified")) {
      console.log(`Already verified: ${address}`);
      return;
    }
    throw error;
  }
}

async function main() {
  const file = path.join(__dirname, "..", ".deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing deployment file: ${file}`);
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const { busd, arbExecutor, yieldVault, priceOracle } = data.contracts;

  await verify(arbExecutor, [busd]);
  await verify(yieldVault, [busd]);
  await verify(priceOracle, []);

  // Mock token only when deployed by script.
  if (data.network !== "mainnet" && data.network !== "bsc") {
    try {
      await verify(busd, ["Mock BUSD", "mBUSD"]);
    } catch (error) {
      console.log(`Skipped mock token verification: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
