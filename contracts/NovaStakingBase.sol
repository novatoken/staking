pragma solidity ^0.4.23;

import "./SafeMath.sol";
import "./interfaces/iNovaStaking.sol";
import "./interfaces/iNovaGame.sol";
import "./NovaMasterAccess.sol";


// @title ERC20 Staking manager imlpementation
// @dev Utility contract that manages staking Nova Tokens on games
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract NovaStakingBase is NovaMasterAccess, iNovaStaking {
  using SafeMath for uint256;

  uint public constant WEEK_ZERO_START = 1538352000; // 10/1/2018 @ 00:00:00
  uint public constant SECONDS_PER_WEEK = 604800;

  // The Nova Token balances of all games and users on the system
  mapping(address => uint) public balances;
  
  // The number of Nova Tokens stored as income each week
  mapping(uint => uint) public storedNVTbyWeek;

  // @dev Access control modifier to limit access to game admin accounts
  modifier onlyGameAdmin(uint _game) {
    require(gameContract.isAdminForGame(_game, msg.sender));
    _;
  }

  // @dev Used on deployment to link the Staking and Game contracts.
  // @param _gameContract - the address of a valid GameContract instance
  function linkContracts(address _gameContract)
    external
    onlyOwner
  {
    gameContract = iNovaGame(_gameContract);
  }

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Balance(address account, uint256 value);
  event StoredNVT(uint week, uint stored);

  // @dev Gets the balance of the specified address.
  // @param _owner The address to query the the balance of.
  // @returns An uint256 representing the amount owned by the passed address.
  function balanceOf(address _owner) 
    public
    view
  returns (uint256) {
    return balances[_owner];
  }

  // Internal transfer of ERC20 tokens to complete payment of an auction.
  // @param _from The address which you want to send tokens from
  // @param _to The address which you want to transfer to
  // @param _value The amout of tokens to be transferred
  function _transfer(address _from, address _to, uint _value) 
    internal
  {
    require(_from != _to, "can't transfer to yourself");
    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(_from, _to, _value);
    emit Balance(_from, balances[_from]);
    emit Balance(_to, balances[_to]);
  }

  // @dev Gets the current week, as calculated by this smart contract
  // @returns uint - the current week
  function getCurrentWeek()
    external
    view
  returns(uint) {
    return _getCurrentWeek();
  }

  // @dev Internal function to calculate the current week
  // @returns uint - the current week
  function _getCurrentWeek()
    internal
    view
  returns(uint) {
    return (now - WEEK_ZERO_START) / SECONDS_PER_WEEK;
  }
}