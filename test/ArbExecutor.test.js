const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArbExecutor", function () {
  let owner;
  let other;
  let asset;
  let marketA;
  let marketB;
  let executor;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20.deploy("Mock BUSD", "mBUSD");
    await asset.waitForDeployment();

    const MockPredictionMarket = await ethers.getContractFactory("MockPredictionMarket");
    marketA = await MockPredictionMarket.deploy(await asset.getAddress(), 250); // 2.5%
    marketB = await MockPredictionMarket.deploy(await asset.getAddress(), 250); // 2.5%
    await marketA.waitForDeployment();
    await marketB.waitForDeployment();

    const ArbExecutor = await ethers.getContractFactory("ArbExecutor");
    executor = await ArbExecutor.deploy(await asset.getAddress());
    await executor.waitForDeployment();

    // Seed executor capital + market liquidity.
    await asset.mint(await executor.getAddress(), ethers.parseEther("1000"));
    await asset.mint(owner.address, ethers.parseEther("10000"));

    await asset.approve(await marketA.getAddress(), ethers.parseEther("3000"));
    await asset.approve(await marketB.getAddress(), ethers.parseEther("3000"));
    await marketA.seedLiquidity(ethers.parseEther("3000"));
    await marketB.seedLiquidity(ethers.parseEther("3000"));

    await executor.setApprovedMarket(await marketA.getAddress(), true);
    await executor.setApprovedMarket(await marketB.getAddress(), true);
  });

  it("executes profitable arbitrage", async function () {
    const amountIn = ethers.parseEther("100");
    const minProfit = ethers.parseEther("1");

    await executor.executeArbitrage({
      marketA: await marketA.getAddress(),
      marketB: await marketB.getAddress(),
      marketIdA: 1,
      marketIdB: 1,
      amountIn,
      buyYesOnA: true,
      minProfit
    });

    expect(await executor.totalTradesExecuted()).to.equal(1);
    expect(await executor.totalProfitEarned()).to.be.gte(minProfit);
  });

  it("reverts for unapproved market", async function () {
    await executor.setApprovedMarket(await marketB.getAddress(), false);

    await expect(
      executor.executeArbitrage({
        marketA: await marketA.getAddress(),
        marketB: await marketB.getAddress(),
        marketIdA: 1,
        marketIdB: 1,
        amountIn: ethers.parseEther("100"),
        buyYesOnA: true,
        minProfit: 0
      })
    ).to.be.revertedWith("ArbExecutor: market not approved");
  });

  it("reverts when paused", async function () {
    await executor.pause();

    await expect(
      executor.executeArbitrage({
        marketA: await marketA.getAddress(),
        marketB: await marketB.getAddress(),
        marketIdA: 1,
        marketIdB: 1,
        amountIn: ethers.parseEther("100"),
        buyYesOnA: true,
        minProfit: 0
      })
    ).to.be.revertedWith("Pausable: paused");
  });

  it("only owner can execute", async function () {
    await expect(
      executor.connect(other).executeArbitrage({
        marketA: await marketA.getAddress(),
        marketB: await marketB.getAddress(),
        marketIdA: 1,
        marketIdB: 1,
        amountIn: ethers.parseEther("100"),
        buyYesOnA: true,
        minProfit: 0
      })
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
