pragma solidity ^0.4.23;

import "./interfaces/iNovaGame.sol";
import "./interfaces/iERC20.sol";
import "./SafeMath.sol";


// @title NovaMasterAccess
// @dev NovaMasterAccess contract for controlling access to Nova Token contract functions
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract NovaMasterAccess {
  using SafeMath for uint256;

  event OwnershipTransferred(address previousOwner, address newOwner);
  event PromotedGame(uint game, bool isPromoted, string json);
  event SuppressedGame(uint game, bool isSuppressed);

  // Reference to the address of the Nova Token ERC20 contract
  iERC20 public nvtContract;

  // Reference to the address of the Nova Game contract
  iNovaGame public gameContract;

  // The Owner can perform all admin tasks.
  address public owner;

  // The Recovery account can change the Owner account.
  address public recoveryAddress;


  // @dev The original `owner` of the contract is the contract creator.
  constructor() 
    internal 
  {
    owner = msg.sender;
  }

  // @dev Access control modifier to limit access to the Owner account
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  // @dev Access control modifier to limit access to the Recovery account
  modifier onlyRecovery() {
    require(msg.sender == recoveryAddress);
    _;
  }

  // @dev Assigns a new address to act as the Owner.
  // @notice Can only be called by the recovery account
  // @param _newOwner The address of the new Owner
  function setOwner(address _newOwner) 
    external 
    onlyRecovery 
  {
    require(_newOwner != address(0));
    require(_newOwner != recoveryAddress);

    owner = _newOwner;
    emit OwnershipTransferred(owner, _newOwner);
  }

  // @dev Assigns a new address to act as the Recovery address.
  // @notice Can only be called by the Owner account
  // @param _newRecovery The address of the new Recovery account
  function setRecovery(address _newRecovery) 
    external 
    onlyOwner 
  {
    require(_newRecovery != address(0));
    require(_newRecovery != owner);

    recoveryAddress = _newRecovery;
  }

  // @dev Adds or removes a game from the list of promoted games
  // @param _game - the game to be promoted
  // @param _isPromoted - true for promoted, false for not
  // @param _json - A json string to be used to display promotional information
  function setPromotedGame(uint _game, bool _isPromoted, string _json)
    external
    onlyOwner
  {
    uint gameId = gameContract.games(_game);
    require(gameId == _game, "gameIds must match");
    emit PromotedGame(_game, _isPromoted, _isPromoted ? _json : "");
  }

  // @dev Adds or removes a game from the list of suppressed games.
  //   Suppressed games won't show up on the site, but can still be interacted with
  //   by users.
  // @param _game - the game to be promoted
  // @param _isSuppressed - true for suppressed, false for not
  function setSuppressedGame(uint _game, bool _isSuppressed)
    external
    onlyOwner
  {
    uint gameId = gameContract.games(_game);
    require(gameId == _game, "gameIds must match");
    emit SuppressedGame(_game, _isSuppressed);
  }
}
