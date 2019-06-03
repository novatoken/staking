pragma solidity ^0.4.23;

import "./interfaces/iNovaStaking.sol";
import "./interfaces/iNovaGame.sol";
import "./SafeMath.sol";


// @title Nova Game Access (Nova Token Game Access Control)
// @dev NovaGame contract for controlling access to games, and allowing managers to add and remove operator accounts
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract NovaGameAccess is iNovaGame {
  using SafeMath for uint256;

  event AdminPrivilegesChanged(uint indexed game, address indexed account, bool isAdmin);
  event OperatorPrivilegesChanged(uint indexed game, address indexed account, bool isAdmin);

  // Admin addresses are stored both by gameId and address
  mapping(uint => address[]) public adminAddressesByGameId;
  mapping(address => uint[]) public gameIdsByAdminAddress;

  // Stores admin status (as a boolean) by gameId and account
  mapping(uint => mapping(address => bool)) public gameAdmins;

  // Reference to the Nova Staking contract
  iNovaStaking public stakingContract;

  // @dev Access control modifier to limit access to game admin accounts
  modifier onlyGameAdmin(uint _game) {
    require(gameAdmins[_game][msg.sender]);
    _;
  }

  constructor(address _stakingContract)
    public
  {
    stakingContract = iNovaStaking(_stakingContract);
  }

  // @dev gets the admin status for a game & account
  // @param _game - the gameId of the game
  // @param _account - the address of the user
  // @returns bool - the admin status of the requested account for the requested game
  function isAdminForGame(uint _game, address _account)
    external
    view
  returns(bool) {
    return gameAdmins[_game][_account];
  }

  // @dev gets the list of admins for a game
  // @param _game - the gameId of the game
  // @returns address[] - the list of admin addresses for the requested game
  function getAdminsForGame(uint _game)
    external
    view
  returns(address[]) {
    return adminAddressesByGameId[_game];
  }

  // @dev gets the list of games that the requested account is the admin of
  // @param _account - the address of the user
  // @returns uint[] - the list of game Ids for the requested account
  function getGamesForAdmin(address _account)
    external
    view
  returns(uint[]) {
    return gameIdsByAdminAddress[_account];
  }

  // @dev Adds an address as an admin for a game
  // @notice Can only be called by an admin of the game
  // @param _game - the gameId of the game
  // @param _account - the address of the user
  function addAdminAccount(uint _game, address _account)
    external
    onlyGameAdmin(_game)
  {
    require(_account != msg.sender);
    require(_account != address(0));
    require(!gameAdmins[_game][_account]);
    _addAdminAccount(_game, _account);
  }

  // @dev Removes an address from an admin for a game
  // @notice Can only be called by an admin of the game.
  // @notice Can't remove your own account's admin privileges.
  // @param _game - the gameId of the game
  // @param _account - the address of the user to remove admin privileges.
  function removeAdminAccount(uint _game, address _account)
    external
    onlyGameAdmin(_game)
  {
    require(_account != msg.sender);
    require(gameAdmins[_game][_account]);
    
    address[] storage opsAddresses = adminAddressesByGameId[_game];
    uint startingLength = opsAddresses.length;
    // Yes, "i < startingLength" is right. 0 - 1 == uint.maxvalue, not -1.
    for (uint i = opsAddresses.length - 1; i < startingLength; i--) {
      if (opsAddresses[i] == _account) {
        uint newLength = opsAddresses.length.sub(1);
        opsAddresses[i] = opsAddresses[newLength];
        delete opsAddresses[newLength];
        opsAddresses.length = newLength;
      }
    }

    uint[] storage gamesByAdmin = gameIdsByAdminAddress[_account];
    startingLength = gamesByAdmin.length;
    for (i = gamesByAdmin.length - 1; i < startingLength; i--) {
      if (gamesByAdmin[i] == _game) {
        newLength = gamesByAdmin.length.sub(1);
        gamesByAdmin[i] = gamesByAdmin[newLength];
        delete gamesByAdmin[newLength];
        gamesByAdmin.length = newLength;
      }
    }

    gameAdmins[_game][_account] = false;
    emit AdminPrivilegesChanged(_game, _account, false);
  }

  // @dev Adds an address as an admin for a game
  // @notice Can only be called by an admin of the game
  // @notice Operator privileges are managed on the layer 2 network
  // @param _game - the gameId of the game
  // @param _account - the address of the user to
  // @param _isOperator - "true" to grant operator privileges, "false" to remove them
  function setOperatorPrivileges(uint _game, address _account, bool _isOperator)
    external
    onlyGameAdmin(_game)
  {
    emit OperatorPrivilegesChanged(_game, _account, _isOperator);
  }

  // @dev Internal function to add an address as an admin for a game
  // @param _game - the gameId of the game
  // @param _account - the address of the user
  function _addAdminAccount(uint _game, address _account)
    internal
  {
    address[] storage opsAddresses = adminAddressesByGameId[_game];
    require(opsAddresses.length < 256, "a game can only have 256 admins");
    for (uint i = opsAddresses.length; i < opsAddresses.length; i--) {
      require(opsAddresses[i] != _account);
    }

    uint[] storage gamesByAdmin = gameIdsByAdminAddress[_account];
    require(gamesByAdmin.length < 256, "you can only own 256 games");
    for (i = gamesByAdmin.length; i < gamesByAdmin.length; i--) {
      require(gamesByAdmin[i] != _game, "you can't become an operator twice");
    }
    gamesByAdmin.push(_game);

    opsAddresses.push(_account);
    gameAdmins[_game][_account] = true;
    emit AdminPrivilegesChanged(_game, _account, true);
  }
}