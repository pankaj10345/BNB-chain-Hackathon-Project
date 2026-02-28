const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle", function () {
  let owner;
  let reporter;
  let other;
  let oracle;

  beforeEach(async function () {
    [owner, reporter, other] = await ethers.getSigners();

    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    oracle = await PriceOracle.deploy();
    await oracle.waitForDeployment();

    await oracle.setTrustedReporter(reporter.address, true);
  });

  it("accepts trusted reporter and returns gaps", async function () {
    const key = ethers.id("ipl-india-vs-aus");

    await oracle.connect(reporter).reportPrice(key, owner.address, 6500, 3500);
    await oracle.connect(reporter).reportPrice(key, other.address, 7200, 2800);

    const gap = await oracle.getArbitrageGap(key, owner.address, other.address);
    expect(gap.yesGap).to.equal(700);
    expect(gap.noGap).to.equal(-700);
  });

  it("rejects unauthorized reporter", async function () {
    const key = ethers.id("unauthorized-market");

    await expect(oracle.connect(other).reportPrice(key, owner.address, 6500, 3500)).to.be.revertedWith(
      "PriceOracle: unauthorized reporter"
    );
  });

  it("rejects stale reads", async function () {
    const key = ethers.id("stale-check");
    await oracle.setStaleWindow(1);

    await oracle.connect(reporter).reportPrice(key, owner.address, 6400, 3600);
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    await expect(oracle.getFreshPrice(key, owner.address)).to.be.revertedWith("PriceOracle: stale price");
  });
});
