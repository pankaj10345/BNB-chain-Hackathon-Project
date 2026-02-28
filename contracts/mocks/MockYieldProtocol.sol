// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IYieldProtocol.sol";

contract MockYieldProtocol is IYieldProtocol {
    IERC20 public immutable asset;
    uint256 public totalManaged;

    constructor(address assetAddress) {
        asset = IERC20(assetAddress);
    }

    function deposit(uint256 amount) external {
        asset.transferFrom(msg.sender, address(this), amount);
        totalManaged += amount;
    }

    function withdraw(uint256 amount) external {
        require(totalManaged >= amount, "MockYieldProtocol: insufficient managed");
        totalManaged -= amount;
        asset.transfer(msg.sender, amount);
    }
}
