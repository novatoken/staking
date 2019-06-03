pragma solidity ^0.4.23;

import "./NovaStakeManagement.sol";
import "./interfaces/iERC20.sol";


// @title NovaToken ERC20 contract
// @dev ERC20 management contract, designed to make using ERC-20 tokens easier
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract NovaStaking is NovaStakeManagement {

  event Deposit(address account, uint256 amount, uint256 balance);
  event Withdrawal(address account, uint256 amount, uint256 balance);

  // @dev Constructor creates a reference to the NFT ownership contract
  //  and verifies the manager cut is in the valid range.
  // @param _nvtContract - address of the mainnet NovaToken contract
  constructor(iERC20 _nvtContract)
    public
  {
    nvtContract = _nvtContract;
  }

  // @dev Allows a user to deposit NVT through approveAndCall.
  // @notice Other methods of sending NVT to this contract will still work, but will result in you losing your NVT.
  // @param _sender is the original sender of the message
  // @param _amount is the amount of NVT that was approved
  // @param _contract is the contract that sent the approval; we check to be sure it's the NVT contract
  // @param _data is the data that is passed in along with the call. It's not used here
  function receiveApproval(address _sender, uint _amount, address _contract, bytes _data)
    public
  {
    require(_data.length == 0, "you must pass no data");
    require(_contract == address(nvtContract), "sending from a non-NVT contract is not allowed");

    // Track the transferred NVT
    uint newBalance = balances[_sender].add(_amount);
    balances[_sender] = newBalance;

    emit Balance(_sender, newBalance);
    emit Deposit(_sender, _amount, newBalance);

    // Transfer the NVT to this
    require(nvtContract.transferFrom(_sender, address(this), _amount), "must successfully transfer");
  }

  function receiveNVT(uint _amount, uint _week) 
    external
  {
    require(_week >= _getCurrentWeek(), "Current Week must be equal or greater");
    uint totalDonation = weeklyIncome[_week].add(_amount);
    weeklyIncome[_week] = totalDonation;

    uint stored = storedNVTbyWeek[_week].add(_amount);
    storedNVTbyWeek[_week] = stored;
    emit StoredNVT(_week, stored);
    // transfer the donation
    _transfer(msg.sender, address(this), _amount);
  }

  // @dev Allows a user to withdraw some or all of their NVT stored in this contract
  // @param _sender is the original sender of the message
  // @param _amount is the amount of NVT to be withdrawn. Withdraw(0) will withdraw all.
  // @returns true if successful, false if unsuccessful, but will most throw on most failures
  function withdraw(uint amount)
    external
  {
    uint withdrawalAmount = amount > 0 ? amount : balances[msg.sender];
    require(withdrawalAmount > 0, "Can't withdraw - zero balance");
    uint newBalance = balances[msg.sender].sub(withdrawalAmount);
    balances[msg.sender] = newBalance;
    emit Withdrawal(msg.sender, withdrawalAmount, newBalance);
    emit Balance(msg.sender, newBalance);
    nvtContract.transfer(msg.sender, withdrawalAmount);
  }

  // @dev Add more ERC-20 tokens to a game. Can be used to fund games with Nova Tokens for card creation
  // @param _game - the # of the game to add tokens to
  // @param _tokensToToAdd - the number of Nova Tokens to transfer from the calling account
  function addNVTtoGame(uint _game, uint _tokensToToAdd)
    external
    onlyGameAdmin(_game)
  {
    // Take the funding, and apply it to the GAME's address (a fake ETH address...)
    _transfer(msg.sender, address(_game), _tokensToToAdd);
  }

  // @dev Withdraw earned (or funded) Nova Tokens from a game.
  // @param _game - the # of the game to add tokens to
  // @param _tokensToWithdraw - the number of NVT to transfer from the game to the calling account
  function withdrawNVTfromGame(uint _game, uint _tokensToWithdraw)
    external
    onlyGameAdmin(_game)
  {
    // Take the NVT funds from the game, and apply them to the game admin's address
    _transfer(address(_game), msg.sender, _tokensToWithdraw);
  }
}