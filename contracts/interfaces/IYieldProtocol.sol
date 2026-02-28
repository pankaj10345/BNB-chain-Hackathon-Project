// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IYieldProtocol {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
}
