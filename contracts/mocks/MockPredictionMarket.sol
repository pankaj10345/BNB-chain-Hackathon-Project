// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IPredictionMarket.sol";

contract MockPredictionMarket is IPredictionMarket {
    IERC20 public immutable asset;
    uint256 public edgeBps;

    mapping(uint256 => uint256) public yesPrices;
    mapping(uint256 => uint256) public noPrices;

    constructor(address assetAddress, uint256 edgeBps_) {
        asset = IERC20(assetAddress);
        edgeBps = edgeBps_;
    }

    function setEdgeBps(uint256 bps) external {
        edgeBps = bps;
    }

    function setPrices(uint256 marketId, uint256 yesPrice, uint256 noPrice) external {
        yesPrices[marketId] = yesPrice;
        noPrices[marketId] = noPrice;
    }

    function seedLiquidity(uint256 amount) external {
        asset.transferFrom(msg.sender, address(this), amount);
    }

    function buyYes(uint256 marketId, uint256 amount) external returns (uint256 shares) {
        marketId;
        shares = _simulateTrade(amount);
    }

    function buyNo(uint256 marketId, uint256 amount) external returns (uint256 shares) {
        marketId;
        shares = _simulateTrade(amount);
    }

    function getYesPrice(uint256 marketId) external view returns (uint256) {
        return yesPrices[marketId];
    }

    function getNoPrice(uint256 marketId) external view returns (uint256) {
        return noPrices[marketId];
    }

    function _simulateTrade(uint256 amount) internal returns (uint256 shares) {
        asset.transferFrom(msg.sender, address(this), amount);

        uint256 payout = amount + ((amount * edgeBps) / 10_000);
        require(asset.balanceOf(address(this)) >= payout, "MockPredictionMarket: insufficient liquidity");

        asset.transfer(msg.sender, payout);
        shares = payout;
    }
}
