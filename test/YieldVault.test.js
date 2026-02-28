const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YieldVault", function () {
  let owner;
  let user;
  let asset;
  let vault;
  let protocolA;
  let protocolB;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20.deploy("Mock BUSD", "mBUSD");
    await asset.waitForDeployment();

    const YieldVault = await ethers.getContractFactory("YieldVault");
    vault = await YieldVault.deploy(await asset.getAddress());
    await vault.waitForDeployment();

    const MockYieldProtocol = await ethers.getContractFactory("MockYieldProtocol");
    protocolA = await MockYieldProtocol.deploy(await asset.getAddress());
    protocolB = await MockYieldProtocol.deploy(await asset.getAddress());
    await protocolA.waitForDeployment();
    await protocolB.waitForDeployment();

    await vault.addYieldSource(await protocolA.getAddress(), 420, true);
    await vault.addYieldSource(await protocolB.getAddress(), 810, true);

    await asset.mint(user.address, ethers.parseEther("1000"));
  });

  it("handles deposit and withdraw", async function () {
    const depositAmount = ethers.parseEther("100");

    await asset.connect(user).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user).deposit(depositAmount);

    expect(await vault.totalAssets()).to.equal(depositAmount);
    expect(await vault.userShares(user.address)).to.equal(depositAmount);

    await vault.connect(user).withdraw(ethers.parseEther("25"));

    expect(await vault.userShares(user.address)).to.equal(ethers.parseEther("75"));
  });

  it("rebalances allocation to best APY source", async function () {
    const depositAmount = ethers.parseEther("200");

    await asset.connect(user).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user).deposit(depositAmount);

    await vault.allocateToSource(0, ethers.parseEther("100"));

    const source0Before = await vault.yieldSources(0);
    expect(source0Before.allocatedAmount).to.equal(ethers.parseEther("100"));

    await vault.rebalanceToOptimal();

    const source0After = await vault.yieldSources(0);
    const source1After = await vault.yieldSources(1);

    expect(source0After.allocatedAmount).to.equal(0);
    expect(source1After.allocatedAmount).to.equal(ethers.parseEther("100"));
  });
});
