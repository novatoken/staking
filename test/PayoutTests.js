var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const web3 = global.web3;
const BN = require("bignumber.js");
const util = require("./utils.js");

const zeroAddress = "0x0000000000000000000000000000000000000000";

const billion = 1000000000;
const tokenCreationCost = new BN(10 ** 21);
const blankMetadata = [];
const decimalMultiplier = new BN(10 ** 18);
const startingBalance = decimalMultiplier.mul(20).mul(billion);
const gameFunding = startingBalance.div(10);
const cardFee = decimalMultiplier.mul(100000);

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
const gameJson = `{"name":"game name","uri":"https://com","logo":"https://logo","description":"description here"}`;

contract('Payout Tests:', function (accounts) {

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
  let originalLastWeek;
  let extraPayoutWeeks;

  let oldGameBalance1, oldGameBalance2, currentGameBalance1, currentGameBalance2;

  let g2payments = [];

  //create new smart contract instance before each test method
  before(async function () {
    novaStaking = await NovaStaking.deployed();
    nvtContract = await TestNVT.deployed();
    novaGame = await NovaGame.deployed();

    for (let i = 0; i < 10; i++) {
      await novaStaking.setNVTbalance(accounts[i], startingBalance);
    }

    // Create two games (use the second one) (can reuse the same game)
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user7 });
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user7 });
    game2 = await novaGame.numberOfGames.call() - 1;
    game1 = game2 - 1;

    await novaGame.addAdminAccount(game1, user8, { from: user7 });
    await novaGame.addAdminAccount(game2, user8, { from: user7 });

    currentWeek = await novaStaking.getCurrentWeek.call();
    //originalLastWeek = await novaStaking.lastPayoutWeek.call();;
    extraPayoutWeeks = 0; // = currentWeek.sub(originalLastWeek).sub(1).valueOf();
    //console.log(`current week: ${currentWeek} last payout week: ${originalLastWeek} diff:${extraPayoutWeeks}`);
  });

  const resetUser = async function (game, account) {
    // Take payout
    try { await novaStaking.collectPayout(0, { from: account }); } catch (error) { }
    // Remove stake
    await novaStaking.setStake(game, 0, { from: account });
    // Reset funds to max
    await novaStaking.setNVTbalance(account, startingBalance);
    const accountIndex = accounts.indexOf(account);
    currentBalances[accountIndex] = startingBalance;
    oldbalances[accountIndex] = startingBalance;
  }

  const resetGame = async function (game) {
    // Take payout
    try { await novaStaking.collectGamePayout(0, { from: user7 }); } catch (error) { }
    // Reset game's funds to 0
    await novaStaking.setNVTbalance(game, 0);
  }

  const cfoReset = async function () {
    // Reset Owner's funds to 0
    await novaStaking.setNVTbalance(user9, 0);
  }

  const setStake = async function (game, account, newStake) {
    await novaStaking.setStake(game, newStake, { from: account });
  }

  const updateOldBalances = function () {
    for (let i = 0; i < currentbalances.length; i++) {
      oldbalances[i] = currentbalances[i];
    }
    oldGameBalance1 = currentGameBalance1;
    oldGameBalance2 = currentGameBalance2;
  }

  describe("Payouts: ", function () {

    let p1stake = [];
    let p2stake = [];
    let p3stake = [];
    let p4stake = [];
    let p5stake = [];
    let p6stake = [];
    let totalStakes = [];
    let g2cardBought = [];
    let totalPayments = [];
    let p1payout = [];
    let p2payout = [];
    let p3payout = [];
    let p4payout = [];
    let p5payout = [];
    let p6payout = [];
    let g1payout = [];
    let cfoPayout = [];
    let stakes = [p1stake, p2stake, p3stake, p4stake, p5stake, p6stake];
    let payouts = [p1payout, p2payout, p3payout, p4payout, p5payout, p6payout];
    let users = [user1, user2, user3, user4, user5, user6];
    let totalPayouts = [];

    before(async function () {
      const totalSupply = decimalMultiplier.mul(80).mul(billion); // Fake the 
      const halfSupply = totalSupply.div(2);
      // set balances to 20Bn each
      // fund each game with 10Bn
      // set card fee to 1M per card

      for (let i = 0; i < 12; i++) {
        p1stake[i] = i < 5 ? decimalMultiplier.mul(4).mul(billion) : decimalMultiplier.mul(18).mul(billion);
        p2stake[i] = (i < 3 || i == 8) ? new BN(0) : i < 8 ? decimalMultiplier.mul(3).mul(billion) : decimalMultiplier.mul(20).mul(billion);
        p3stake[i] = i < 4 ? new BN(0) : i < 4 ? decimalMultiplier.mul(1).mul(billion) : decimalMultiplier.mul(12).mul(billion);
        p4stake[i] = i == 1 ? new BN(0) : decimalMultiplier.mul(1);
        p5stake[i] = i == 1 ? new BN(0) : decimalMultiplier.mul(1000);
        p6stake[i] = i < 2 ? new BN(0) : decimalMultiplier.mul(1000000);
      }
      for (i = 0; i < 12; i++) {
        g2cardBought[i] = i == 6 ? 0 : 20;
        g2payments[i] = cardFee.mul(g2cardBought[i]).mul(100);
        totalPayments[i] = g2payments[i];
        let k = i;
        totalStakes[k] = p1stake[k].add(p2stake[k]).add(p3stake[k]).add(p4stake[k]).add(p5stake[k]).add(p6stake[k]);
        let stakeMul = totalStakes[k] == 0
          ? new BN(0)
          : totalStakes[k] < halfSupply
            ? halfSupply.div(totalStakes[k])
            : 1;
        
        for (let j = 0; j < 6; j++) {
          payouts[j][i] = totalStakes[k] == 0 ? new BN(0) : totalPayments[i].mul(stakes[j][k]).mul(stakeMul).div(totalSupply).div(2);
        }
        g1payout[i] = totalPayments[i].mul(totalStakes[k]).mul(stakeMul).div(totalSupply).div(2);
        cfoPayout[i] = totalPayments[i].mul(totalSupply.sub(totalStakes[k].mul(stakeMul))).div(totalSupply);
        
        totalPayouts[i] = cfoPayout[i].add(g1payout[i]).add(p1payout[i]).add(p2payout[i])
          .add(p3payout[i]).add(p4payout[i]).add(p5payout[i]).add(p6payout[i]);
        //console.log(`in:${totalPayments[i]} out:${totalPayouts[i]} cfo:${cfoPayout[i]} stake:${totalStakes[k]} mul:${stakeMul}`);
      }
      console.log("In: " + JSON.stringify(totalPayments));
      console.log("Out: " + JSON.stringify(totalPayouts));
      console.log("user1" + JSON.stringify(p1stake));
      /*console.log(JSON.stringify(g2cardBought));
      console.log("In: " + JSON.stringify(totalPayments));
      console.log("Out: " + JSON.stringify(totalPayouts));
      console.log("user1" + JSON.stringify(p1stake));
      console.log("user2" + JSON.stringify(p2stake));
      console.log("user3" + JSON.stringify(p3stake));
      console.log("user4" + JSON.stringify(p4stake));
      console.log("user5" + JSON.stringify(p5stake));
      console.log("user6" + JSON.stringify(p6stake));*/
    });

    let startBalances = [];

    it("log balances", async function () {
      for (let i = 0; i < 6; i++) {
        startBalances.push(await novaStaking.balanceOf.call(users[i]));
      }
      startBalances.push(await novaStaking.balanceOf.call(game1));
      startBalances.push(await novaStaking.balanceOf.call(game2));
      startBalances.push(await novaStaking.balanceOf.call(user9));
    });

    it("setup payouts", async function () {

      await novaStaking.setNVTbalance(user8, g2payments[10] * 100);

    });

    it("make Stakes", async function () {
      startContractBal = await novaStaking.balanceOf.call(novaStaking.address);
      let week = await novaStaking.getCurrentWeek.call();
      for (let i = 0; i < totalStakes.length; i++) {
        // set stakes
        for (let j = 0; j < stakes.length; j++) {
          console.log(`i:${i} j:${j} week:${week} iStake:${"???"} totStake:${stakes[j][i]}`);
          if (i == 0 || stakes[j][i].sub(stakes[j][i - 1]) != 0) {
            //console.log(`week ${week} set ${j} stake to ${stakes[j][i]}`);
            await novaStaking.setStake(game1, stakes[j][i], { from: users[j] });

            
            //somehow the user2 stake is NOT being set to 20Bn in weeks 9 +
            //  Balance is being reduced
            //    (also can check game2 before & start balances - will give == contract balance)
            
          }
        }
        // move time
        let k = i + 1;
        // make payments via 
        if (g2cardBought[k] > 0) {
          await novaStaking.receiveNVT(g2payments[k], week, { from: user4 });
        }
        let storedNvt = await novaStaking.storedNVTbyWeek.call(week);
        beforeContractBal = await novaStaking.balanceOf.call(novaStaking.address);
        console.log(`week ${week.valueOf()} stored:${storedNvt.valueOf()} contractBal:${beforeContractBal}`);
        await util.forwardOneWeek();
        week = await novaStaking.getCurrentWeek.call();
      }
      // Skip 1 more week into the future, so we can take payouts for everything
      // await util.forwardOneWeek();
    });

    let startContractBal, beforeContractBal, afterContractBal;

    let beforeBalances = [];
    let afterBalances = [];

    it("log balances", async function () {
      for (let i = 0; i < 6; i++) {
        beforeBalances.push(await novaStaking.balanceOf.call(users[i]));
      }
      beforeBalances.push(await novaStaking.balanceOf.call(game1));
      beforeBalances.push(await novaStaking.balanceOf.call(game2));
      beforeBalances.push(await novaStaking.balanceOf.call(owner));
    });

    it("collect user1 Payouts", async function () {
      // user1, collect 1 week at a time
      // users 2-6, collect all
      // game 1, collect 3 weeks at a time
      // cfo, collect 4 weeks at a time
      // game 2, collect all, it's zero
      const before = (await novaStaking.balanceOf.call(users[0])).valueOf();
      const beforeContract = (await novaStaking.balanceOf.call(novaStaking.address)).valueOf();
      let prev = before;
      let prevContract = beforeContract;
      for (let i = 0; i < 13; i++) {
        await novaStaking.collectPayout(1, { from: users[0] });
        let during = (await novaStaking.balanceOf.call(users[0])).valueOf();
        let duringContract = (await novaStaking.balanceOf.call(novaStaking.address)).valueOf();
        console.log(during);
        //assert.isAbove(during, prev, `user1 payouts 'during'. ${during} should be above ${prev} ${i}`);
        //assert.isAbove(duringContract, prevContract, `user1 payouts 'duringContract'. ${duringContract} should be above ${prevContract} ${i}`);
        prev = during;
        prevContract = duringContract;
      }
      const after = await novaStaking.balanceOf.call(users[0]);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`0: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("collect user2 Payouts", async function () {
      const before = await novaStaking.balanceOf.call(users[1]);
      await novaStaking.collectPayout(0, { from: users[1] });
      const after = await novaStaking.balanceOf.call(users[1]);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`2: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("collect user3 Payouts", async function () {
      const before = await novaStaking.balanceOf.call(users[2]);
      await novaStaking.collectPayout(0, { from: users[2] });
      const after = await novaStaking.balanceOf.call(users[2]);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`2: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("collect user4 Payouts", async function () {
      const before = await novaStaking.balanceOf.call(users[3]);
      await novaStaking.collectPayout(2, { from: users[3] });
      await novaStaking.collectPayout(4, { from: users[3] });
      await novaStaking.collectPayout(0, { from: users[3] });
      const after = await novaStaking.balanceOf.call(users[3]);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`3: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("collect user5 Payouts", async function () {
      const before = await novaStaking.balanceOf.call(users[4]);
      await novaStaking.collectPayout(0, { from: users[4] });
      const after = await novaStaking.balanceOf.call(users[4]);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`4: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("collect user6 Payouts", async function () {
      const before = await novaStaking.balanceOf.call(users[5]);
      await novaStaking.collectPayout(0, { from: users[5] });
      const after = await novaStaking.balanceOf.call(users[5]);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`5: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("collect Game Payouts", async function () {
      const before = await novaStaking.balanceOf.call(user7);
      await novaStaking.collectGamePayout(game1, 6, { from: user7 });
      await novaStaking.collectGamePayout(game1, 3, { from: user7 });
      await novaStaking.collectGamePayout(game1, 3, { from: user7 });
      await novaStaking.collectGamePayout(game1, 1, { from: user7 });
      const after = await novaStaking.balanceOf.call(user7);
      const contractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`game: before:${before} after:${after} contract bal: ${contractBal}`);
    });

    it("confirm nobody can take any more payouts", async function () {
      await util.expectThrow(
        novaStaking.collectGamePayout(game1, 1, { from: user7 }),
        "Game");
      await util.expectThrow(
        novaStaking.collectPayout(1, { from: user7 }),
        `User 7 isn't staked`);
      for (let j = 0; j < users.length; j++) {
        await util.expectThrow(
          novaStaking.collectPayout(1, { from: users[j] }),
          `User ${j}`);
      };
    });

    it("erc20 contract balance is zero", async function () {
      week = await novaStaking.getCurrentWeek.call();
      let storedNvt = await novaStaking.storedNVTbyWeek.call(week);
      afterContractBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`week ${week.valueOf()} stored:${storedNvt.valueOf()} contractBal:${afterContractBal}`);
      console.log(`contract 
        start:${startContractBal}
        before:${beforeContractBal}
        after:${afterContractBal}
        diff:${beforeContractBal.sub(afterContractBal).valueOf()}`);
      assert.isBelow(afterContractBal.valueOf(), billion, "after balance below 1 BN atto-NVT");
    });

    it("log balances", async function () {
      for (let i = 0; i < 6; i++) {
        afterBalances.push(await novaStaking.balanceOf.call(users[i]));
      }
      afterBalances.push(await novaStaking.balanceOf.call(game1));
      afterBalances.push(await novaStaking.balanceOf.call(game2));
      afterBalances.push(await novaStaking.balanceOf.call(owner));
      //console.log("Start:" + JSON.stringify(startBalances, null, 2));
      //console.log("Before:" + JSON.stringify(beforeBalances, null, 2));
      //console.log("After:" + JSON.stringify(afterBalances, null, 2));
      let balanceDiffs = [];
      let beforeTotal = beforeBalances[0];
      let afterTotal = afterBalances[0];
      let startTotal = startBalances[0];
      balanceDiffs[0] = afterBalances[0].sub(beforeBalances[0]);
      for (i = 1; i < beforeBalances.length; i++) {
        beforeTotal = beforeTotal.add(beforeBalances[i]);
        afterTotal = afterTotal.add(afterBalances[i]);
        startTotal = startTotal.add(startBalances[i]);
        balanceDiffs[i] = afterBalances[i].sub(beforeBalances[i]);
      }
      console.log("Balance Diffs:" + JSON.stringify(balanceDiffs, null, 2));
      const totalDiff = afterTotal.sub(beforeTotal);
      console.log(`Total Balances:
        start: ${startTotal.valueOf()} 
        before:${beforeTotal.valueOf()} 
        after: ${afterTotal.valueOf()} 
        diff:  ${totalDiff.valueOf()}`);
      const gameDiff = afterBalances[6].sub(beforeBalances[6]);
      const cfoDiff = afterBalances[8].sub(beforeBalances[8]);
      const playersDiff = totalDiff.sub(gameDiff).sub(cfoDiff);
      console.log(`totDiff: ${totalDiff}`);
      console.log(`gameDiff:${gameDiff}`);
      console.log(`playDiff:${playersDiff}`);
      console.log(`player+Game diffs:${gameDiff.add(playersDiff)}`);
      console.log(`cfoDiff: ${cfoDiff}`);
      assert.equal(totalDiff.add(afterContractBal).valueOf(), beforeContractBal.valueOf(), "no NVT are created or destroyed");
    });

    it("user balances are correct", async function () {
      // need to check each user's balance against what it should have earned
      assert.fail("need to check each user's balance against what it should have earned");
    });

    it("one more week of pay-ins (same stakes", async function () {

      await novaStaking.setNVTbalance(novaStaking.address, 0);
      for (let i = 0; i < 11; i++) {
        week = await novaStaking.getCurrentWeek.call();
        await novaStaking.receiveNVT(g2payments[10], week, { from: user4 });
      
        await util.forwardOneWeek();
      }
      await util.forwardOneWeek();
    });


    it("collect all", async function () {
      let beforeBal = await novaStaking.balanceOf.call(novaStaking.address);
      assert.isAbove(beforeBal, decimalMultiplier.mul(100), "should be more thna 100 NVT in contract");
      for (let i = 0; i < users.length; i++) {
        await novaStaking.collectPayout(0, { from: users[i] });
      }
      await novaStaking.collectGamePayout(game1, 0, { from: user7 });
      let afterBal = await novaStaking.balanceOf.call(novaStaking.address);
      console.log(`before:${beforeBal}, after:${afterBal}`);
      assert.equal(afterBal.valueOf(), 0, "should be all paid out");
    });

    it("second time: confirm nobody can take any more payouts", async function () {
      await util.expectThrow(
        novaStaking.collectGamePayout(game1, 1, { from: user7 }),
        "Game");
      await util.expectThrow(
        novaStaking.collectPayout(1, { from: user7 }),
        `User 7 isn't staked`);
      for (let j = 0; j < users.length; j++) {
        await util.expectThrow(
          novaStaking.collectPayout(1, { from: users[j] }),
          `User ${j}`);
      };
    });
  });

  describe("Payout Functions: ", function () {
    before(async function () {

      const week = await novaStaking.getCurrentWeek.call();
      await novaStaking.receiveNVT(g2payments[10], week, { from: user4 });

      await util.forwardOneWeek();
      await util.forwardOneWeek();
    });

    it("collectGamePayout - can't call from owner", async function () {
      await util.expectThrow(
        novaStaking.collectGamePayout(game1, 0, { from: owner }),
        "Game");
    });

    it("collectGamePayout - can't call from random user", async function () {
      await util.expectThrow(
        novaStaking.collectGamePayout(game1, 0, { from: user3 }),
        "Game");
    });

    it("collectGamePayout - can't call from cfo", async function () {
      await util.expectThrow(
        novaStaking.collectGamePayout(game1, 0, { from: user9 }),
        "Game");
    });

    it("collectGamePayout - can call from game admin", async function () {
      await novaStaking.collectGamePayout(game1, 0, { from: user7 });
    });
  });
})

