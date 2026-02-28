// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IYieldProtocol.sol";

contract YieldVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct YieldSource {
        address protocol;
        uint256 currentApyBps;
        uint256 allocatedAmount;
        bool active;
    }

    IERC20 public immutable asset;

    YieldSource[] public yieldSources;
    mapping(address => uint256) public userShares;

    uint256 public totalShares;
    uint256 public totalAssets;

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 sharesBurned);
    event YieldSourceAdded(uint256 indexed index, address indexed protocol, uint256 apyBps);
    event YieldSourceUpdated(uint256 indexed index, uint256 apyBps, bool active);
    event Rebalanced(uint256 indexed bestSourceIdx, uint256 bestApyBps, uint256 reallocatedAmount);
    event Allocated(uint256 indexed sourceIdx, uint256 amount);

    constructor(address assetAddress) {
        require(assetAddress != address(0), "YieldVault: invalid asset");
        asset = IERC20(assetAddress);
    }

    function addYieldSource(address protocol, uint256 apyBps, bool active) external onlyOwner {
        require(protocol != address(0), "YieldVault: invalid protocol");
        yieldSources.push(
            YieldSource({
                protocol: protocol,
                currentApyBps: apyBps,
                allocatedAmount: 0,
                active: active
            })
        );

        emit YieldSourceAdded(yieldSources.length - 1, protocol, apyBps);
    }

    function updateYieldSource(uint256 index, uint256 apyBps, bool active) external onlyOwner {
        require(index < yieldSources.length, "YieldVault: bad index");
        YieldSource storage source = yieldSources[index];
        source.currentApyBps = apyBps;
        source.active = active;

        emit YieldSourceUpdated(index, apyBps, active);
    }

    function allocateToSource(uint256 index, uint256 amount) external onlyOwner whenNotPaused {
        require(index < yieldSources.length, "YieldVault: bad index");
        require(yieldSources[index].active, "YieldVault: source inactive");
        require(asset.balanceOf(address(this)) >= amount, "YieldVault: insufficient idle funds");

        YieldSource storage source = yieldSources[index];
        _ensureAllowance(source.protocol, amount);
        source.allocatedAmount += amount;

        try IYieldProtocol(source.protocol).deposit(amount) {
            emit Allocated(index, amount);
        } catch {
            source.allocatedAmount -= amount;
            revert("YieldVault: protocol deposit failed");
        }
    }

    function rebalanceToOptimal() external onlyOwner whenNotPaused returns (uint256 bestIdx) {
        require(yieldSources.length > 0, "YieldVault: no sources");

        uint256 bestApy = 0;
        bool found;
        for (uint256 i = 0; i < yieldSources.length; i++) {
            YieldSource memory source = yieldSources[i];
            if (source.active && source.currentApyBps > bestApy) {
                bestApy = source.currentApyBps;
                bestIdx = i;
                found = true;
            }
        }
        require(found, "YieldVault: no active source");

        uint256 moved;
        for (uint256 i = 0; i < yieldSources.length; i++) {
            if (i == bestIdx) {
                continue;
            }

            YieldSource storage source = yieldSources[i];
            if (source.allocatedAmount == 0) {
                continue;
            }

            uint256 amount = source.allocatedAmount;
            source.allocatedAmount = 0;
            moved += amount;

            // Best effort to pull from protocol; ownership can still pause + recover if protocol fails.
            try IYieldProtocol(source.protocol).withdraw(amount) {} catch {}
        }

        if (moved > 0) {
            YieldSource storage best = yieldSources[bestIdx];
            _ensureAllowance(best.protocol, moved);
            best.allocatedAmount += moved;
            try IYieldProtocol(best.protocol).deposit(moved) {} catch {}
        }

        emit Rebalanced(bestIdx, bestApy, moved);
    }

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "YieldVault: amount is zero");

        uint256 shares = (totalShares == 0 || totalAssets == 0)
            ? amount
            : (amount * totalShares) / totalAssets;
        require(shares > 0, "YieldVault: zero shares");

        asset.safeTransferFrom(msg.sender, address(this), amount);
        userShares[msg.sender] += shares;
        totalShares += shares;
        totalAssets += amount;

        emit Deposited(msg.sender, amount, shares);
    }

    function withdraw(uint256 shares) external nonReentrant whenNotPaused {
        require(shares > 0, "YieldVault: shares is zero");
        require(userShares[msg.sender] >= shares, "YieldVault: insufficient shares");

        uint256 amount = (shares * totalAssets) / totalShares;
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= amount;

        asset.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, shares);
    }

    function syncTotalAssets(uint256 newTotalAssets) external onlyOwner {
        require(newTotalAssets >= totalAssets, "YieldVault: non-increasing sync");
        totalAssets = newTotalAssets;
    }

    function getYieldSourcesCount() external view returns (uint256) {
        return yieldSources.length;
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
