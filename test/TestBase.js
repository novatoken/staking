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

contract.skip('', function (accounts) {

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
    gameId = await novaGame.numberOfGames.call() - 1;
  });

  describe.skip("", function () {


    it("", async function () {
      assert.fail();
    });
  });
})

