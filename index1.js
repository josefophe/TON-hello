const { TonClient } = require("@tonclient/core");
const { libNode } = require("@tonclient/lib-node");
// ABI and imageBase64 of a binary Hello contract
const contractPackage = require('./HelloContract.js');

// Address of giver on NodeSE
const giverAddress = '0:841288ed3b55d9cdafa806807f02a0ae0c169aa5edfe88a789a6482429756a94';
// Giver ABI on NodeSE
const giverAbi = {
    'ABI version': 1,
    functions: [{
            name: 'constructor',
            inputs: [],
            outputs: []
        }, {
            name: 'sendGrams',
            inputs: [
                { name: 'dest', type: 'address' },
                { name: 'amount', type: 'uint64' }
            ],
            outputs: []
        }],
    events: [],
    data: []
};

// Requesting 1000000000 local test tokens from Node SE giver
async function get_grams_from_giver(client, account) {
    const params = {
        send_events: false,
        message_encode_params: {
            address: giverAddress,
            abi: {
                type: 'Contract',
                value: giverAbi
            },
            call_set: {
                function_name: 'sendGrams',
                input: {
                    dest: account,
                    amount: 10_000_000_000
                }
            },
            signer: { type: 'None' }
        },
    }
    await client.processing.process_message(params)
}


async function main(client) {
    // Define contract ABI in the Application 
    // See more info about ABI type here https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_abi.md#abi
    const abi = {
        type: 'Contract',
        value: contractPackage.abi
    }
    // Generate an ed25519 key pair
    const helloKeys = await client.crypto.generate_random_sign_keys();
    
    // Prepare parameters for deploy message encoding
    // See more info about `encode_message` method parameters here https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_abi.md#encode_message
    const deployOptions = {
        abi,
        deploy_set: {
            tvc: contractPackage.tvcInBase64,
            initial_data: {}
        },
        call_set: {
            function_name: 'constructor',
            input: {}
        },
        signer: {
            type: 'Keys',
            keys: helloKeys
        }
    }

    // Encode deploy message
    // Get future `Hello` contract address from `encode_message` result
    // to sponsor it with tokens before deploy
    const { address } = await client.abi.encode_message(deployOptions);
    console.log(`Future address of the contract will be: ${address}`);

    // Request contract deployment funds form a local TON OS SE giver
    // not suitable for other networks
    await get_grams_from_giver(client, address);
    console.log(`Grams were transfered from giver to ${address}`);

    // Deploy `hello` contract
    // See more info about `process_message` here  
    // https://github.com/tonlabs/TON-SDK/blob/master/docs/mod_processing.md#process_message
    await client.processing.process_message({
        send_events: false,
        message_encode_params: deployOptions
    });

    console.log(`Hello contract was deployed at address: ${address}`);
  
  }

(async () => {
    try {
        // Link the platform-dependable TON-SDK binary with the target Application in Typescript
        // This is a Node.js project, so we link the application with `libNode` binary 
        // from `@tonclient/lib-node` package
        // If you want to use this code on other platforms, such as Web or React-Native,
        // use  `@tonclient/lib-web` and `@tonclient/lib-react-native` packages accordingly
        // (see README in  https://github.com/tonlabs/ton-client-js )
        TonClient.useBinaryLibrary(libNode);
        const client = new TonClient({
            network: { 
                // Local node URL here
                server_address: 'http://localhost'
            }
        });
        console.log("Hello localhost TON!");
        await main(client);
        process.exit(0);
    } catch (error) {
        console.error(error);
    }
})();
