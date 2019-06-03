var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const BN = require("bignumber.js");
const util = require("./utils.js");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const startingBalance = 10 ** 40;
const gameJson = `{"name":"game name","uri":"https://com","logo":"https://logo","description":"description here"}`;

const tokenCreationCost = 10 ** 21;
const gameFunding = 10 ** 30;
const blankMetadata = [];

const metadata = ["one", "two", "three", "four"];
const cards = [0, 1, 2, 3];
const set1 = 1;
const set2 = 2;
const set3 = 3;

contract('Game Tests', function (accounts) {

  let novaStaking;
  let nvtContract;
  let novaGame;
  let gameId;

  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const user3 = accounts[3];
  const user4 = accounts[4];
  const user5 = accounts[5];
  const user6 = accounts[6];
  const user7 = accounts[7];
  const user8 = accounts[8];
  const user9 = accounts[9];

  //create new smart contract instance before each test method
  before(async function () {
    novaStaking = await NovaStaking.deployed();
    nvtContract = await TestNVT.deployed();
    novaGame = await NovaGame.deployed();

    for (let i = 0; i < 5; i++) {
      await novaStaking.setNVTbalance(accounts[i], startingBalance);
    }

    // Create two games (use the second one) (can reuse the same game)
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    gameId = await novaGame.numberOfGames.call() - 1;
    console.log(gameId);
  });

  describe("Admins", function () {
    it("Get Admins for Game", async function () {
      await novaGame.addAdminAccount(gameId, user8, { from: user4 });
      await novaGame.addAdminAccount(gameId, user9, { from: user4 });
      const admins = await novaGame.getAdminsForGame.call(gameId);
      assert.equal(admins.length, 3, "should be 3 admins listed");
      assert.equal(admins[0], user4, "user4 is ops");
      assert.equal(admins[1], user8, "user8 is ops");
      assert.equal(admins[2], user9, "user9 is ops");
    });

    it("Get Games for Admin", async function () {
      //await novaGame.addAdminAccount(gameId, user8, { from: user4 });
      await novaGame.addAdminAccount(gameId * 1 - 1, user8, { from: user4 });
      await novaGame.addAdminAccount(gameId * 1 - 2, user9, { from: user4 });
      console.log("admins added");
      const admins = await novaGame.getGamesForAdmin.call(user8);
      assert.equal(admins.length, 2, "should be 2 games listed");
      assert.equal(admins[0], gameId, "user8 is ops for g-0");
      assert.equal(admins[1], gameId * 1 - 1, "user8 is ops for g-1");
      console.log("user8 called")
      const adminsU9 = await novaGame.getGamesForAdmin.call(user9);
      assert.equal(adminsU9.length, 2, "should be 2 games listed for user9");
      assert.equal(adminsU9[0], gameId, "user9 is ops for g-2");
      assert.equal(adminsU9[1], gameId * 1 - 2, "user9 is ops for g-2");
    });
  });

  describe("Promotion", function () {
    const promo = "This is the promotion for the game. It's a good promotion, and you should like it";
    const unpromo = "";

    it("User can't promote", async function () {
      await util.expectThrow(novaStaking.setPromotedGame(gameId, true, promo, { from: user1 }));
    });

    it("Game Owner can't promote", async function () {
      await util.expectThrow(novaStaking.setPromotedGame(gameId, true, promo, { from: user4 }));
    });

    it("COO can promote", async function () {
      await novaStaking.setPromotedGame(gameId, true, promo, { from: owner });
      await novaStaking.setPromotedGame(gameId, true, promo, { from: owner });
      const ev = novaStaking.PromotedGame({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "PromotedGame", "log should be named correctly");
      assert.equal(log.args.game, gameId, "game matches");
      assert.equal(log.args.isPromoted, true, "isPromoted matches");
      assert.equal(log.args.json, promo, "json matches");
    });

    it("COO can't promote a nonexistent game", async function () {
      await util.expectThrow(novaStaking.setPromotedGame(1000, true, promo, { from: owner }));
    });

    it("User can't un-promote", async function () {
      await util.expectThrow(novaStaking.setPromotedGame(gameId, false, unpromo, { from: user1 }));
    });

    it("Game Admin can't un-promote", async function () {
      await util.expectThrow(novaStaking.setPromotedGame(gameId, false, unpromo, { from: user4 }));
    });

    it("COO can un-promote", async function () {
      await novaStaking.setPromotedGame(gameId, false, unpromo, { from: owner });
      await novaStaking.setPromotedGame(gameId, false, unpromo, { from: owner });
      const ev = novaStaking.PromotedGame({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "PromotedGame", "log should be named correctly");
      assert.equal(log.args.game, gameId, "game matches");
      assert.equal(log.args.isPromoted, false, "isPromoted matches");
      assert.equal(log.args.json, unpromo, "json matches");
    });

    it("COO can't un-promote a nonexistent game", async function () {
      await util.expectThrow(novaStaking.setPromotedGame(1000, false, unpromo, { from: owner }));
    });
  });

  describe("Suppression", function () {

    it("User can't suppress", async function () {
      await util.expectThrow(novaStaking.setSuppressedGame(gameId, true, { from: user1 }));
    });

    it("Game Owner can't suppress", async function () {
      await util.expectThrow(novaStaking.setSuppressedGame(gameId, true, { from: user4 }));
    });

    it("COO can suppress", async function () {
      await novaStaking.setSuppressedGame(gameId, true, { from: owner });
      await novaStaking.setSuppressedGame(gameId, true, { from: owner });
      const ev = novaStaking.SuppressedGame({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "SuppressedGame", "log should be named correctly");
      assert.equal(log.args.game, gameId, "game matches");
      assert.equal(log.args.isSuppressed, true, "isSuppressed matches");
    });

    it("COO can't suppress a nonexistent game", async function () {
      await util.expectThrow(novaStaking.setSuppressedGame(1000, true, { from: owner }));
    });

    it("User can't un-suppress", async function () {
      await util.expectThrow(novaStaking.setSuppressedGame(gameId, false, { from: user1 }));
    });

    it("Game Admin can't un-suppress", async function () {
      await util.expectThrow(novaStaking.setSuppressedGame(gameId, false, { from: user4 }));
    });

    it("COO can un-suppress", async function () {
      await novaStaking.setSuppressedGame(gameId, false, { from: owner });
      await novaStaking.setSuppressedGame(gameId, false, { from: owner });
      const ev = novaStaking.SuppressedGame({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "SuppressedGame", "log should be named correctly");
      assert.equal(log.args.game, gameId, "game matches");
      assert.equal(log.args.isSuppressed, false, "isSuppressed matches");
    });

    it("COO can't un-suppress a nonexistent game", async function () {
      await util.expectThrow(novaStaking.setSuppressedGame(1000, false, { from: owner }));
    });
  });
})

