// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPredictionMarket {
    function buyYes(uint256 marketId, uint256 amount) external returns (uint256 shares);
    function buyNo(uint256 marketId, uint256 amount) external returns (uint256 shares);
    function getYesPrice(uint256 marketId) external view returns (uint256);
    function getNoPrice(uint256 marketId) external view returns (uint256);
}
