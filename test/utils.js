require("babel-polyfill");

// this web3 is injected:
web3.BigNumber.config({ EXPONENTIAL_AT: 100 });

const promisify = inner =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    })
  );

// Took this from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/expectThrow.js
// Doesn't seem to work any more :(
// Changing to use the invalid opcode error instead works
const expectThrow = async (promise, message) => {
  try {
    await promise;
  } catch (err) {
    //console.log("Error: " + err.message);
    const outOfGas = err.message.includes("out of gas");
    const invalidOpcode = err.message.includes("invalid opcode");
    const revert = err.message.search("revert") >= 1;
    assert(
      outOfGas || invalidOpcode || revert,
      `${message}: Expected throw, got ${err} instead`
    );
    return;
  }
  assert.equal("didn't", "throw", `${message}: Expected throw not received`);
};
const expectCallFail = async (promise, message) => {
  try {
    await promise;
  } catch (err) {
    /*const outOfGas = err.message.includes("out of gas");
    const invalidOpcode = err.message.includes("invalid opcode");
    const revert = err.message.search("revert") >= 1;
    console.log(JSON.stringify(err));
    const callFail = err.message.search("Invalid JSON RPC response: {");
    assert(
      outOfGas || invalidOpcode || revert || callFail,
      `${message}: Expected throw, got ${err} instead`
    );*/
    return;
  }
  assert.equal("didn't", "throw", `${message}: Expected throw not received`);
};

const getContractEventsAsync = function (myevent) {
  return new Promise(function (resolve, reject) {
    myevent.get(function (error, logs) {
      if (error !== null) {
        reject(error);
      }
      resolve(logs);
    });
  });
};

const expectTransactionFailure = async txResult => {
  console.log("failed");
  console.log(txResult);
  console.log(txResult.receipt);
  console.log(txResult.receipt.status);
}

// Works for testrpc v4.1.3
const mineOneBlock = async () => {
  await web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_mine",
    params: [],
    id: 0
  });
};

const mineNBlocks = async n => {
  for (let i = 0; i < n; i++) {
    await mineOneBlock();
  }
};

const getGasPrice = () => {
  return promisify(web3.eth.getGasPrice);
};

const SECONDS_PER_WEEK = 604800; // Use 3600 for testing hour-long weeks

const forwardOneWeek = async boolean => {
  await forwardEVMTime(SECONDS_PER_WEEK)
}

const forwardEVMTime = async seconds => {
  await web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_increaseTime",
    params: [seconds],
    id: 0
  });
  await mineOneBlock();
};

// truffle currently have an issue running a single test https://github.com/trufflesuite/truffle/issues/606
const isNotFocusTest = testName => {
  const focus = process.env.FOCUS_TEST;
  if (typeof focus === "string" && focus != testName) {
    console.log("skipping test", testName);
    return true;
  } else {
    return false;
  }
};

// given a number or as string up to 31, returns the 5 bit representation
const b5 = s => {
  if (typeof s === "number") return s.toString(2).padStart(5, "0");
  if (typeof s === "string") return s.padStart(5, "0");
  else throw new Error("invalid input");
};

const inGameAccount = userNumber => {
  return `inGameAccount:${userNumber}`;
};

// keep a snapshot of the evm to always run tests clean (not working as intended)
let snapshot;
const restoreSnapshot = async function () {
  console.log("restoreSnapshot:", snapshot);
  if (snapshot) {
    console.log("..restoring");
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_revert",
      params: [snapshot],
      id: 0
    });
  } else {
    console.log("..snapshotting");
    const res = await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_snapshot",
      params: [],
      id: 0
    });
    snapshot = res.result;
  }
};

module.exports = {
  forwardEVMTime,
  forwardOneWeek,
  expectThrow,
  expectCallFail,
  getContractEventsAsync,
  mineOneBlock,
  mineNBlocks,
  getGasPrice,
  b5,
  isNotFocusTest,
  inGameAccount,
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  restoreSnapshot
};