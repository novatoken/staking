var TestNVT = artifacts.require("TestNVT");

module.exports = function (deployer, network, accounts) {
  console.log("Starting TestNVT");
  let testNVT;
  let cardContract;
  deployer.deploy(TestNVT)
    .then(function () {
      console.log("Set up Test NVT contract");
      return;
    });
};