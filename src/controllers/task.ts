import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';

import { Request, Response } from 'express';

export async function createTask(req: Request, res: Response) {
  try{

    const word = await generateTask();

    
    return res.status(200).json({ message: "Task created successfully", word: word });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function generateTask() {
    const rpcEndpoint = "https://rpc.hack.layer.xyz";
    const prefix = "layer"; // Bech32 prefix for addresses
    const chainId = "layer-hack-1";
    const gasPrice = GasPrice.fromString("0.025ulayer");

    const mnemonic = String(process.env.MNEMONIC);

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
    });

    const signer: OfflineSigner = wallet;
    const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, signer, {
        gasPrice: gasPrice,
    });

    const [account] = await wallet.getAccounts();
    const senderAddress = account.address;
    console.log(`Sender Address: ${senderAddress}`);

    const balance = await client.getBalance(senderAddress, "ulayer");
    console.log(`Balance: ${balance.amount} ${balance.denom}`);

    const contractAddress = "layer1rfjdfgj209sq4au8vatq7xxg20jmcs2vsusw5smtm08x6l4facysx2pm09";
    const executeMsg = {
        create: {
            description: "test task",
            timeout: null,
            payload: {"prompt": "Elon"},
            // with_timeout_hooks:null,
            // with_completed_hooks:null
        }
    };


    const fee = {
        amount: [
          {
            denom: "ulayer",
            amount: "2000", // Adjust the fee amount as needed
          },
        ],
        gas: "200000", // Adjust the gas limit as needed
      };
    // Define the funds to send
    const funds = [
        {
            denom: "ulayer",
            amount: "5000", // Amount to send (e.g., 1 LAYER = 1,000,000 ulayer)
        },
    ];

    const result = await client.execute(senderAddress, contractAddress, executeMsg, "auto", undefined, funds);
    console.log(`Transaction Result:`, result);

    const attributes = result.events[1].attributes;

    const taskId = attributes[1].value;

    console.log(`Task ID:`, taskId);

    const task = await client.queryContractSmart(contractAddress, {
        task_status:{
            id: taskId
        }
    });
    
    // I want to query the contract until the task is completed or is passed 20 seconds

    //when task is completed (i.g. task.result!- null, stop the interval)

    let word = "";

    let isCompleted = false;
    const interval = setInterval(async () => {
        const task = await client.queryContractSmart(contractAddress, {
            task:{
                id: taskId
            }
        });

        console.log(`Task status:`, task);

        if(task.result != null){
            isCompleted = true;
            word = task.result.word;
            clearInterval(interval);
        }
    }, 1000);

    setTimeout(() => {
        clearInterval(interval);
    }, 20000);

    while(!isCompleted){
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return word;
}
