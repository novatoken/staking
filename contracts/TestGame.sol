pragma solidity ^0.4.23;

import "./NovaGame.sol";


// @title TestGame
// @dev Test wrapper for the NovaGame contract
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract TestGame is NovaGame {
  
  constructor(address _masterAddress)
    public
    NovaGame(_masterAddress)
  {
    // No action
  }
}