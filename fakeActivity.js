// imports
const { ethers } = require("hardhat");
const fs = require("fs")

const UniswapABI = require("./FakeSOFT/PancakeABI.json"); // Изменить на uniswap
const UniswapPairABI = require("./FakeSOFT/PancakePairABI.json"); // Изменить на uniswap
const ERC20ABI = require("./FakeSOFT/ERC20ABI.json");

// provider

// eth : https://rpc.ankr.com/eth
// bsc : https://bsc-mainnet.public.blastapi.io
const ethereumProvider = new ethers.JsonRpcProvider(
    "https://bsc-mainnet.public.blastapi.io"
);

// router

// uniswap: ethereum router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
// pancakeswap: bsc router: 0x10ED43C718714eb63d5aA57B78B54704E256024E 

const pair = "0x6C7336D6dd9947481bc6F81F670a104cB963ea39"; // изменить на uniswap
const router = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

// settings

// -----------------------------------------

// 7f1616173f7fe8554e3cda7f7853ac894631a90a7eb54a3f3e146d7cd0399ace
let simulate_private_key = "f96425a3902ee66407e0ea26a2f26a27f43df2073a66f36800ede02f783eced0";

let number_of_accounts = 1;
let eplenishment_amount = "0.01"; // ETH

let percentageOfTheBalanceForOneSwap = 5n;

let gasPriceInGwei = "3";

let delayMin = 30_000;
let delayMax = 60_000;

const YOUR_TOKEN = "0xbb21c4a6257f3306d0458e92ad0fe583ad0ce858";
const WETH = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";


// -----------------------------------------

let privateKeys = []; 

function readFile(path) {
	fs.readFile(path, "utf8", (error, data) => {
    privateKeys = data.replaceAll("\r","").split("\n");
    main();
    })
}

async function getReserves(signer) {

  const Pair = new ethers.Contract(pair, UniswapPairABI, signer); // Write only
  let result = await Pair.getReserves();
  return result;
}

async function getAmountOut(signer, amountIn, reserveIn, reserveOut) {
  const router1 = new ethers.Contract(router, UniswapABI, signer); // Write only
  let result = router1.getAmountOut(amountIn, reserveIn, reserveOut);
  return result;
  
}

async function getGasPriceInGwei() {
  const gasPricee = (await ethereumProvider.getFeeData()).gasPrice;
  let result = ethers.formatUnits(gasPricee, "gwei");
  return result;
}

async function getGasPriceInWei() {
  const gasPricee = (await ethereumProvider.getFeeData()).gasPrice;
  return gasPricee;
}

async function balanceOf(token, signer) {
    const Token = new ethers.Contract(token, ERC20ABI, signer); // Write only
    const balance = await Token.balanceOf(signer.address);
    return balance;
  }

function getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

async function percentageOfTheTokenBalance(SignerWithAddress, percent) {
  const balance = await balanceOf(YOUR_TOKEN, SignerWithAddress);

  const amount = (balance * percent / 100n).toString();
  
  const length = amount.length;
  return amount.slice(0,5).padEnd(length, "0");
}

async function percentageOfTheEtherBalance(SignerWithAddress, percent) {
  let balance = await ethereumProvider.getBalance(SignerWithAddress.address);

  let amount = (balance * (percent) / 100n).toString();

  let length = amount.length;
  
  return amount.slice(0,5).padEnd(length, "0");
}

function generateNewWallet() {
    let randomWallet = ethers.Wallet.createRandom();
    let mnemonicWallet = ethers.Wallet.fromPhrase(randomWallet.mnemonic.phrase, ethereumProvider);
    
    return mnemonicWallet.privateKey;
} 

async function getBlockTimeStamp() {
    let lastBlockTimestamp = (
      await ethereumProvider.getBlock(
        ethereumProvider._lastBlockNumber
      )
    ).timestamp;
    return lastBlockTimestamp + 86400;
}

  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// TRANSACTION SIMULATION AND GAS RECEIPT

async function simulate_swap_eth_for_tokens() {
  let signer = new ethers.Wallet(simulate_private_key, ethereumProvider);
  let spaceFi_write = new ethers.Contract(router, UniswapABI, signer); // Write only

  let path = [WETH, YOUR_TOKEN];
  let blockTimestamp = await getBlockTimeStamp();

  // uniswap : swapExactETHForTokens
  // pancakeswap: swapETHForExactTokens

  try {
    let tx = await spaceFi_write.swapETHForExactTokens.estimateGas(
      10000,
      path,
      signer.address,
      blockTimestamp,
      { value: ethers.parseEther("0.01"), gasLimit: 2090540 }
    );

    return tx;
  } catch (error) {
    console.log(error);
  }
}

async function simulate_swap_tokens_for_eth() {
  let signer = new ethers.Wallet(simulate_private_key, ethereumProvider);
  let spaceFi_write = new ethers.Contract(router, UniswapABI, signer); // Write only

  let path = [YOUR_TOKEN, WETH];
  let blockTimestamp = await getBlockTimeStamp();

  const Token = new ethers.Contract(path[0], ERC20ABI, signer); // Write only
  let amountIn = await Token.balanceOf(signer.address);

  let reserveInfo = await getReserves(signer);

  let amountOut = await getAmountOut(signer, 61974000000000000000n, reserveInfo[0], reserveInfo[1])
  console.log(amountOut);

  try {
    let tx = await spaceFi_write.swapExactTokensForETHSupportingFeeOnTransferTokens.estimateGas(
      61974000000000000000n, // 10001
      0,
      path,
      signer.address,
      blockTimestamp
    );

    return tx;
  } catch (error) {
    console.log(error);
  }
}

// 


