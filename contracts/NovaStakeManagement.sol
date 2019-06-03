pragma solidity ^0.4.23;

import "./NovaStakingBase.sol";


// @title Nova Stake Management
// @dev NovaStakeManagement contract for managing stakes and game balances
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract NovaStakeManagement is NovaStakingBase {

  // Emitted whenever a user or game takes a payout from the system
  event Payout(address indexed staker, uint amount, uint endWeek);

  // Emitted whenever a user's stake is increased or decreased.
  event ChangeStake(
    uint week, uint indexed game, address indexed staker, uint prevStake, uint newStake,
    uint accountStake, uint gameStake, uint totalStake
  );

  // @dev Tracks current stake levels for all accounts and games.
  //   Tracks separately for accounts by game, accounts, games, and the total stake on the system
  // Mapping(Game => Mapping(Account => Stake))
  mapping(uint => mapping(address => uint)) public gameAccountStaked;
  // Mapping(Account => Stake)
  mapping(address => uint) public accountStaked;
  // Mapping(Game => Stake)
  mapping(uint => uint) public gameStaked;
  // Stake
  uint public totalStaked;

  // @dev Tracks stakes by week for accounts and games. Each is updated when a user changes their stake.
  //   These can be zero if they haven't been updated during the current week, so "zero"
  //     just means "look at the week before", as no stakes have been changed.
  //   When setting a stake to zero, the system records a "1". This is safe, because it's stored
  //     with 18 significant digits, and the calculation
  // Mapping(Week => Mapping(Game => Mapping(Account => Stake)))
  mapping(uint => mapping(uint => mapping(address => uint))) public weekGameAccountStakes;
  // Mapping(Week => Mapping(Account => Stake))
  mapping(uint => mapping(address => uint)) public weekAccountStakes;
  // Mapping(Week => Mapping(Game => Stake))
  mapping(uint => mapping(uint => uint)) public weekGameStakes;
  // Mapping(Week => Stake)
  mapping(uint => uint) public weekTotalStakes;

  // The last week that an account took a payout. Used for calculating the remaining payout for the account
  mapping(address => uint) public lastPayoutWeekByAccount;
  // The last week that a game took a payout. Used for calculating the remaining payout for the game
  mapping(uint => uint) public lastPayoutWeekByGame;

  // Tracks the amount of income the system has taken in.
  // All income is paid out to games (50%) and stakers (50%)
  mapping(uint => uint) public weeklyIncome;

  constructor()
    public
  {
    weekTotalStakes[_getCurrentWeek() - 1] = 1;
  }


  // @dev Sets the sender's stake on a game to an amount.
  // @param _game - the game to increase or decrease the sender's stake on
  // @param _newStake - The new stake value. Can be an increase or decrease,
  //   but must be different than their current stake, and lower than their staking balance.
  function setStake(uint _game, uint _newStake)
    public
  {
    uint currentStake = gameAccountStaked[_game][msg.sender];
    if (currentStake < _newStake) {
      increaseStake(_game, _newStake - currentStake);
    } else
    if (currentStake > _newStake) {
      decreaseStake(_game, currentStake - _newStake);

    }
  }

  // @dev Increases the sender's stake on a game by an amount.
  // @param _game - the game to increase the sender's stake on
  // @param _increase - The increase must be non-zero, and less than
  //   or equal to the user's available staking balance
  function increaseStake(uint _game, uint _increase)
    public
  returns(uint newStake) {
    require(_increase > 0, "Must be a non-zero change");
    // Take the payment
    uint newBalance = balances[msg.sender].sub(_increase);
    balances[msg.sender] = newBalance;
    emit Balance(msg.sender, newBalance);

    uint prevStake = gameAccountStaked[_game][msg.sender];
    newStake = prevStake.add(_increase);
    uint gameStake = gameStaked[_game].add(_increase);
    uint accountStake = accountStaked[msg.sender].add(_increase);
    uint totalStake = totalStaked.add(_increase);

    _storeStakes(_game, msg.sender, prevStake, newStake, gameStake, accountStake, totalStake);
  }

  // @dev Decreases the sender's stake on a game by an amount.
  // @param _game - the game to decrease the sender's stake on
  // @param _decrease - The decrease must be non-zero, and less than or equal to the user's stake on the game
  function decreaseStake(uint _game, uint _decrease)
    public
  returns(uint newStake) {
    require(_decrease > 0, "Must be a non-zero change");
    uint newBalance = balances[msg.sender].add(_decrease);
    balances[msg.sender] = newBalance;
    emit Balance(msg.sender, newBalance);

    uint prevStake = gameAccountStaked[_game][msg.sender];
    newStake = prevStake.sub(_decrease);
    uint gameStake = gameStaked[_game].sub(_decrease);
    uint accountStake = accountStaked[msg.sender].sub(_decrease);
    uint totalStake = totalStaked.sub(_decrease);

    _storeStakes(_game, msg.sender, prevStake, newStake, gameStake, accountStake, totalStake);
  }

  // @dev Lets a  staker collect the current payout for all their stakes.
  // @param _numberOfWeeks - the number of weeks to collect. Set to 0 to collect all weeks.
  // @returns _payout - the total payout over all the collected weeks
  function collectPayout(uint _numberOfWeeks)
    public
  returns(uint _payout) {
    uint startWeek = lastPayoutWeekByAccount[msg.sender];
    require(startWeek > 0, "must be a valid start week");
    uint endWeek = _getEndWeek(startWeek, _numberOfWeeks);
    require(startWeek < endWeek, "must be at least one week to pay out");

    uint lastWeekStake;
    for (uint i = startWeek; i < endWeek; i++) {
      // Get the stake for the week. Use the last week's stake if the stake hasn't changed
      uint weeklyStake = weekAccountStakes[i][msg.sender] == 0
        ? lastWeekStake
        : weekAccountStakes[i][msg.sender];
      lastWeekStake = weeklyStake;

      uint weekStake = _getWeekTotalStake(i);
      uint storedNVT = storedNVTbyWeek[i];
      uint weeklyPayout = storedNVT > 1 && weeklyStake > 1 && weekStake > 1
        ? weeklyStake.mul(storedNVT) / weekStake / 2
        : 0;
      _payout = _payout.add(weeklyPayout);

    }
    // If the weekly stake for the end week is not set, set it to the
    //   last week's stake, to ensure we know what to pay out.
    // This works even if the end week is the current week; the value
    //   will be overwritten if necessary by future stake changes
    if(weekAccountStakes[endWeek][msg.sender] == 0) {
      weekAccountStakes[endWeek][msg.sender] = lastWeekStake;
    }
    // Always update the last payout week
    lastPayoutWeekByAccount[msg.sender] = endWeek;

    _transfer(address(this), msg.sender, _payout);
    emit Payout(msg.sender, _payout, endWeek);
  }

  // @dev Lets a game admin collect the current payout for their game.
  // @param _game - the game to collect
  // @param _numberOfWeeks - the number of weeks to collect. Set to 0 to collect all weeks.
  // @returns _payout - the total payout over all the collected weeks
  function collectGamePayout(uint _game, uint _numberOfWeeks)
    external
    onlyGameAdmin(_game)
  returns(uint _payout) {
    uint week = lastPayoutWeekByGame[_game];
    require(week > 0, "must be a valid start week");
    uint endWeek = _getEndWeek(week, _numberOfWeeks);
    require(week < endWeek, "must be at least one week to pay out");

    uint lastWeekStake;
    for (week; week < endWeek; week++) {
      // Get the stake for the week. Use the last week's stake if the stake hasn't changed
      uint weeklyStake = weekGameStakes[week][_game] == 0
        ? lastWeekStake
        : weekGameStakes[week][_game];
      lastWeekStake = weeklyStake;

      uint weekStake = _getWeekTotalStake(week);
      uint storedNVT = storedNVTbyWeek[week];
      uint weeklyPayout = storedNVT > 1 && weeklyStake > 1 && weekStake > 1
        ? weeklyStake.mul(storedNVT) / weekStake / 2
        : 0;
      _payout = _payout.add(weeklyPayout);
    }
    // If the weekly stake for the end week is not set, set it to
    //   the last week's stake, to ensure we know what to pay out
    //   This works even if the end week is the current week; the value
    //   will be overwritten if necessary by future stake changes
    if(weekGameStakes[endWeek][_game] == 0) {
      weekGameStakes[endWeek][_game] = lastWeekStake;
    }
    // Always update the last payout week
    lastPayoutWeekByGame[_game] = endWeek;

    _transfer(address(this), address(_game), _payout);
    emit Payout(address(_game), _payout, endWeek);
  }

  // @dev Internal function to calculate the game, account, and total stakes on a stake change
  // @param _game - the game to be staked on
  // @param _staker - the account doing the staking
  // @param _prevStake - the previous stake of the staker on that game
  // @param _newStake - the newly updated stake of the staker on that game
  // @param _gameStake - the new total stake for the game
  // @param _accountStake - the new total stake for the staker's account
  // @param _totalStake - the new total stake for the system as a whole
  function _storeStakes(
    uint _game, address _staker, uint _prevStake, uint _newStake,
    uint _gameStake, uint _accountStake, uint _totalStake)
    internal
  {
    uint _currentWeek = _getCurrentWeek();

    gameAccountStaked[_game][msg.sender] = _newStake;
    gameStaked[_game] = _gameStake;
    accountStaked[msg.sender] = _accountStake;
    totalStaked = _totalStake;

    // Each of these stores the weekly stake as "1" if it's been set to 0.
    // This tracks the difference between "not set this week" and "set to zero this week"
    weekGameAccountStakes[_currentWeek][_game][_staker] = _newStake > 0 ? _newStake : 1;
    weekAccountStakes[_currentWeek][_staker] = _accountStake > 0 ? _accountStake : 1;
    weekGameStakes[_currentWeek][_game] = _gameStake > 0 ? _gameStake : 1;
    weekTotalStakes[_currentWeek] = _totalStake > 0 ? _totalStake : 1;

    // Get the last payout week; set it to this week if there hasn't been a week.
    // This lets the user iterate payouts correctly.
    if(lastPayoutWeekByAccount[_staker] == 0) {
      lastPayoutWeekByAccount[_staker] = _currentWeek - 1;
      if (lastPayoutWeekByGame[_game] == 0) {
        lastPayoutWeekByGame[_game] = _currentWeek - 1;
      }
    }

    emit ChangeStake(
      _currentWeek, _game, _staker, _prevStake, _newStake,
      _accountStake, _gameStake, _totalStake);
  }

  // @dev Internal function to get the total stake for a given week
  // @notice This updates the stored values for intervening weeks,
  //   as that's more efficient at 100 or more users
  // @param _week - the week in which to calculate the total stake
  // @returns _stake - the total stake in that week
  function _getWeekTotalStake(uint _week)
    internal
  returns(uint _stake) {
    _stake = weekTotalStakes[_week];
    if(_stake == 0) {
      uint backWeek = _week;
      while(_stake == 0) {
        backWeek--;
        _stake = weekTotalStakes[backWeek];
      }
      weekTotalStakes[_week] = _stake;
    }
  }

  // @dev Internal function to get the end week based on start, number of weeks, and current week
  // @param _startWeek - the start of the range
  // @param _numberOfWeeks - the length of the range
  // @returns endWeek - either the current week, or the end of the range
  // @notice This throws if it tries to get a week range longer than the current week
  function _getEndWeek(uint _startWeek, uint _numberOfWeeks)
    internal
    view
  returns(uint endWeek) {
    uint _currentWeek = _getCurrentWeek();
    require(_startWeek < _currentWeek, "must get at least one week");
    endWeek = _numberOfWeeks == 0 ? _currentWeek : _startWeek + _numberOfWeeks;
    require(endWeek <= _currentWeek, "can't get more than the current week");
  }
}