pragma solidity ^0.4.23;


// @title iNovaStaking
// @dev The interface for cross-contract calls to the Nova Staking contract
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract iNovaStaking {

  function balanceOf(address _owner) public view returns (uint256);
}