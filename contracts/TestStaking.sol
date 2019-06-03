pragma solidity ^0.4.23;

import "./NovaStaking.sol";
import "./interfaces/iERC20.sol";


// @title TestStaking
// @dev Test wrapper for the NovaToken ERC20 contract
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract TestStaking is NovaStaking {

  constructor(iERC20 _nvtContract)
    public
    NovaStaking(_nvtContract)
  {
    // No Action
  }

  // This is ludicrously insecure (duh). Don't deploy this contract to a live net.
  function setNVTbalance(address _account, uint _balance) 
    external
  {
    balances[_account] = _balance;
  }

  // This is ludicrously insecure (duh). Don't deploy this contract to a live net.
  function setWeekGameStake(uint _week, uint _game, uint _stake) 
    external
  {
    weekGameStakes[_week][_game] = _stake;
  }
}