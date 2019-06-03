pragma solidity ^0.4.23;

import "./NovaGameAccess.sol";


// @title Nova Game (Nova Token Game Data)
// @dev NovaGame contract for managing all game data
// @author Nova Token Platform (https://www.novatoken.io)
// (c) 2019 Nova Token Platform. All Rights Reserved. This code is not open source.
contract NovaGame is NovaGameAccess {

  struct GameData {
    string json;
    uint tradeLockSeconds;
    bytes32[] metadata;
  }

  event GameCreated(uint indexed game, address indexed owner, string json, bytes32[] metadata);

  event GameMetadataUpdated(
    uint indexed game,
    string json,
    uint tradeLockSeconds,
    bytes32[] metadata
  );

  mapping(uint => GameData) internal gameData;

  constructor(address _stakingContract)
    public
    NovaGameAccess(_stakingContract)
  {
    games.push(2**32);
  }

  // @dev Create a new game by setting its data.
  //   Created games are initially owned and managed by the game's creator
  // @notice - there's a maximum of 2^32 games (4.29 billion games)
  // @param _json - a json encoded string containing the game's name, uri, logo, description, etc
  // @param _tradeLockSeconds - the number of seconds a card remains locked to a purchaser's account
  // @param _metadata - game-specific metadata, in bytes32 format.
  function createGame(string _json, uint _tradeLockSeconds, bytes32[] _metadata)
    external
  returns(uint _game) {
    // Create the game
    _game = games.length;
    require(_game < games[0], "too many games created");
    games.push(_game);

    // Log the game as created
    emit GameCreated(_game, msg.sender, _json, _metadata);

    // Add the creator as the first game admin
    _addAdminAccount(_game, msg.sender);

    // Store the game's metadata
    updateGameMetadata(_game, _json, _tradeLockSeconds, _metadata);
  }

  // @dev Gets the number of games in the system
  // @returns the number of games stored in the system
  function numberOfGames()
    external
    view
  returns(uint) {
    return games.length;
  }

  // @dev Get all game data for one given game
  // @param _game - the # of the game
  // @returns game - the game ID of the requested game
  // @returns json - the json data of the game
  // @returns tradeLockSeconds - the number of card sets
  // @returns balance - the Nova Token balance
  // @returns metadata - a bytes32 array of metadata used by the game
  function getGameData(uint _game)
    external
    view
  returns(uint game,
    string json,
    uint tradeLockSeconds,
    uint256 balance,
    bytes32[] metadata)
  {
    GameData storage data = gameData[_game];
    game = _game;
    json = data.json;
    tradeLockSeconds = data.tradeLockSeconds;
    balance = stakingContract.balanceOf(address(_game));
    metadata = data.metadata;
  }

  // @dev Update the json, trade lock, and metadata for a single game
  // @param _game - the # of the game
  // @param _json - a json encoded string containing the game's name, uri, logo, description, etc
  // @param _tradeLockSeconds - the number of seconds a card remains locked to a purchaser's account
  // @param _metadata - game-specific metadata, in bytes32 format.
  function updateGameMetadata(uint _game, string _json, uint _tradeLockSeconds, bytes32[] _metadata)
    public
    onlyGameAdmin(_game)
  {
    gameData[_game].tradeLockSeconds = _tradeLockSeconds;
    gameData[_game].json = _json;

    bytes32[] storage data = gameData[_game].metadata;
    if (_metadata.length > data.length) {data.length = _metadata.length;}
    for (uint k = 0; k < _metadata.length; k++) {data[k] = _metadata[k];}
    for (k; k < data.length; k++) {delete data[k];}
    if (_metadata.length < data.length) {data.length = _metadata.length;}

    emit GameMetadataUpdated(_game, _json, _tradeLockSeconds, _metadata);
  }
}