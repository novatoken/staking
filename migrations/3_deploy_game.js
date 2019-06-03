var NovaGame = artifacts.require("NovaGame");
var TestGame = artifacts.require("TestGame");
var NovaStaking = artifacts.require("NovaStaking");
var TestStaking = artifacts.require("TestStaking");


module.exports = function (deployer, network, accounts) {
  if (deployer.network == "development") {
    return deployer.deploy(TestGame, TestStaking.address)
      .then(function (instance) {
        console.log("DEVELOPMENT. Deployed TEST NovaGame contract");
        return;
      });
  } else {
    return deployer.deploy(NovaGame, NovaStaking.address)
      .then(function (instance) {
        console.log("Deployed NovaGame contract");
        return;
      });
  }

};