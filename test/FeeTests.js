var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const web3 = global.web3;
const BN = require("bignumber.js");
const util = require("./utils.js");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const startingBalance = new BN(10 ** 33);
const gameJson = `{"name":"game name","uri":"https://com","logo":"https://logo","description":"description here"}`;

const tokenCreationCost = new BN(10 ** 21);
const cardFee = new BN(tokenCreationCost);
const gameFunding = new BN(10 ** 30);
const blankMetadata = [];
const decimalMultiplier = 10 ** 18;

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
let tokenId;

contract('Fees:', function (accounts) {

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
    await novaGame.updateGameMetadata(gameId, gameJson, 0, blankMetadata, { from: user4 });

    // Start with the previous week
    firstWeek = (await novaStaking.getCurrentWeek.call()).valueOf() - 1;
    startWeek = firstWeek;
    const setJson = `{"name:":"Set Part 2","description":"This is set 2"}`;
  });

  let firstWeek;
  let startWeek;
  let currentWeek;
  // Weekly stake amounts
  let weeklyStakesForUser1 = [];
  let weeklyStakesForUser2 = [];
  let weeklyStakesForGame1 = [];
  let weeklyTotalStakes = [];
  // Current stake amounts
  let totalStaked, totalStakedForGame, totalStakedUser1, totalStakedUser2;
  // NVT stored for the week
  let storedNVTbyWeek = [];
  // NVT balances
  let masterContractBalance, erc20contractBalance, user1balance, user2balance, game1balance;

  let logStakeData = false;

  const getStakeData = async function () {
    currentWeek = await novaStaking.getCurrentWeek.call();
    for (let i = startWeek; i < currentWeek; i++) {
      weeklyStakesForUser1[i] = await novaStaking.weekAccountStakes.call(i, user1);
      weeklyStakesForUser2[i] = await novaStaking.weekAccountStakes.call(i, user2);
      weeklyStakesForGame1[i] = await novaStaking.weekGameStakes.call(i, gameId);
      weeklyTotalStakes[i] = await novaStaking.weekTotalStakes.call(i);
      storedNVTbyWeek[i] = await novaStaking.storedNVTbyWeek.call(i);
      if (logStakeData) {
        console.log(`Week_${i} WeeklyStakes: 
        StoredNVT:${storedNVTbyWeek[i]}, 
        Game:${weeklyStakesForGame1[i]}, 
        User1:${weeklyStakesForUser1[i]}, User2:${weeklyStakesForUser2[i]}`);
      }
      startWeek = i + 1;
    }
    storedNVTbyWeek[currentWeek] = await novaStaking.storedNVTbyWeek.call(currentWeek);
    
    totalStaked = await novaStaking.totalStaked.call();
    totalStakedForGame = await novaStaking.gameStaked.call(gameId);
    totalStakedUser1 = await novaStaking.accountStaked.call(user1);
    totalStakedUser2 = await novaStaking.accountStaked.call(user2);

    erc20contractBalance = await novaStaking.balances.call(novaStaking.address);
    user1balance = await novaStaking.balances.call(user1);
    user2balance = await novaStaking.balances.call(user2);
    game1balance = await novaStaking.balances.call(gameId);

    if (logStakeData) {
      console.log(`Week_${currentWeek} StoredNVT:${storedNVTbyWeek[currentWeek]}`);
      console.log(`Week_${currentWeek} Staked: 
        Total:${totalStaked}, 
        Game:${totalStakedForGame}, 
        User1:${totalStakedUser1}, User2:${totalStakedUser2}`);
      console.log(`Week_${currentWeek} Balances:
        ERC20:${erc20contractBalance}, 
        Game:${game1balance}, 
        User1:${user1balance}, User2:${user2balance}`);
    }
  }

  const compareWeeklyStakes = async function (week, totalStake, gameStake, user1stake, user2stake) {
    const totalTest = new BN(await novaStaking.weekTotalStakes.call(week)).valueOf();
    const gameTest = new BN(await novaStaking.weekGameStakes.call(week, gameId)).valueOf();
    const user1test = new BN(await novaStaking.weekAccountStakes.call(week, user1)).valueOf();
    const user2test = new BN(await novaStaking.weekAccountStakes.call(week, user2)).valueOf();
    assert.equal(totalTest, new BN(totalStake).valueOf(), "total stakes should match");
    assert.equal(gameTest, new BN(gameStake).valueOf(), "game stakes should match");
    assert.equal(user1test, new BN(user1stake).valueOf(), "user1 stakes should match");
    assert.equal(user2test, new BN(user2stake).valueOf(), "user2 stakes should match");
  }

  const compareNVT = async function (week, stored, gameToken) {
    const storedActual = new BN(await novaStaking.storedNVTbyWeek.call(week)).valueOf();
    assert.equal(storedActual, new BN(stored).valueOf(), "stored NVT should match");
  }

  const compareCurrentStakes = async function (totalStake, gameStake, user1stake, user2stake) {
    const totalTest = new BN(await novaStaking.totalStaked.call()).valueOf();
    const gameTest = new BN(await novaStaking.gameStaked.call(gameId)).valueOf();
    const user1test = new BN(await novaStaking.accountStaked.call(user1)).valueOf();
    const user2test = new BN(await novaStaking.accountStaked.call(user2)).valueOf();
    assert.equal(totalTest, new BN(totalStake).valueOf(), "total stakes should match");
    assert.equal(gameTest, new BN(gameStake).valueOf(), "game stakes should match");
    assert.equal(user1test, new BN(user1stake).valueOf(), "user1 stakes should match");
    assert.equal(user2test, new BN(user2stake).valueOf(), "user2 stakes should match");
  }

  const compareGameBalances = async function (gameBal) {
    const gameTest = new BN(await novaStaking.balances.call(gameId)).valueOf();
    assert.equal(gameTest, new BN(gameBal).valueOf(), "game balances should match");
  }

  const compareUserBalances = async function (user1bal, user2bal) {
    const user1test = new BN(await novaStaking.balances.call(user1)).valueOf();
    const user2test = new BN(await novaStaking.balances.call(user2)).valueOf();
    assert.equal(user1test, new BN(user1bal).valueOf(), "user1 balances should match");
    assert.equal(user2test, new BN(user2bal).valueOf(), "user2 balances should match");
  }

  describe("funds:", function () {
    before(async function () {
      await getStakeData();
    });

    describe("Adding funds:", function () {

      beforeEach(async function () {
        // Reset base data
        await getStakeData();
      });

      it("doesn't add to NVT pool", async function () {
        await novaStaking.addNVTtoGame(gameId, gameFunding, { from: user4 });

        await compareGameBalances(game1balance.add(gameFunding));
      });
    });

    describe("end", function () {
      it("final data output", async function () {
        await getStakeData();
      });
    });
  });
})

