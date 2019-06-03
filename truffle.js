require('dotenv').config();
const Web3 = require("web3");
const web3 = new Web3();
const WalletProvider = require("truffle-wallet-provider");
const Wallet = require('ethereumjs-wallet');

var mainNetPrivateKey = new Buffer(process.env["MAINNET_PRIVATE_KEY"], "hex")
var mainNetWallet = Wallet.fromPrivateKey(mainNetPrivateKey);
var mainNetProvider = new WalletProvider(mainNetWallet, "https://mainnet.infura.io/PUaNIChAhnofsGxhvKXT");

var ropstenPrivateKey = new Buffer(process.env["ROPSTEN_PRIVATE_KEY"], "hex")
var ropstenWallet = Wallet.fromPrivateKey(ropstenPrivateKey);
var ropstenProvider = new WalletProvider(ropstenWallet, "https://ropsten.infura.io/PUaNIChAhnofsGxhvKXT");

var kovanPrivateKey = new Buffer(process.env["ROPSTEN_PRIVATE_KEY"], "hex")
var kovanWallet = Wallet.fromPrivateKey(kovanPrivateKey);
var kovanProvider = new WalletProvider(kovanWallet, "https://kovan.infura.io/PUaNIChAhnofsGxhvKXT");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      gas: 7600000,
      gasPrice: web3.utils.toWei("3", "gwei"),
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: ropstenProvider,
      gas: 4700000,
      gasPrice: web3.utils.toWei("2", "gwei"),
      network_id: "3",
    },
    kovan: {
      provider: kovanProvider,
      gas: 7600000,
      gasPrice: web3.utils.toWei("15", "gwei"),
      network_id: '42'
    },
    mainnet: {
      provider: mainNetProvider,
      gas: 7600000,
      gasPrice: web3.utils.toWei("2", "gwei"),
      network_id: "1",
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
};