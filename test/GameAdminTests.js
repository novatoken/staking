
var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const util = require("./utils.js");
const Web3 = require("web3");
const web3 = new Web3();
const BN = require("bignumber.js");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const startingBalance = new BN(10 ** 40);
const gameJson = `{"name":"game name","uri":"https://com","logo":"https://logo","description":"description here"}`;

const tokenCreationCost = 10 ** 21;
const gameFunding = 10 ** 30;
const blankMetadata = [];
const withdrawal = 10 ** 25;

contract('GameAdminTests', function (accounts) {

  let novaStaking;
  let nvtContract;
  let novaGame;

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

    // Create a game (can reuse the same game)
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    gameId = await novaGame.numberOfGames.call() - 1;
  });

  describe("Game Admin abilities:", function () {

    it("addAdminAccount", async function () {
      await novaGame.addAdminAccount(gameId, user8, { from: user4 });
      await util.expectThrow(novaGame.addAdminAccount(gameId, user9, { from: owner }));
      await util.expectThrow(novaGame.addAdminAccount(gameId, user9, { from: user9 }));
      await novaGame.addAdminAccount(gameId, user9, { from: user4 });
      const admins = await novaGame.getAdminsForGame.call(gameId);
      assert.equal(admins.length, 3, "should be 3 admins listed");
      assert.equal(admins[0], user4, "user4 is ops");
      assert.equal(admins[1], user8, "user8 is ops");
      assert.equal(admins[2], user9, "user9 is ops");
    });
    it("removeAdminAccount", async function () {
      await util.expectThrow(novaGame.removeAdminAccount(gameId, user4, { from: owner }), "owner can't remove");
      await util.expectThrow(novaGame.removeAdminAccount(gameId, user4, { from: user1 }), "user1 can't remove");
      await novaGame.removeAdminAccount(gameId, user4, { from: user9 });
      const admins = await novaGame.getAdminsForGame.call(gameId);
      assert.equal(admins.length, 2, "should be 2 admins listed");
      assert.equal(admins[1], user8, "user4 is ops");
      assert.equal(admins[0], user9, "user9 is ops");
      const gfa4 = await novaGame.getGamesForAdmin.call(user4);
      const gfa8 = await novaGame.getGamesForAdmin.call(user8);
      const gfa9 = await novaGame.getGamesForAdmin.call(user9);
      console.log(gfa4);
      console.log(gfa8);
      console.log(gfa9);
      assert.equal(gfa4.length, 0, "user 4 no longer an admin");
      assert.equal(gfa8[0].valueOf(), gameId, "user 8 an admin");
      assert.equal(gfa9[0].valueOf(), gameId, "user 9 an admin");
    });
    it("isGameAdmin and isGameAdmin", async function () {
      const ops4 = await novaGame.gameAdmins.call(gameId, user4);
      const ops8 = await novaGame.gameAdmins.call(gameId, user8);
      const ops9 = await novaGame.gameAdmins.call(gameId, user9);
      assert(!ops4, "4 isn't an admin");
      assert(ops8, "8 is an admin");
      assert(ops9, "9 is an admin");
    });
  });

  describe("Game Admin abilities:", function () {

    it("add funds to Admin Account", async function () {
      await novaStaking.setNVTbalance(owner, startingBalance);
      await novaStaking.setNVTbalance(user1, startingBalance);
      await novaStaking.setNVTbalance(user8, startingBalance);
      await novaStaking.setNVTbalance(user9, startingBalance);
    });

    it("addNVTtoGame", async function () {
      await util.expectThrow(
        novaStaking.addNVTtoGame(gameId, withdrawal, { from: owner }),
        "owner can't add funds"
      );
      await util.expectThrow(
        novaStaking.addNVTtoGame(gameId, withdrawal, { from: user1 }),
        "random joe can't add funds"
      );
      let startBalance = await novaStaking.balances.call(user9);
      let gameStartBalance = await novaStaking.balances.call(gameId);
      await novaStaking.addNVTtoGame(gameId, withdrawal, { from: user9 });
      let endBalance = await novaStaking.balances.call(user9);
      let gameEndBalance = await novaStaking.balances.call(gameId);
      assert.equal(endBalance.valueOf(), startBalance.sub(withdrawal).valueOf(), "admin balance should have gone up");
      assert.equal(gameEndBalance.valueOf(), gameStartBalance.add(withdrawal).valueOf(), "game balance reduced");
      await novaStaking.setNVTbalance(user9, withdrawal * 0.9);

      await util.expectThrow(
        novaStaking.addNVTtoGame(gameId, withdrawal, { from: user9 }),
        "can't add if you don't have enough funds"
      );
      await novaStaking.setNVTbalance(user9, withdrawal);
      await novaStaking.addNVTtoGame(gameId, withdrawal, { from: user9 });
      await novaStaking.setNVTbalance(user9, startBalance);
    });


    it("withdrawNVTfromGame", async function () {
      await novaStaking.setNVTbalance(gameId, withdrawal);
      await util.expectThrow(
        novaStaking.withdrawNVTfromGame(gameId, withdrawal, { from: owner }),
        "owner can't withdraw"
      );
      await util.expectThrow(
        novaStaking.withdrawNVTfromGame(gameId, withdrawal, { from: user1 }),
        "random joe can't withdraw"
      );
      await util.expectThrow(
        novaStaking.withdrawNVTfromGame(gameId, withdrawal * 1.1, { from: user9 }),
        "can't withdraw more than is available"
      );
      let startBalance = await novaStaking.balances.call(user9);
      let gameStartBalance = await novaStaking.balances.call(gameId);
      await novaStaking.withdrawNVTfromGame(gameId, withdrawal, { from: user9 });
      let endBalance = await novaStaking.balances.call(user9);
      let gameEndBalance = await novaStaking.balances.call(gameId);
      assert.equal(endBalance.valueOf(), startBalance.add(withdrawal).valueOf(), "admin balance should have gone up");
      assert.equal(gameEndBalance.valueOf(), gameStartBalance.sub(withdrawal).valueOf(), "game balance reduced");
    });
  });


  describe("Set and Get Game Data & Admin Info:", function () {

    const tradeLock = 123456;
    const metadata = [
      "one",
      "two",
      "three",
      "four"
    ];
    const setNumber = 1;

    it("confirm AdminAccount", async function () {
      const ops8 = await novaGame.gameAdmins.call(gameId, user8);
      assert(ops8, "8 is an admin");
    });

    it("updateGameMetadata", async function () {
      await util.expectThrow(novaGame.updateGameMetadata(gameId, gameJson, tradeLock, metadata, { from: owner }));
      await util.expectThrow(novaGame.updateGameMetadata(gameId, gameJson, tradeLock, metadata, { from: user4 }));
      await util.expectThrow(novaGame.updateGameMetadata(2, gameJson, tradeLock, metadata, { from: user8 }));
      await novaGame.updateGameMetadata(gameId, gameJson, tradeLock, metadata, { from: user8 });
    });

    it("getGameData", async function () {
      const result = await novaGame.getGameData.call(gameId);
      assert.equal(result[0].valueOf(), gameId, "Game Ids must match");
      assert.equal(result[1].valueOf(), gameJson, "game json");
      console.log(JSON.parse(result[1].valueOf()));
      assert.equal(result[2].valueOf(), tradeLock, "tradeLock must match");
      assert.equal(result[3].valueOf(), 0, "game has 0 balance");
      assert.equal(result[4].length, metadata.length, "metadata must match");
      for (let i = 0; i < result[5].length; i++) {
        assert.equal(web3.utils.toAscii(result[5][i]).slice(0, metadata[i].length), metadata[i], "metadata must match for point: " + i);
      }
    });

  });

})

