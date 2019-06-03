var NovaGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

const web3 = global.web3;
const util = require("./utils.js");
const zeroAddress = "0x0000000000000000000000000000000000000000";


contract('Migration Tests:', function (accounts) {

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
  });

  it("Base Init Accounts", async function () {
    const ownerAddress = await novaStaking.owner.call();
    const recoveryAddress = await novaStaking.recoveryAddress.call();
    assert.notEqual(ownerAddress.valueOf(), 0, "Owner address must be set");
    assert.equal(recoveryAddress.valueOf(), 0, "Recovery address must be 0");
  });

  it("Nova Game data set", async function () {
    const maxGames = await novaGame.games.call(0);
    assert.equal(maxGames, 2 ** 32, "no more than 2^32 games allowed");

    const stakingAddress = await novaGame.stakingContract.call();
    assert.equal(stakingAddress, NovaStaking.address, "Staking address must be set");

  });

  it("Nova Staking data set", async function () {

    const nvtAddress = await novaStaking.nvtContract.call();
    assert.equal(nvtAddress, nvtContract.address, "nvt address must be set");
    const gameAddress = await novaStaking.gameContract.call();
    assert.equal(gameAddress, NovaGame.address, "NovaGame address must be set");


    const currentWeek = await novaStaking.getCurrentWeek.call();
    assert.isAbove(currentWeek.valueOf(), 0, "currentWeek");

    const totalStaked = await novaStaking.totalStaked.call();
    assert.equal(totalStaked.valueOf(), 0, "totalStaked");
    const lastWeekTotalStakes = await novaStaking.weekTotalStakes.call(currentWeek.sub(1).valueOf());
    assert.equal(lastWeekTotalStakes.valueOf(), 1, "lastPayoutWeek weekTotalStakes");
    const currentWeekTotalStakes = await novaStaking.weekTotalStakes.call(currentWeek);
    assert.equal(currentWeekTotalStakes.valueOf(), 0, "currentWeek weekTotalStakes");

    const ownerAddress = await novaStaking.owner.call();
    assert.equal(ownerAddress, owner, "ownerAddress");
    const recoveryAddress = await novaStaking.recoveryAddress.call();
    assert.equal(recoveryAddress, zeroAddress, "");
  });

});