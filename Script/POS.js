const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Helper = require("./Helper");

// ⭐ Whenever script is initiated, read the training data file

/**
 * Reads POSData.txt and jots down the data.
 * @return the transmission and emission probabilities in an array. See below for that they do
 */
const readPOSData = () => new Promise(function (resolve, reject) {

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

	let leScan = readline.createInterface({
		input: fs.createReadStream(path.resolve(__dirname,'../Training Data/PosData.txt')),
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
			probWordPOS.get(line.substring(0, line.indexOf("\t")).toUpperCase()).addProb(line.substring(line.indexOf("\t") + 1));
			emissionPOS.get(line.substring(line.indexOf("\t") + 1).toUpperCase()).addProb(lastPOS);

			lastPOS = line.substring(line.indexOf("\t") + 1).toUpperCase();
		}
	});

	leScan.on("close", () => {
		//POSRead = true;
		leScan.removeAllListeners();
		resolve([probWordPOS, emissionPOS]);
	})
});
module.exports.readPOSData = readPOSData;

// ⭐ Calculate the probability

//Use these as a temporary substitute against new words
const standardKeys = {
	NOUN: null,
	VERB: null,
	PNOUN: null,
	ADJECTIVE: null,
	ADVERB: null,
	DETERMINER: null,
	AUX: null, 
	PNOUN: null,
	NUMBER: null,
	ADPOSITION: null,
	SCONJ: null,
	CONJUNCTION: null,
	IS: null,
	COMPARISON: null,
	PUNCTUATION: null,
	PUNCTUATIONEND: null
};

/**
 * Given an emission and transmission probability table, calculate the POS of every word in the sentence
 * @param {Helper.AutoMap} probWordPOS Automap that contains all transmission probabilities of a word being a certain POS in a `Helper.CountingTable`
 * @param {Helper.AutoMap} emissionPOS Automap that contains all emission probabilities of a word being a certain POS in a `Helper.CountingTable`
 * @param {Boolean} showProbability Set to false, whether to return the probability of the current sentence being HMM'd on. Usually used for testing
 * @return An array, in [ [word, POS], [word, POS] ] format. If showProbability is true, this returns it in {prob: <float for probability>, pos: [ [word, POS], [word, POS] ]}
 */
module.exports.calcPOS = (probWordPOS, emissionPOS, sentence, showProbability=false) => {
	let txt = Helper.fixSpaces(sentence);
	txt = Helper.cleanseContractions(txt);

	//Set of the states off all words. The first entry here is states for <START>. Which is just 100% chance it's a "SPACE"
	let allStates = [
		[{probs: 1, record: [], pos: "SPACE"}]
	]; 

	//Each "word" is a set of state charts - so VTB this. i == state #, starting from 0
	txt.split(" ").forEach((word, i) => {
		word = word.toUpperCase();
		var currentStates = [];

		//If done properly, this should equal smth like {total: 5; noun: 3; verb: 2}
		//We don't need to worry about nodes that have a value of 0 in them as they're non-existant in the CountingTable class
		var wordPOSCountingTable = probWordPOS.get(word);

		//If word undefined, just assume it doesn't matter later down the line and give it a value of 1 to not mess with calculation
		var entryNoExist = wordPOSCountingTable.total == 0;
		if (entryNoExist) wordPOSCountingTable = standardKeys;

		//For each node in the current state (the word)
		//The key here should now be NOUN, PRONOUN, etc.
		Object.keys(wordPOSCountingTable).forEach(node => {
			//If there is no entry in the counting table on the word, the transmissionProb that it's a NOUN, PRONOUN, etc. should all be set to 1 to not mess with anything.
			var transmissionProb = entryNoExist ? 1 : wordPOSCountingTable.calcProb(node);

			//If key is total or prob is 0, skip it. Else, do README.md's viterbi's alg apparently exists step 2
			if (node != "total" && transmissionProb != 0) 
			{
				var maxProb = -1;
				var record = []; //Record tracks the POS of the current word and previous words in the chain

				//Since i is already 1 index behind allStates due to how allStates have 1 initial entry, we just use allStates[i] instead of allStates[i - 1]
				allStates[i].forEach(nodeInLastState => {
					var probabilityCurrentNode = nodeInLastState.probs * transmissionProb * emissionPOS.get(node).calcProb(nodeInLastState.pos);

					if (probabilityCurrentNode > maxProb)
					{
						maxProb = probabilityCurrentNode;
						record = nodeInLastState.record.concat(node);
					}
				});

				currentStates.push({probs: maxProb, record: record, pos: node}); //Construct a node graph with this node's POS
			}
		});

		allStates.push(currentStates);
		allStates[i] = null; //We don't need the last word's states anymore as we're done using them
	});

	//We now finished finding all the state probabilities of the last word. Find the most probable state (node with max prob) and get their record.
	let maxProbNode;
	allStates[allStates.length - 1].forEach(node => {
		if (!maxProbNode || node.probs > maxProbNode.probs)
		{
			maxProbNode = node;
		}
	});

	//The node with max prob has a record attribute that holds all NOUN, VERB, etc. Now match it to all the words.
	let toRet = txt.split(" ").map((word, i) => [word, maxProbNode.record[i]]);
	
	return showProbability ? {prob: maxProbNode.probs, pos: toRet} : toRet;
}

/**
 * Uses POSData.txt to calculate POS instead.
 * When you require this, make sure to use `const { calculate } = await require("./POS");`
 */
module.exports.calculate = (async () => {
	const [probWordPOS, emissionPOS] = await this.readPOSData();
	return this.calcPOS.bind(null, probWordPOS, emissionPOS);
})();

// (async () => {
// 	(await this.calculate)("a")
// })();

//For chunk, here's how it goes: convert words to POS string, use regex on the POS string, find index of matches (if not occupied) and map them to word string