var shell = require('shelljs');

module.exports = function (deployer, network, accounts) {
  if (deployer.network == "development") {
    console.log("DEVELOPMENT. Skip Flattening.");
  } else {
    shell.exec("npm start --prefix ./oracles-combine-solidity ../contracts/NovaGame.sol");
    shell.exec("npm start --prefix ./oracles-combine-solidity ../contracts/NovaStaking.sol");
    shell.exec("npm start --prefix ./oracles-combine-solidity ../contracts/TestNVT.sol");
  }
  return;
};