var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const web3 = global.web3;
const BN = require("bignumber.js");
const util = require("./utils.js");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const startingBalance = 10 ** 40;

const tokenCreationCost = 10 ** 21;
const gameFunding = 10 ** 30;
const blankMetadata = [];

let gameId;
let metadata = [];
let nvtPrices = [];
let cards = [];
const numberOfCards = 10;
const set1 = 1;
const set2 = 2;
const set3 = 3;
const onSaleDate = 987654;
const saleEndDate = 2 ** 128;
const setName = "This is a Set";
const shouldCopyCardData = false;
const gameJson = `{"name":"game name","uri":"https://com","logo":"https://logo","description":"description here"}`;

contract('ManagementTests', function (accounts) {

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
    await novaGame.addAdminAccount(gameId, user5, { from: user4 });
  });


  describe("account management tests:", function () {

    it("can't set owner as owner", async function () {
      await util.expectThrow(novaStaking.setOwner(user8, { from: owner }));
    });

    it("can set recovery", async function () {
      await novaStaking.setRecovery(user8, { from: owner });
      let recovery = await novaStaking.recoveryAddress.call();
      assert.equal(user8, recovery.valueOf(), "recovery should be set");
    });

    it("can set owner from recovery", async function () {
      await novaStaking.setOwner(user9, { from: user8 });
      let ownerAdd = await novaStaking.owner.call();
      assert.equal(user9, ownerAdd.valueOf(), "owner should be set");
    });
  });
})

