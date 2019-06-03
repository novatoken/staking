var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const BN = require("bignumber.js");
const util = require("./utils.js");

const zeroAddress = "0x0000000000000000000000000000000000000000";
const startingBalance = 2 * 10 ** 27;
const transferAmount = 10 ** 26;
const tripleTransferAmount = new BN(10 ** 26).mul(3).valueOf();
const tooMuchAmount = 10 ** 28;
const gameJson = `{"name":"game name","uri":"https://com","logo":"https://logo","description":"description here"}`;

const tokenCreationCost = 10 ** 21;
const gameFunding = 10 ** 30;
const blankMetadata = [];

const metadata = ["one", "two", "three", "four"];
const cards = [0, 1, 2, 3];
const set1 = 1;
const set2 = 2;
const set3 = 3;

contract('NVT transfer tests:', function (accounts) {

  let novaStaking;
  let nvtContract, anotherERC20Contract;
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


    // Create two games (use the second one) (can reuse the same game)
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    await novaGame.createGame(gameJson, 604800, blankMetadata, { from: user4 });
    gameId = await novaGame.numberOfGames.call() - 1;
  });
    
  describe("setup funding:", function () {
    // Create another ERC20; fund accounts
    it("create new ERC20", async function () {
      anotherERC20Contract = await TestNVT.new({ from: owner });
      const bal1 = await nvtContract.balanceOf.call(owner);
      const bal2 = await anotherERC20Contract.balanceOf.call(owner);
      console.log(`bal:${bal1}, bal2:${bal2}`);
    });

    it("fund base contract", async function () {
      for (let i = 0; i < 9; i++) {
        await nvtContract.transfer(accounts[i], startingBalance, { from: owner });
      }
    });
    it("fund new ERC20", async function () {
      for (let i = 0; i < 9; i++) {
        await anotherERC20Contract.transfer(accounts[i], startingBalance, { from: owner });
      }
    });
  })

  describe("deposit via receiveApproval:", function () {
    it("non-NVT tokens can't be deposited", async function () {
      await util.expectThrow(anotherERC20Contract.approveAndCall(novaStaking.address, transferAmount, "", { from: user1 }));
    });

    it.skip("ETH can't be deposited to either contract", async function () {
      await util.expectCallFail(
        web3.eth.sendTransaction({ to: novaStaking.address, from: user1, value: transferAmount }),
        "no ETH to novaStaking"
      );
      await util.expectCallFail(
        web3.eth.sendTransaction({ to: novaGame.address, from: user1, value: transferAmount }),
        "no ETH to novaGame"
      );
    });

    it("Can't usefully call receiveApproval directly", async function () {
      await util.expectThrow(novaStaking.receiveApproval(user2, transferAmount, nvtContract.address, ""));
    });


    it("Can't deposit more NVT than you have", async function () {
      await util.expectThrow(nvtContract.approveAndCall(novaStaking.address, tooMuchAmount, "", { from: user1 }));
    });

    it("Can deposit", async function () {
      const before = await nvtContract.balanceOf.call(user1);
      const beforeNS = await nvtContract.balanceOf.call(novaStaking.address);
      const beforeUser = await novaStaking.balanceOf.call(user1);
      await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user1 });
      const after = await nvtContract.balanceOf.call(user1);
      const afterNS = await nvtContract.balanceOf.call(novaStaking.address);
      const afterUser = await novaStaking.balanceOf.call(user1);
      const paid = before.sub(after).valueOf();
      const gainedContract = afterNS.sub(beforeNS).valueOf();
      const gainedUser = afterUser.sub(beforeUser).valueOf();
      assert.equal(paid, transferAmount, "amount paid must equal transferAmount");
      assert.equal(paid, gainedContract, "amount paid must equal contract gain");
      assert.equal(paid, gainedUser, "amount paid must equal user gain");
    });
    it("deposit event is fired", async function () {
      const startBalance = await novaStaking.balanceOf(user1);
      const result = await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user1 });
      const ev = novaStaking.Deposit({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Deposit", "log should be named correctly");
      assert.equal(log.args.account, user1, "accounts match");
      assert.equal(log.args.amount.valueOf(), transferAmount, "amount matches");
      assert.equal(log.args.balance.valueOf(), startBalance.add(transferAmount).valueOf(), "balance matches");
    });
    it("approval event is fired", async function () {
      const startBalance = await novaStaking.balanceOf(user1);
      const result = await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user1 });
      const ev = nvtContract.Approval({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Approval", "log should be named correctly");
      assert.equal(log.args.tokenOwner, user1, "owner matches");
      assert.equal(log.args.spender, novaStaking.address, "spender matches");
      assert.equal(log.args.tokens.valueOf(), transferAmount, "amount matches");
    });
    it("transfer event is fired", async function () {
      const startBalance = await novaStaking.balanceOf(user1);
      const result = await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user1 });
      const ev = nvtContract.Transfer({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Transfer", "log should be named correctly");
      assert.equal(log.args.from, user1, "from matches");
      assert.equal(log.args.to, novaStaking.address, "to matches");
      assert.equal(log.args.tokens.valueOf(), transferAmount, "amount matches");
    });
    it("Balance event is fired", async function () {
      const startBalance = await novaStaking.balanceOf(user1);
      const result = await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user1 });
      const ev = novaStaking.Balance({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Balance", "log should be named correctly");
      assert.equal(log.args.account, user1, "accounts match");
      assert.equal(log.args.value.valueOf(), startBalance.add(transferAmount).valueOf(), "balance matches");
    });

    it("Can call receiveApproval manually after an approval", async function () {
      await nvtContract.approve(novaStaking.address, transferAmount, { from: user2 });
      const before = await nvtContract.balanceOf.call(user2);
      const beforeNS = await nvtContract.balanceOf.call(novaStaking.address);
      const beforeUser = await novaStaking.balanceOf.call(user2);
      await novaStaking.receiveApproval(user2, transferAmount, nvtContract.address, "");
      const after = await nvtContract.balanceOf.call(user2);
      const afterNS = await nvtContract.balanceOf.call(novaStaking.address);
      const afterUser = await novaStaking.balanceOf.call(user2);
      const paid = before.sub(after).valueOf();
      const gainedContract = afterNS.sub(beforeNS).valueOf();
      const gainedUser = afterUser.sub(beforeUser).valueOf();
      assert.equal(paid, transferAmount, "amount paid must equal transferAmount");
      assert.equal(paid, gainedContract, "amount paid must equal contract gain");
      assert.equal(paid, gainedUser, "amount paid must equal user gain");
    });
  });

  describe("withdraw:", function () {

    it("user can't withdraw with a zero balance", async function () {
      await util.expectThrow(novaStaking.withdraw(0, { from: user5 }));
    });
    it("cfo can't withdraw with a zero balance", async function () {
      await util.expectThrow(novaStaking.withdraw(0, { from: owner }));
    });
    it("game owner can't withdraw with a zero balance", async function () {
      await util.expectThrow(novaStaking.withdraw(0, { from: user4 }));
    });


    it("can't withdraw too much", async function () {
      const before = await nvtContract.balanceOf.call(user5);
      const beforeNS = await nvtContract.balanceOf.call(novaStaking.address);
      const beforeUser = await novaStaking.balanceOf.call(user5);
      await nvtContract.approveAndCall(novaStaking.address, transferAmount * 2, "", { from: user5 });
      const after = await nvtContract.balanceOf.call(user5);
      const afterNS = await nvtContract.balanceOf.call(novaStaking.address);
      const afterUser = await novaStaking.balanceOf.call(user5);
      const paid = before.sub(after).valueOf();
      const gainedContract = afterNS.sub(beforeNS).valueOf();
      const gainedUser = afterUser.sub(beforeUser).valueOf();
      assert.equal(paid, transferAmount * 2, "amount paid must equal transferAmount");
      assert.equal(paid, gainedContract, "amount paid must equal contract gain");
      assert.equal(paid, gainedUser, "amount paid must equal user gain");
      await util.expectThrow(novaStaking.withdraw(transferAmount * 3, { from: user5 }));
    });

    it("can withdraw partial", async function () {
      const before = await nvtContract.balanceOf.call(user5);
      const beforeNS = await nvtContract.balanceOf.call(novaStaking.address);
      const beforeUser = await novaStaking.balanceOf.call(user5);
      await novaStaking.withdraw(transferAmount, { from: user5 });
      const after = await nvtContract.balanceOf.call(user5);
      const afterNS = await nvtContract.balanceOf.call(novaStaking.address);
      const afterUser = await novaStaking.balanceOf.call(user5);
      const withdrawn = after.sub(before).valueOf();
      const reducedContract = beforeNS.sub(afterNS).valueOf();
      const reducedUser = beforeUser.sub(afterUser).valueOf();
      assert.equal(withdrawn, transferAmount, "amount withdrawn must equal transferAmount");
      assert.equal(withdrawn, reducedContract, "amount withdrawn must equal contract reduction");
      assert.equal(withdrawn, reducedUser, "amount withdrawn must equal user reduction");
    });
    it("can withdraw exact amount", async function () {
      const before = await nvtContract.balanceOf.call(user5);
      const beforeNS = await nvtContract.balanceOf.call(novaStaking.address);
      const beforeUser = await novaStaking.balanceOf.call(user5);
      await novaStaking.withdraw(transferAmount, { from: user5 });
      const after = await nvtContract.balanceOf.call(user5);
      const afterNS = await nvtContract.balanceOf.call(novaStaking.address);
      const afterUser = await novaStaking.balanceOf.call(user5);
      const withdrawn = after.sub(before).valueOf();
      const reducedContract = beforeNS.sub(afterNS).valueOf();
      const reducedUser = beforeUser.sub(afterUser).valueOf();
      assert.equal(withdrawn, transferAmount, "amount withdrawn must equal transferAmount");
      assert.equal(withdrawn, reducedContract, "amount withdrawn must equal contract reduction");
      assert.equal(withdrawn, reducedUser, "amount withdrawn must equal user reduction");
      assert.equal(afterUser.valueOf(), 0, "user internal balance is zero after");
      assert.equal(after.valueOf(), startingBalance, "user mainnet balance is back to start after");
    });
    it("can withdraw all", async function () {
      const before = await nvtContract.balanceOf.call(user5);
      const beforeNS = await nvtContract.balanceOf.call(novaStaking.address);
      const beforeUser = await novaStaking.balanceOf.call(user5);
      await nvtContract.approveAndCall(novaStaking.address, transferAmount * 2, "", { from: user5 });
      const middle = await nvtContract.balanceOf.call(user5);
      const middleNS = await nvtContract.balanceOf.call(novaStaking.address);
      const middleUser = await novaStaking.balanceOf.call(user5);
      assert.equal(middleUser.valueOf(), transferAmount * 2, "user balance increased");
      await novaStaking.withdraw(0, { from: user5 });
      const after = await nvtContract.balanceOf.call(user5);
      const afterNS = await nvtContract.balanceOf.call(novaStaking.address);
      const afterUser = await novaStaking.balanceOf.call(user5);
      const withdrawn = after.sub(middle).valueOf();
      const reducedContract = middleNS.sub(afterNS).valueOf();
      const reducedUser = middleUser.sub(afterUser).valueOf();
      assert.equal(withdrawn, transferAmount * 2, "amount withdrawn must equal transferAmount");
      assert.equal(withdrawn, reducedContract, "amount withdrawn must equal contract reduction");
      assert.equal(withdrawn, reducedUser, "amount withdrawn must equal user reduction");
      assert.equal(afterUser.valueOf(), 0, "user internal balance is zero after");
      assert.equal(after.valueOf(), startingBalance, "user mainnet balance is back to start after");
    });
    it("withdraw event is fired", async function () {
      const startBalance = await novaStaking.balanceOf(user5);
      await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user5 });
      await novaStaking.withdraw(0, { from: user5 });
      const ev = novaStaking.Withdrawal({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Withdrawal", "log should be named correctly");
      assert.equal(log.args.account, user5, "accounts match");
      assert.equal(log.args.amount.valueOf(), transferAmount, "amount matches");
      assert.equal(log.args.balance.valueOf(), 0, "balance matches");
    });
    it("balance event is fired", async function () {
      const startBalance = await novaStaking.balanceOf(user5);
      await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user5 });
      await novaStaking.withdraw(0, { from: user5 });
      const ev = novaStaking.Balance({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Balance", "log should be named correctly");
      assert.equal(log.args.account, user5, "accounts match");
      assert.equal(log.args.value.valueOf(), 0, "balance matches");
    });
    it("transfer event is fired", async function () {
      await nvtContract.approveAndCall(novaStaking.address, transferAmount, "", { from: user5 });
      await novaStaking.withdraw(0, { from: user5 });
      const ev = nvtContract.Transfer({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Transfer", "log should be named correctly");
      assert.equal(log.args.from, novaStaking.address, "from matches");
      assert.equal(log.args.to, user5, "to matches");
      assert.equal(log.args.tokens.valueOf(), transferAmount, "amount matches");
    });
  });

  describe("receiveNVT:", function () {

    let currentWeek, beforeIncome, beforeStored, beforeUserBalance, beforeMainBalance, beforeStakingContract;
    let afterIncome, afterStored, afterUserBalance, afterMainBalance, afterStakingContract;

    before(async function () {
      await nvtContract.approveAndCall(novaStaking.address, transferAmount * 4, "", { from: user3 });
      currentWeek = await novaStaking.getCurrentWeek.call();
      beforeIncome = (await novaStaking.weeklyIncome.call(currentWeek)).valueOf();
      beforeStored = (await novaStaking.storedNVTbyWeek.call(currentWeek)).valueOf();
      beforeUserBalance = (await novaStaking.balanceOf.call(user3)).valueOf();
      beforeMainBalance = (await nvtContract.balanceOf.call(user3)).valueOf();
      beforeStakingContract = (await nvtContract.balanceOf.call(novaStaking.address)).valueOf();
    });

    it("can't receive to a week in the past", async function () {
      const currentWeek = await novaStaking.getCurrentWeek.call();
      await util.expectThrow(novaStaking.receiveNVT(transferAmount, currentWeek - 1, { from: user3 }));
    });

    it("can't receive more NVT than is in your on-system account", async function () {
      const currentWeek = await novaStaking.getCurrentWeek.call();
      await util.expectThrow(novaStaking.receiveNVT(tooMuchAmount * 5, currentWeek, { from: user3 }));
    });

    it("can receive", async function () {
      novaStaking.receiveNVT(transferAmount, currentWeek, { from: user3 });
      afterIncome = (await novaStaking.weeklyIncome.call(currentWeek)).valueOf();
      afterStored = (await novaStaking.storedNVTbyWeek.call(currentWeek)).valueOf();
      afterUserBalance = (await novaStaking.balanceOf.call(user3)).valueOf();
      afterMainBalance = (await nvtContract.balanceOf.call(user3)).valueOf();
      afterStakingContract = (await nvtContract.balanceOf.call(novaStaking.address)).valueOf();
    });

    it("adds to weeklyIncome", async function () {
      assert.equal(beforeIncome + transferAmount, afterIncome * 1, "matches");
    });

    it("adds to storedNVTbyWeek", async function () {
      assert.equal(beforeStored + transferAmount, afterStored * 1, "matches");
    });

    it("doesn't change contract balance", async function () {
      assert.equal(beforeStakingContract, afterStakingContract, "matches");
    });

    it("Changes userbalance", async function () {
      assert.equal(tripleTransferAmount, afterUserBalance * 1, "matches");
    });
    it("doesn't change main userbalance", async function () {
      assert.equal(beforeMainBalance, afterMainBalance, "matches");
    });
    it("StoredNVT event was fired", async function () {
      const ev = novaStaking.StoredNVT({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "StoredNVT", "log should be named correctly");
      assert.equal(log.args.week.valueOf(), currentWeek.valueOf(), "week matches");
      assert.equal(log.args.stored.valueOf(), transferAmount, "amount matches");
    });
    it("transfer event was fired", async function () {
      const ev = novaStaking.Transfer({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      assert.equal(logs.length, 1, "should be one log");
      assert.equal(log.event, "Transfer", "log should be named correctly");
      assert.equal(log.args.from, user3, "from matches");
      assert.equal(log.args.to, novaStaking.address, "to matches");
      assert.equal(log.args.value.valueOf(), transferAmount, "amount matches");
    });
    it("balance events were fired", async function () {
      const ev = novaStaking.Balance({}, { fromBlock: 'latest', toBlock: 'latest' });
      const logs = await util.getContractEventsAsync(ev);
      const log = logs[0];
      const log1 = logs[1];
      assert.equal(logs.length, 2, "should be two logs");
      assert.equal(log.event, "Balance", "log should be named correctly");
      assert.equal(log.args.account, user3, "accounts match");
      console.log(transferAmount);
      console.log(tripleTransferAmount);
      assert.equal(log.args.value.valueOf() * 1, tripleTransferAmount, "balance matches");
      assert.equal(log1.event, "Balance", "1: log should be named correctly");
      assert.equal(log1.args.account, novaStaking.address, "1: accounts match");
      assert.equal(log1.args.value.valueOf(), transferAmount, "1: balance matches");
    });
  });

})

