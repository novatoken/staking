var NovaStaking = artifacts.require("NovaStaking");
var TestStaking = artifacts.require("TestStaking");
var TestNVT = artifacts.require("TestNVT");

module.exports = function (deployer, network, accounts) {
  console.log("Starting Staking");
  if (deployer.network == "development") {
    return deployer.deploy(TestStaking, TestNVT.address)
      .then(function () {
        console.log("DEVELOPMENT. Deployed Nova Token TEST Staking contract");
        return;
      });
  } else {
    return deployer.deploy(NovaStaking, TestNVT.address)
      .then(function () {
        console.log("Deployed Nova Token Stkaing contract");
        return;
      });
  }
};