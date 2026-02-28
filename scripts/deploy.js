const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function isZeroAddress(value) {
  return !value || /^0x0{40}$/i.test(value);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);

  let busdAddress = process.env.BUSD_ADDRESS;

  if (isZeroAddress(busdAddress)) {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mock = await MockERC20.deploy("Mock BUSD", "mBUSD");
    await mock.waitForDeployment();

    busdAddress = await mock.getAddress();
    console.log(`Mock BUSD deployed: ${busdAddress}`);

    const mintTx = await mock.mint(deployer.address, hre.ethers.parseEther("1000000"));
    await mintTx.wait();
  } else {
    console.log(`Using existing BUSD token: ${busdAddress}`);
  }

  const ArbExecutor = await hre.ethers.getContractFactory("ArbExecutor");
  const arbExecutor = await ArbExecutor.deploy(busdAddress);
  await arbExecutor.waitForDeployment();

  const YieldVault = await hre.ethers.getContractFactory("YieldVault");
  const yieldVault = await YieldVault.deploy(busdAddress);
  await yieldVault.waitForDeployment();

  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();

  const addresses = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    contracts: {
      busd: busdAddress,
      arbExecutor: await arbExecutor.getAddress(),
      yieldVault: await yieldVault.getAddress(),
      priceOracle: await priceOracle.getAddress()
    },
    deployedAt: new Date().toISOString()
  };

  const outDir = path.join(__dirname, "..", ".deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));

  console.log("Deployment complete:");
  console.table(addresses.contracts);
  console.log(`Saved deployment to ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
