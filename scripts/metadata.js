/**
 * node scripts/fetchMetadata.js
 * Fetch all 10,000 chubbies from CID: QmXDvsnPyo9iPQHv7KtoDzjp57FMTi7cvkFFuWUApY8kro
 * modify metadata for chubbies uprising
 * store and return a new CID - localhost
 * Steps:
 *  - start local ipfs daemon
 *  - run this script
 *  - pin the final CID to a gateway for persistence
 */

const path = require("path");
const fs = require("fs");
const { create } = require("ipfs-http-client");
const ipfs = create(process.env.IPFS_LOCAL_ENDPOINT);

const uint8ArrayToString = require("uint8arrays/to-string");
const uint8ArrayConcat = require("uint8arrays/concat");

const metadataPath = path.join(__dirname, "data", "metadata");
const errorPath = path.join(__dirname, "data", "errors");

const storeJson = async (json, path) => {
	try {
		fs.writeFileSync(path, JSON.stringify(json), { flag: "w" });
	} catch (err) {
		console.error(err);
	}
};

const ChubbiesCID = "QmXDvsnPyo9iPQHv7KtoDzjp57FMTi7cvkFFuWUApY8kro";

const fetch = async () => {
	let errors = { e: [] },
		e = 0,
		c = 0;

	for await (const file of ipfs.get(ChubbiesCID)) {
		console.log(file.type, file.path);
		if (!file.content) continue;
		const content = [];
		for await (const chunk of file.content) {
			content.push(chunk);
		}
		let c_metadata,
			cu_metadata = {},
			decodedData;
		try {
			decodedData = uint8ArrayToString(uint8ArrayConcat(content));
			c_metadata = JSON.parse(decodedData, "");
			cu_metadata = {
				attributes: c_metadata["attributes"],
				image: c_metadata["image"],
				description: "Chubbies have evolved",
				external_url: "https://chubbiesuprising.io",
				name: c_metadata["name"].replace("Chubbies", "Chubbies Uprising"),
			};
			c++;
			let n = file.path.replace(ChubbiesCID, "").replace("/", "");
			try {
				await storeJson(cu_metadata, metadataPath + "/" + n + ".json");
			} catch (err) {
				console.log(err);
			}
		} catch (err) {
			console.log("----\n", err);
			console.log(decodedData);
			e++;
			errors["e"].push(decodedData);
		}
	}
	console.log("errors", e);
	console.log("stored", c);
	await storeJson(errors, errorPath + "/e.json");
	return e;
};
const addAndPin = async () => {
	let files = [];
	for (let i = 0; i < 10000; i++) {
		let filePath = path.join(__dirname, "data", "metadata", i + ".json");
		let content = await fs.readFileSync(filePath);
		files.push({
			path: i,
			content,
		});
	}
	const d = await ipfs.add(files, { wrapWithDirectory: true });
	console.log(d);
};

async function main() {
	let e = await fetch();
	if (e == 0) {
		await addAndPin();
	} else {
		console.log("resolve errors to add files to ipfs");
	}
}

main();
