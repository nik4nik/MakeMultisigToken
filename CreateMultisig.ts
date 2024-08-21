import "dotenv/config";
import {
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	clusterApiUrl,
	PublicKey,
} from '@solana/web3.js';
import {
	createMultisig,
	createMint,
	mintTo,
	getOrCreateAssociatedTokenAccount,
	getMint,
} from '@solana/spl-token';
import { airdropIfRequired } from "@solana-developers/helpers";

function getKeyPair(n) {
	let key = process.env["SECRET_KEY" + n];
	if (key !== undefined)
		return Keypair.fromSecretKey(
			Uint8Array.from(
				JSON.parse(key)));
	console.log(`Add SECRET_KEY${n} to .env!`);
	process.exit(1);
}

const payer = getKeyPair(1);
const signer1 = getKeyPair(2);
const signer2 = getKeyPair(3);
const signer3 = getKeyPair(4);
console.log(`Public key1: ${payer.publicKey.toBase58()}`); // has 1 Sol
console.log(`Public key2: ${signer1.publicKey.toBase58()}`); // has 1 Sol
console.log(`Public key3: ${signer2.publicKey.toBase58()}`);
console.log(`Public key4: ${signer3.publicKey.toBase58()}`);

/*
1 public key: 3iFG8xmzDEoQVWR87oT7h8HpBoKU7NxqRpypxAUp1UbT
2 public key: EN45ovcds8TjVCazhsH3ZSGazHDL4nLQJdpz6nzT2WnR
3 public key: GRqNd3rUtZYEn1YNT3P92bxaNFBoMs8M9JkmWbeHhadf
4 public key: HfQkjaLVpCriqGgpmM2xyBrEzBYKA5mfiSRkvY7b9N3Y
*/

const connection = new Connection(clusterApiUrl("devnet"));

// Airdrop SOL to the payer to cover transaction fees and
// to the signers if needed (for rent exemption)

// Create the multisig account with a 2/3 threshold
const multisigKey = await createMultisig(
  connection,
  payer,
  [
	signer1.publicKey,
	signer2.publicKey,
	signer3.publicKey,
  ],
  2 // Threshold for multisig
);

console.log(`Created 2/3 multisig ${multisigKey.toBase58()}`);


// Create the mint with the multisig as both the mint and freeze authority
const mint = await createMint(
  connection,
  payer,
  multisigKey,
  multisigKey,
  9 // Decimal places
);
console.log(`Mint public key is: `, mint.toBase58());


// Create an associated token account for signer1
const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  signer1.publicKey
);
console.log(`associatedTokenAccount public key is: `, associatedTokenAccount);

// Mint the token with sufficient signatures (signer1 and signer2)
await mintTo(
  connection,
  payer,
  mint,
  associatedTokenAccount.address,
  multisigKey,
  1, // Amount to mint
  [
	signer1,
	signer2, // Required signers
  ]
);

// Retrieve and log the mint information
const mintInfo = await getMint(connection, mint);
console.log(`Minted ${mintInfo.supply} token`);

// Expected output: Minted 1 token

// await airdropIfRequired(
  // connection,
  // associatedTokenAccount.publicKey,
  // 5 * LAMPORTS_PER_SOL,
  // 10 * LAMPORTS_PER_SOL
// );

// try {
//	Attempt to mint 1 token without the required number of signatures
  // await mintTo(
	// connection,
	// payer,
	// mint,
	// associatedTokenAccount.address,
	// multisigKey,
	// 1 // Amount to mint
  // );
// } catch (error) {
  // console.error(error);
//	Expected: Error: Signature verification failed
// }