async function swap_eth_for_tokens(
    key,
    amountInETH
  ) {
    let path = [WETH,YOUR_TOKEN];
    let signer = new ethers.Wallet(key, ethereumProvider);
    let spaceFi_write = new ethers.Contract(router, UniswapABI, signer); // Write only
    let blockTimestamp = await getBlockTimeStamp();
  
    let txCompleted = 0;
    while (txCompleted < 1) {
      console.log("delay between requests to the node");
      await new Promise((r) => setTimeout(r, getRandomIntInclusive(10_000, 30_000)));

      let gasPrice = (await ethereumProvider.getFeeData()).gasPrice;
      let _gasPriceInWei = ethers.parseUnits(gasPriceInGwei, "gwei");
  
      if (_gasPriceInWei <= gasPrice) {
        console.log(`Delay before further execution...`);
        await new Promise((r) =>
          setTimeout(r, getRandomIntInclusive(delayMin, delayMax))
        );
        try {
          let tx = await spaceFi_write.swapExactETHForTokens(
            0,
            path,
            signer.address,
            blockTimestamp,
            { value: amountInETH, gasLimit: 2090540, gasPrice: gasPrice }
          );
          await tx.wait(2);
          console.log(`Swap eth for tokens - success!`)
        } catch (error) {
          console.log(error);
        }
        txCompleted++;
        break;
      }
    }
}
  
async function swap_tokens_for_eth(
    key,
    amountIn
  ) {
    let path = [YOUR_TOKEN,WETH];  
    let signer = new ethers.Wallet(key, ethereumProvider);
    let spaceFi_write = new ethers.Contract(router, UniswapABI, signer); // Write only
    let blockTimestamp = await getBlockTimeStamp();
  
    let Token = new ethers.Contract(path[0], ERC20ABI, signer); // Write only
    let allowance = Token.allowance(signer.address, router);
  
    if(allowance != ethers.MaxUint256) {
      let tx = await Token.approve(router, ethers.MaxUint256);
      await tx.wait();
      console.log(`The router was approved from the address - ${signer.address}`);
    };
  
    let txCompleted = 0;
    while (txCompleted < 1) {
      console.log("delay between requests to the node");
      await new Promise((r) => setTimeout(r, getRandomIntInclusive(10_000, 30_000)));

      let gasPrice = (await ethereumProvider.getFeeData()).gasPrice;
      let _gasPriceInWei = ethers.parseUnits(gasPriceInGwei, "gwei");

      if (_gasPriceInWei <= gasPrice) {
        console.log(`Delay before further execution...`);
        await new Promise((r) =>
          setTimeout(r, getRandomIntInclusive(delayMin, delayMax))
        );
        try {
          let tx = await spaceFi_write.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountIn,
            50000,
            path,
            signer.address,
            blockTimestamp
          );
          await tx.wait(2);
          console.log(`Swap tokens for eth - success!`)
        } catch (error) {
          console.log(error);
        }
        txCompleted++;
        break;
      }
    }
}

async function calcReplays(gasPriceInWei) {
  let total_balance = ethers.parseEther(eplenishment_amount); // перевести в wei
  let totalEstimateGas = 0n;
  let fundsSpent = 0n;
  let replays = 0;

  while(true) {
    console.log("delay between requests to the node");
    await new Promise((r) => setTimeout(r, getRandomIntInclusive(5_000, 15_000)));

    let currentGasPrice = (await ethereumProvider.getFeeData()).gasPrice;

    if(currentGasPrice <= gasPriceInWei) {
      totalEstimateGas += await simulate_swap_eth_for_tokens();

      fundsSpent = totalEstimateGas * gasPriceInWei;

      if(total_balance < fundsSpent) {
        break;
      }

      totalEstimateGas += await simulate_swap_tokens_for_eth();

      fundsSpent = totalEstimateGas * gasPriceInWei;

      if(total_balance < fundsSpent) {
        break;
      }
      
      replays++;

      console.log(`TotalEstimateGas: ${totalEstimateGas}`);
      console.log(`FundsSpent: ${ethers.formatEther(fundsSpent)}`);
      console.log(`Replays: ${replays}`);
      console.log("<========================>");
    }
  }
  return replays;
}

async function buy_and_sell(key) {
    console.log(`start buy and sell`);
    const signer = new ethers.Wallet(key, ethereumProvider);

    let amount_for_buy;
    let amount_for_sell;
    
    // buy 
    
    amount_for_buy = await percentageOfTheEtherBalance(
        signer,
        percentageOfTheBalanceForOneSwap
    );
    
    await swap_eth_for_tokens(key, amount_for_buy);
    
    console.log(`Delay before further execution...`);
    await new Promise((r) => setTimeout(r, getRandomIntInclusive(60_000, 240_000)));
    
    // sell

    amount_for_sell = await percentageOfTheTokenBalance(
        signer,
        95n
    );
    
    await swap_tokens_for_eth(key, amount_for_sell);

    await new Promise((r) => setTimeout(r, getRandomIntInclusive(60_000, 240_000)));
}   

async function main() {
    console.log("the process has started...");
    console.log("<========================>");
    for(let i = 0; i < number_of_accounts; i++) {
        // let account_count = getRandomInt(number_of_accounts);
        let key = privateKeys[0];

        const signer = new ethers.Wallet(key, ethereumProvider);

        let _gasPriceInWei = ethers.parseUnits(gasPriceInGwei, "gwei");

        let replays = await calcReplays(_gasPriceInWei);

        for(let i = 0; i < replays; i++) {
            console.log(`[ main ] - Delay before further execution...`);

            await new Promise((r) => setTimeout(r, getRandomIntInclusive(60_000, 240_000)));

            await buy_and_sell(key);
        }
    }
    
}   

// readFile(__dirname + "/privateKeys.txt");
