pragma solidity ^0.4.23;


// @title iNovaGame
// @dev The interface for cross-contract calls to the Nova Game contract
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract iNovaGame {
  function isAdminForGame(uint _game, address account) external view returns(bool);

  // List of all games tracked by the Nova Game contract
  uint[] public games;
}