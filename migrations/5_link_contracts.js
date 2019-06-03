var NovaGame = artifacts.require("NovaGame");
var TestGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("NovaStaking");
var TestStaking = artifacts.require("TestStaking");


module.exports = function (deployer, network, accounts) {
  let staking;
  if (deployer.network == "development") {
    return TestStaking.deployed()
      .then(function (instance) {
        staking = instance;
        console.log("TestGame: " + TestGame.address);
        console.log("TestStaking: " + TestStaking.address);
        return staking.linkContracts(
          TestGame.address)
          .then(function () {
            console.log("DEVELOPMENT Linked TEST Staking and TEST Game contracts");
            return;
          })
      });
  } else {
    return NovaStaking.deployed()
      .then(function (instance) {
        staking = instance;
        console.log("Game: " + NovaGame.address);
        console.log("Staking: " + NovaStaking.address);
        return staking.linkContracts(
          NovaGame.address)
          .then(function () {
            console.log("Linked Staking and Game contracts");
            return;
          })
      });
  }
};