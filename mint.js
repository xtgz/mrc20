
const ini = require('ini'),
  fs = require('fs'),
  { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519'),
  { SuiClient } = require('@mysten/sui.js/client'),
  { TransactionBlock } = require('@mysten/sui.js/transactions'),
  { fromHEX } = require('@mysten/bcs');
const batchWalletsPrivateKeys = (fs.readFileSync('./wallets.txt', 'utf-8')).split('\n');
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

function logWithTime(message, type = 'i') {
  const date = new Date();
  const time = date.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  if (type == 'r') {
    console.error('\x1b[31m%s\x1b[0m', `[ERROR] [${time}.${milliseconds}] ${message}`);
  }
  if (type == 'i') {
    console.log(`[INFO] [${time}.${milliseconds}] ${message}`);
  }
  if (type == 's') {
    console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] [${time}.${milliseconds}] ${message}`);
  }
}

async function execute_task() {
  const tasks = batchWalletsPrivateKeys.map(async (account) => {
    const privateKey = account.replace('\r', '')
    inscribe(privateKey);
  });
  await Promise.all(tasks);
}
async function inscribe(seed) {
  const keypair = Ed25519Keypair.fromSecretKey(fromHEX(seed))
  const client = new SuiClient({
    url: config.rpc.rpc,
  });
  const packageObjectId = '0x830fe26674dc638af7c3d84030e2575f44a2bdc1baa1f4757cfe010a4b106b6a'
  const address = keypair.getPublicKey().toSuiAddress().toString();
  let inscribed = 0;
  let count = parseInt(config.settings.amount);
  while (inscribed < count) {
    try {
      const tx = new TransactionBlock();
      const [gas] = tx.splitCoins(tx.gas, [tx.pure(1e9 * 0.1)])
      tx.moveCall({
        target: `${packageObjectId}::movescription::mint`,
        arguments: [
          tx.object('0xfa6f8ab30f91a3ca6f969d117677fb4f669e08bbeed815071cf38f4d19284199'),
          tx.pure('move'),
          gas,
          tx.object('0x6')
        ],
        typeArguments: [],
      });
      await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx

      });
      logWithTime(`${address} | [${inscribed + 1}/${count}] Transaction sent successfully!`, 's')
      inscribed++;

    } catch (error) {
      logWithTime(`${error.message}`, 'r');
    }
  }
}
logWithTime('Bot starting...', 'i')
execute_task()