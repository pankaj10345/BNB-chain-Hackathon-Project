// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract PriceOracle is Ownable, Pausable {
    struct MarketPrice {
        uint256 yesPrice; // basis points
        uint256 noPrice; // basis points
        uint256 timestamp;
        address reporter;
    }

    uint256 public staleWindow = 30;

    // marketKey => platform => price
    mapping(bytes32 => mapping(address => MarketPrice)) public prices;
    mapping(address => bool) public trustedReporters;

    event ReporterUpdated(address indexed reporter, bool trusted);
    event PriceUpdated(
        bytes32 indexed marketKey,
        address indexed platform,
        uint256 yesPrice,
        uint256 noPrice,
        address reporter,
        uint256 timestamp
    );
    event StaleWindowUpdated(uint256 staleWindow);

    function setTrustedReporter(address reporter, bool trusted) external onlyOwner {
        require(reporter != address(0), "PriceOracle: invalid reporter");
        trustedReporters[reporter] = trusted;
        emit ReporterUpdated(reporter, trusted);
    }

    function setStaleWindow(uint256 seconds_) external onlyOwner {
        require(seconds_ > 0 && seconds_ <= 300, "PriceOracle: invalid stale window");
        staleWindow = seconds_;
        emit StaleWindowUpdated(seconds_);
    }

    function reportPrice(bytes32 marketKey, address platform, uint256 yesPrice, uint256 noPrice)
        external
        whenNotPaused
    {
        require(trustedReporters[msg.sender], "PriceOracle: unauthorized reporter");
        require(platform != address(0), "PriceOracle: invalid platform");
        require(yesPrice <= 10_000 && noPrice <= 10_000, "PriceOracle: invalid side price");
        require(yesPrice + noPrice <= 10_200, "PriceOracle: sum exceeds 102%");

        MarketPrice memory p = MarketPrice({
            yesPrice: yesPrice,
            noPrice: noPrice,
            timestamp: block.timestamp,
            reporter: msg.sender
        });

        prices[marketKey][platform] = p;
        emit PriceUpdated(marketKey, platform, yesPrice, noPrice, msg.sender, block.timestamp);
    }

    function getArbitrageGap(bytes32 marketKey, address platformA, address platformB)
        external
        view
        returns (int256 yesGap, int256 noGap)
    {
        MarketPrice memory a = _getFreshPrice(marketKey, platformA);
        MarketPrice memory b = _getFreshPrice(marketKey, platformB);

        yesGap = int256(b.yesPrice) - int256(a.yesPrice);
        noGap = int256(b.noPrice) - int256(a.noPrice);
    }

    function getFreshPrice(bytes32 marketKey, address platform)
        external
        view
        returns (MarketPrice memory)
    {
        return _getFreshPrice(marketKey, platform);
    }

    function isFresh(bytes32 marketKey, address platform) external view returns (bool) {
        MarketPrice memory p = prices[marketKey][platform];
        return p.timestamp != 0 && (block.timestamp - p.timestamp) <= staleWindow;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _getFreshPrice(bytes32 marketKey, address platform) internal view returns (MarketPrice memory p) {
        p = prices[marketKey][platform];
        require(p.timestamp != 0, "PriceOracle: no price");
        require((block.timestamp - p.timestamp) <= staleWindow, "PriceOracle: stale price");
    }
}
