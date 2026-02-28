// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IPredictionMarket.sol";
import "./interfaces/IYieldProtocol.sol";

contract ArbExecutor is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public minProfitBps = 50; // 0.5%
    uint256 public totalProfitEarned;
    uint256 public totalTradesExecuted;

    IERC20 public immutable asset;

    mapping(address => bool) public approvedMarkets;
    mapping(address => uint256) public marketFeeBps;
    mapping(address => bool) public approvedYieldProtocols;

    event ArbExecuted(
        address indexed marketA,
        address indexed marketB,
        uint256 amountIn,
        uint256 profit,
        string strategy
    );
    event YieldRotated(address indexed from, address indexed to, uint256 amount);
    event MarketApprovalUpdated(address indexed market, bool approved);
    event YieldProtocolApprovalUpdated(address indexed protocol, bool approved);

    struct ArbOpportunity {
        address marketA;
        address marketB;
        uint256 marketIdA;
        uint256 marketIdB;
        uint256 amountIn;
        bool buyYesOnA;
        uint256 minProfit;
    }

    constructor(address assetAddress) {
        require(assetAddress != address(0), "ArbExecutor: invalid asset");
        asset = IERC20(assetAddress);
    }

    function setMinProfitBps(uint256 bps) external onlyOwner {
        require(bps <= 2_000, "ArbExecutor: bps too high");
        minProfitBps = bps;
    }

    function setApprovedMarket(address market, bool approved) external onlyOwner {
        approvedMarkets[market] = approved;
        emit MarketApprovalUpdated(market, approved);
    }

    function setMarketFeeBps(address market, uint256 feeBps) external onlyOwner {
        require(feeBps <= 1_000, "ArbExecutor: fee too high");
        marketFeeBps[market] = feeBps;
    }

    function setApprovedYieldProtocol(address protocol, bool approved) external onlyOwner {
        approvedYieldProtocols[protocol] = approved;
        emit YieldProtocolApprovalUpdated(protocol, approved);
    }

    function executeArbitrage(ArbOpportunity calldata opp)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
        returns (uint256 profit)
    {
        require(approvedMarkets[opp.marketA] && approvedMarkets[opp.marketB], "ArbExecutor: market not approved");
        require(opp.amountIn > 1, "ArbExecutor: amount too low");

        uint256 initialBalance = asset.balanceOf(address(this));
        require(initialBalance >= opp.amountIn, "ArbExecutor: insufficient balance");

        uint256 halfAmount = opp.amountIn / 2;
        uint256 secondAmount = opp.amountIn - halfAmount;

        _ensureAllowance(opp.marketA, halfAmount);
        _ensureAllowance(opp.marketB, secondAmount);

        if (opp.buyYesOnA) {
            IPredictionMarket(opp.marketA).buyYes(opp.marketIdA, halfAmount);
            IPredictionMarket(opp.marketB).buyNo(opp.marketIdB, secondAmount);
        } else {
            IPredictionMarket(opp.marketA).buyNo(opp.marketIdA, halfAmount);
            IPredictionMarket(opp.marketB).buyYes(opp.marketIdB, secondAmount);
        }

        uint256 finalBalance = asset.balanceOf(address(this));
        profit = finalBalance > initialBalance ? finalBalance - initialBalance : 0;

        uint256 bpsFloor = (opp.amountIn * minProfitBps) / 10_000;
        uint256 effectiveMinProfit = opp.minProfit > bpsFloor ? opp.minProfit : bpsFloor;
        require(profit >= effectiveMinProfit, "ArbExecutor: insufficient profit");

        totalProfitEarned += profit;
        totalTradesExecuted += 1;

        emit ArbExecuted(opp.marketA, opp.marketB, opp.amountIn, profit, "DELTA_NEUTRAL");
    }

    function rotateYield(address fromProtocol, address toProtocol, uint256 amount)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(approvedYieldProtocols[fromProtocol], "ArbExecutor: from not approved");
        require(approvedYieldProtocols[toProtocol], "ArbExecutor: to not approved");
        require(amount > 0, "ArbExecutor: amount is zero");

        IYieldProtocol(fromProtocol).withdraw(amount);
        _ensureAllowance(toProtocol, amount);
        IYieldProtocol(toProtocol).deposit(amount);

        emit YieldRotated(fromProtocol, toProtocol, amount);
    }

    function withdrawAsset(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ArbExecutor: invalid recipient");
        asset.safeTransfer(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _ensureAllowance(address spender, uint256 amount) internal {
        uint256 currentAllowance = asset.allowance(address(this), spender);
        if (currentAllowance >= amount) {
            return;
        }

        if (currentAllowance > 0) {
            asset.safeApprove(spender, 0);
        }
        asset.safeApprove(spender, type(uint256).max);
    }
}
