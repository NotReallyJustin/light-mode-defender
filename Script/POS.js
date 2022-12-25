const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Helper = require("./Helper");

// ⭐ Initialize Data tables

/**
 * This takes into account the probability of a word being a certain POS
 * this[word] = {# times this appeared as a noun, # times this appeared as a verb...}
 */
const probWordPOS = new Helper.AutoMap(Helper.CountingTable);

/**
 * This takes into account the probability of a POS coming after a POS
 * this[posName] = {# times this comes after a noun, # times this comes after a verb, # times this comes after an adjective, etc}
 * START == This POS comes when the sentence is starting
 */
const emissionPOS = new Helper.AutoMap(Helper.CountingTable);

/**
 * Tells whether or not POSData.txt is read or not
 */
let POSRead = false;

// ⭐ Whenever script is initiated, read the training data file
const readPOSData = new Promise(function (resolve, reject) {
	let leScan = readline.createInterface({
		input: fs.createReadStream(path.resolve(__dirname,'../Training Data/PosData.txt')),
		output: process.stdout,
		clrfDelay: Infinity,
		terminal: false
	});
	
	let lastPOS = "START";

	leScan.on("line", line => {
		if (line.trim() == "")
		{
			lastPOS = "START"; //If line is empty, treat next sentence as a new sentence
		}
		else
		{
			//Record probWordPOS and emissionPOS
			probWordPOS.get(line.substring(0, line.indexOf("\t"))).addProb(line.substring(line.indexOf("\t") + 1));
			emissionPOS.get(line.substring(line.indexOf("\t") + 1)).addProb(lastPOS);
		}
	});

	leScan.on("close", () => {
		POSRead = true;
		leScan.removeAllListeners();
		resolve();
	})
});

readPOSData();

// ⭐ Calculate the probability
module.exports.calcPOS