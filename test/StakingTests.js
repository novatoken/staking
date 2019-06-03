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
const gameFunding = new BN(10 ** 30);
const blankMetadata = [];
const decimalMultiplier = 10 ** 18;

let game1, game2;
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

contract('Staking Tests:', function (accounts) {

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
  let oldbalances = [];
  let currentbalances = [];
  let currentWeek;

  let oldGameBalance1, oldGameBalance2, currentGameBalance1, currentGameBalance2;

  //create new smart contract instance before each test method
  before(async function () {
    novaStaking = await NovaStaking.deployed();
    nvtContract = await TestNVT.deployed();
    novaGame = await NovaGame.deployed();

    for (let i = 0; i < 5; i++) {
      await novaStaking.setNVTbalance(accounts[i], startingBalance);
    }

    // Create two games (use the second one) (can reuse the same game)
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user7 });
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user7 });
    game2 = await novaGame.numberOfGames.call() - 1;
    game1 = game2 - 1;

    await novaGame.addAdminAccount(game1, user8, { from: user7 });
    await novaGame.addAdminAccount(game2, user8, { from: user7 });

    let gameBalance = await novaStaking.balanceOf(game1);
    assert.equal(gameBalance.valueOf(), 0, "GAME 1 should have ZERO balance");
    gameBalance = await novaStaking.balanceOf(game2);
    assert.equal(gameBalance.valueOf(), 0, "GAME 2 should have ZERO balance");

    currentWeek = await novaStaking.getCurrentWeek.call();
  });

  let accountGameStakes = [];
  let accountStakes = [];
  let gameStakes = [];
  let totalStakes = [];

  const getStakes = async function (_game, _account) {
    accountGameStakes.push(await novaStaking.gameAccountStaked.call(_game, _account, { from: user6 }));
    accountStakes.push(await novaStaking.accountStaked.call(_account, { from: user6 }));
    gameStakes.push(await novaStaking.gameStaked.call(_game, { from: user6 }));
    totalStakes.push(await novaStaking.totalStaked.call({ from: user6 }));
  }

  const confirmStakeChange = async function (_game, _account, _increase) {
    await getStakes(_game, _account);
    const last = accountGameStakes.length - 1;
    const prev = accountGameStakes.length - 2;
    assert.equal(accountGameStakes[prev].add(_increase).valueOf(),
      accountGameStakes[last].valueOf(),
      "account game equal");
    assert.equal(accountStakes[prev].add(_increase).valueOf(),
      accountStakes[last].valueOf(),
      "account equal");
    assert.equal(gameStakes[prev].add(_increase).valueOf(),
      gameStakes[last].valueOf(),
      "game equal");
    assert.equal(totalStakes[prev].add(_increase).valueOf(),
      totalStakes[last].valueOf(),
      "total equal");
  }
  
  describe("Staking: ", function () {

    it("setStake - not enough balance", async function () {
      await util.expectThrow(
        novaStaking.setStake(game2, startingBalance.mul(2), { from: user1 }),
        "throw not enough balance"
      );
    });

    it("setStake - can increase", async function () {
      await getStakes(game2, user1);
      await novaStaking.setStake(game2, startingBalance, { from: user1 });
      await confirmStakeChange(game2, user1, startingBalance);
    });

    it("setStake - can set to equal", async function () {
      await getStakes(game2, user1);
      await novaStaking.setStake(game2, startingBalance, { from: user1 });
      await confirmStakeChange(game2, user1, 0);
    });

    it("setStake - can decrease", async function () {
      await getStakes(game2, user1);
      await novaStaking.setStake(game2, 0, { from: user1 });
      await confirmStakeChange(game2, user1, startingBalance.mul(-1));
    });

    it("setStake - can stake a non-existent game", async function () {
      await getStakes(1500, user3);
      await novaStaking.setStake(1500, 1000, { from: user3 });
      await confirmStakeChange(1500, user3, 1000);
    });

    it("increaseStake - can'd do a zero decrease", async function () {
      await util.expectThrow(
        novaStaking.increaseStake(game2, 0, { from: user2 }),
        "throw a zero stake increase"
      );
    });

    it("increaseStake - small", async function () {
      await getStakes(game2, user2);
      await novaStaking.increaseStake(game2, 1000, { from: user2 });
      await confirmStakeChange(game2, user2, 1000);
    });

    it("increaseStake - large", async function () {
      await getStakes(game2, user2);
      await novaStaking.increaseStake(game2, startingBalance.sub(1000), { from: user2 });
      await confirmStakeChange(game2, user2, startingBalance.sub(1000));
    });

    it("increaseStake - can stake a non-existent game", async function () {
      await getStakes(1499, user3);
      await novaStaking.increaseStake(1499, 1000, { from: user3 });
      await confirmStakeChange(1499, user3, 1000);
    });

    it("decreaseStake - too big a decrease", async function () {
      await util.expectThrow(
        novaStaking.decreaseStake(game2, startingBalance.mul(2), { from: user2 }),
        "throw not enough balance"
      );
    });

    it("decreaseStake - too big a decrease", async function () {
      await util.expectThrow(
        novaStaking.decreaseStake(game1, startingBalance, { from: user2 }),
        "throw wrong game"
      );
    });

    it("decreaseStake - can't do a zero decrease", async function () {
      await util.expectThrow(
        novaStaking.decreaseStake(game2, 0, { from: user2 }),
        "throw a zero stake decrease"
      );
    });

    it("decreaseStake", async function () {
      await getStakes(game2, user2);
      await novaStaking.decreaseStake(game2, startingBalance, { from: user2 });
      await confirmStakeChange(game2, user2, startingBalance.mul(-1));

    });

    it("decreaseStake - can decrease a non-existent game", async function () {
      await getStakes(1499, user3);
      await novaStaking.decreaseStake(1499, 1000, { from: user3 });
      await confirmStakeChange(1499, user3, -1000);
    });
  });

  describe("Weeks of Staking:", function () {

    before(async function () {
      await novaStaking.setStake(game1, 0, { from: user1 });
      await novaStaking.setStake(game1, 0, { from: user2 });
      await novaStaking.setStake(game1, 0, { from: user3 });
      await novaStaking.setStake(game2, 0, { from: user1 });
      await novaStaking.setStake(game2, 0, { from: user2 });
      await novaStaking.setStake(game2, 0, { from: user3 });
      await novaStaking.setStake(1499, 0, { from: user3 });
      await novaStaking.setStake(1500, 0, { from: user3 });
      const totalStaked = await novaStaking.totalStaked.call();
      assert.equal(totalStaked, 0, "should be nothing staked");

    });

    /*it("lastWeekGameStake", async function () {
      let lastWeekStake = 2048;
      let currentStake = lastWeekStake;
      let weeksToMove = 4;
      let targetWeek = currentWeek.add(weeksToMove).valueOf();
      let startWeek = currentWeek;
      await novaStaking.setStake(game2, lastWeekStake, { from: user3 });
      let stakes = [];
      let weeks = [];
      stakes.push(1);
      weeks.push(currentWeek);
      stakes.push(lastWeekStake);
      weeks.push(currentWeek.add(1));
      let i = 2
      for (i; i < 6; i++) {
        weeks.push(currentWeek.add(i));
        stakes.push(0);
        await util.forwardOneWeek(); // move 1 week 3 seconds into the future
      }
      for (i; i < 11; i++) {
        currentStake *= 2;
        stakes.push(currentStake);
        weeks.push(currentWeek.add(i));
        targetWeek++;
        await util.forwardOneWeek();
        await novaStaking.setStake(game2, currentStake, { from: user3 });
        let gameStakeLast = await novaStaking.lastWeekGameStake.call(game2);
        let gameStakeCurrent = await novaStaking.gameStaked.call(game2);
        assert.equal(gameStakeCurrent.valueOf(), currentStake, "current (running total) stake");
        assert.equal(gameStakeLast.valueOf(), lastWeekStake, "last week stake");
        lastWeekStake = currentStake;
      }
      currentStake = 0;
      await util.forwardOneWeek();
      await novaStaking.setStake(game2, currentStake, { from: user3 });
      stakes.push(1);
      weeks.push(currentWeek.add(i));
      i++;
      currentStake = 0;
      await util.forwardOneWeek();
      stakes.push(0);
      weeks.push(currentWeek.add(i));
      i++;
      currentStake = 123456789;
      await util.forwardOneWeek();
      await novaStaking.setStake(game2, currentStake, { from: user3 });
      stakes.push(0);
      weeks.push(currentWeek.add(i));
      for (i = 0; i < weeks.length; i++) {
        let gameAcctWeek = await novaStaking.weekGameAccountStakes.call(weeks[i], game2, user3);
        let acctWeek = await novaStaking.weekAccountStakes.call(weeks[i], user3);
        let gameWeek = await novaStaking.weekGameStakes.call(weeks[i], game2);
        let totalWeek = await novaStaking.weekTotalStakes.call(weeks[i]);
        //console.log(`Week ${weeks[i]}, ${stakes[i]}
        //  a: ${acctWeek} t: ${totalWeek} g: ${gameWeek} ga: ${gameAcctWeek}`);
        assert.equal(gameAcctWeek.valueOf(), stakes[i], "game acct history");
        assert.equal(acctWeek.valueOf(), stakes[i], "acct week history");
        assert.equal(gameWeek.valueOf(), stakes[i], "game week history");
        assert.equal(totalWeek.valueOf(), stakes[i], "total week history");
      }
    });*/
  });
})

