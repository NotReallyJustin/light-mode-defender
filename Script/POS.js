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
	let txt = Helper.cleanseContractions(sentence);
	txt = Helper.fixSpaces(txt);

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

// ⭐ Chunk the items

/**
 * Chunks the already POS tagged items into noun/verb/adj... etc phrases. See README.md on how this works.
 * @param {RegExp[]} chunkArr An array of regular expressions to match the chunk strings. Start from the most advanced query first
 * @param {String} posWord What you want to label the finished chunk as (ie. if I put "VERB", this will be labeled a "VERB PHRASE")
 * @param {[String[], String[]]} posTaggedWords Array of words, in [word, POS] format, obtained by running this.calculate
 * @returns An 3D array that contains 2D arrays of the POS chunk you specified - the words in the POS chunk will still be in their original 1D array, just modified a bit to add the word index
 */
const chunkItem = (chunkArr, posWord, posTaggedWords) => {
	let np = [];
	let positions = new Map();
	var wordNumber = 0; //ie. Word #0, word #1, word #2, word #3...

	//Convert the POS tagged words into a POS String that we can run RegExp on
	//Note: The POS string just looks something like "NOUN VERB PRONOUN VERB"
	let posStr = posTaggedWords.reduce((cumL, curr) => {
		//Before we start: note that there is no difference between the nth POS and the nth word because POS and Words are 1-1
		//When we convert, jot the POS' starting indexes (denoted by cumL.length) in positions map. This map mainly tracks starting indexes of all POS in the sentence
		//The map value will be used to determine whether a group of words has already been denoted as a phrase to stop overlap
		//Basically, chartLength --> {occupied, wordNumber}
		positions.set(cumL.length, {occupied: false, wordNumber: wordNumber++});
		return `${cumL} ${curr[1]}`;
	}, "").trim() + " ";

	// console.log(positions.keys())
	// console.log(posTaggedWords)
	
	//Loop through all Regex queries. If any matches, it's a Noun/Verb/Adj/etc phrase
	for (var regEx of chunkArr)
	{
		var matchArr = posStr.match(regEx);
		if (matchArr == null) continue; //If no regexp match, move on

		//If there are matches, loop through them all.
		for (var matchRes of matchArr)
		{	
			//Loop through all the match indexes. Adjust is there as a variable so indexOf can detect the next match after we're done with an earlier match
			//Idx should be the starting index of the REGEX match
			for (var adjust = 0, idx = posStr.indexOf(matchRes, adjust); idx != -1 && idx < posStr.length; idx = posStr.indexOf(matchRes, adjust))
			{
				var grab = positions.get(idx); //Grab the starting index on the positions map to access juicy data about the words in the group
				if (grab == undefined || grab.occupied) //oop if the words are already occupied (aka already grouped) do nothing
				{
					adjust = idx + 1;
				}
				else //If the words aren't grouped yet
				{
					let npEntry = []; //Creates an array ready to hold all the noun phrases

					let initialCdx = 0; //First string index of the current REGEX phrase match

					//For each word in the sentence, take note of their starting indexes bois because we're about to do some trolling
					for (var startIdxWord of positions.keys())
					{
						//If the starting index of the is within the index bounds of the REGEX match
						if (+startIdxWord >= idx && +startIdxWord < idx + matchRes.length)
						{		
							var currentWord = positions.get(startIdxWord);

							//Set it to occupied and add their current word to the npEntry because it's a match bois
							currentWord.occupied = true;
							npEntry.push([...posTaggedWords[currentWord.wordNumber], currentWord.wordNumber, posWord]);

							//If npEntry.length == 1, the first word in the npEntry has been added. This means that's the first index of the REGEX match phrase. Jot it down.
							if (npEntry.length == 1)
							{
								initialCdx = startIdxWord;
							}
						}
					}

					//We're doing like an insertion sort - go to the array of noun phrases and insertion sort it by the initialCdx
					//We're going to use a empty string placeholder until we can actually chuck npEntry in because moving references is crazy
					np.push("");
					for (var c = np.length - 1; c >= 0; c--)
					{
						//np[c - 1][0][2] gives us the cdx of the first item in the np chunk
						if (c - 1 >= 0 && np[c - 1][0][2] > initialCdx)
						{
							var curr = np[c];
							np[c] = np[c - 1];
							np[c - 1] = curr;
						}
						else
						{
							np[c] = npEntry;
							break;
						}
					}
					break;
				}
			}
		}
	}
	return np;
}
module.exports.chunkItem = chunkItem;

/*
Noun chunk, but we just used partial application on that
ie. The weird Miku Cult that laundered money got disbanded
This triggers both <ADJ> <PNOUN> <NOUN> <SCONJ> <VERB> <NOUN> and <ADJ> <PNOUN> <NOUN>, but the former takes precedence
@param posTaggedWords - array of stuff that went through the POS tagger chronologically. This param will not be changed
For the regEx arrays -->
0) Annoying, angry cat that has been scratching, ripping, and tearing my new couch
0) The cute, adorable, and chonky seal, cat, and sad frog that jumped, slowly climbed, and quietly, stealthily, and carefully walked on the soft, concrete, and wet grass, dirt path, and bridge
0) Heathenous dark mode user that shames and attacks light mode users
0) Spicy, hot sauce I ate today --> There *should* be a not but we all know Discord users don't talk like this
0) Turtle Bot that likes to meme on moderators, be annoying, and waste precious bot slots
0) The mode that Justin does not use
1) Random yellow cat
1) Random cat, chonky seal, and cute sandwich
*/
const chunkNoun = chunkItem.bind(null, [
	/(((PART )*DETERMINER |PUNCTUATION CONJUNCTION |DETERMINER |PUNCTUATION |CONJUNCTION )*(ADJECTIVE |ADJECTIVE PUNCTUATION |CONJUNCTION ADJECTIVE )*(\bNOUN |PNOUN |PRONOUN ))+((SCONJ AUX |SCONJ IS |SCONJ AUX IS |(SCONJ )?PRONOUN |(SCONJ )?\bNOUN |(SCONJ )?PNOUN |SCONJ )+((AUX PART |PART )?(ADVERB |ADVERB PUNCTUATION |ADVERB CONJUNCTION |ADVERB PUNCTUATION CONJUNCTION )*(\bVERB PUNCTUATION CONJUNCTION |\bVERB PUNCTUATION |\bVERB CONJUNCTION |\bVERB )((PUNCTUATION |CONJUNCTION )*(DETERMINER |PRONOUN |ADPOSITION )*(ADJECTIVE |ADJECTIVE PUNCTUATION |CONJUNCTION ADJECTIVE )*(\bNOUN |PNOUN |PRONOUN |PNOUN ))*)+)+/gmi,
	/(((PART )*DETERMINER |PUNCTUATION CONJUNCTION |CONJUNCTION |PUNCTUATION )*(ADJECTIVE |ADJECTIVE PUNCTUATION |CONJUNCTION ADJECTIVE )*(NOUN |PNOUN |PRONOUN ))+/gmi
], "NOUN");

/*
Takes precedence over NPs in comparison phrases but not adj phrases, basically also a partial application of chunkItem
So "you look more like a dog than I do" > "dogs
@param posTaggedWords - array of things that went through POS tagger
@post param will not be changed
Chunks comparisons, but ig it also chunks adjectives later down the hierarchy line
regEx target examples --> 
0) Is nicer toward 
0) Is better than
0) Is less complicated than
0) Is way less dangerous compared to
0) Is drastically more important because
0) Was way worse compared with
1) Is nicer towards
1) Is better for blinding
1) Is better used for eating
*/
const chunkComp = chunkItem.bind(null, [
	/(PART |AUX |IS )*COMPARISON ((.?)SCONJ |(.?)VERB-COMP )/gmi,
	/(PART |AUX |IS )*COMPARISON (ADPOSITION VERB |VERB ADPOSITION VERB )*/gmi,
], "COMPARISON");

/*
0) Looks really cute, extremely happy, and really energetic
0) Has been extremely friendly
0) Is extremely chonky
0) Is not chonky
*/
const chunkAdj = chunkItem.bind(null, [
	/((?<!^)AUX |(?<!^)IS |(?<!^)PART )+((ADVERB |VERB )*ADJECTIVE PUNCTUATION |(ADVERB |VERB )*ADJECTIVE CONJUNCTION |(ADVERB |VERB )*CONJUNCTION ADJECTIVE |(ADVERB |VERB |PART )*ADJECTIVE )+/gmi
], "ADJECTIVE");

/*
0) Wants desperately to be partying
0) Savagely, brutally, and angrily punched
1) Has attacked
1) Has viciously, aggressively, and painfully attacked
1) Will be granted
1) Would have been freed
1) To be seen
1) To see
*/
const chunkVerb = chunkItem.bind(null, [
	/(AUX IS |AUX |PART IS |PART )*(ADVERB |PUNCTUATION CONJUNCTION ADVERB |PUNCTUATION ADVERB )*(IS |PART IS )?(\bVERB\b |PUNCTUATION CONJUNCTION \bVERB\b |PUNCTUATION \bVERB\b )+/gmi,
	/(AUX |AUX IS |PART IS |PART )*(ADVERB |PUNCTUATION ADVERB |(PUNCTUATION )?CONJUNCTION ADVERB )*\bVERB\b/gmi
], "VERB");

/**
 * Completely chunks the given sentence, given in POS tagged format ([ [word, POS] ]), and returns all matching chunks in sequential order
 * Anything that does not belong to a chunk remains as in [word, POS, index] instead in their respective chunks
 * @param {Function[]} toChunk An array of chunkItem functions to run on the posSorted sentence. Earlier indexes here take precedence if things overlap
 * @param {[String[], String[]]} posTaggedWords Array of words, in [word, POS] format, obtained by running this.calculate
 * @return An array that contains all chunks and individual words (if not chunked) in sequential format
 */
module.exports.chunkMultiple = (toChunk, posSorted) => {
	//Get all the POS phrases (noun phrase, etc) and store them here.
	const chunkResults = toChunk.map(func => func(posSorted));
	const toRet = [];

	//Tracks current word number so we don't have to iterate through every word when a POS phrase stretches for X words
	var currentWordNumber = 0;

	//For every word (takes into account we sometimes add like 50 to the currentWordNumber)
	for (var wordNumber = 0; wordNumber < posSorted.length; wordNumber++)
	{
		if (wordNumber < currentWordNumber) //If we already put the POS chunk containing a higher wordNumber in, then there's no point in still trying to find POSChunks with matching word numbers
		{
			continue;
		}

		//Loop through every POS chunk function 
		for (var chunk in chunkResults)
		{
			// console.log(chunk)
			// console.log(chunkResults[chunk])
			// console.log("----------")
			//Look through every POS chunk the function gave. 
			for (var posChunkIdx = 0; posChunkIdx < chunkResults[chunk].length; posChunkIdx++)
			{
				const currentPOSChunk = chunkResults[chunk][posChunkIdx];
				//If the first index of the currentPOSChunk is equal to the word number, add it to the sequential format we're returning. If not, that's a future iteration problem.
				if (currentPOSChunk[0][2] == currentWordNumber)
				{
					toRet.push(currentPOSChunk);
					currentWordNumber = currentPOSChunk[currentPOSChunk.length - 1][2] + 1;

					//Remove it from chunkResults so we don't iterate on this in the future again
					chunkResults[chunk].splice(posChunkIdx, 1);
					posChunkIdx--;

					break;
				}
				else if (currentPOSChunk[0][2] > currentWordNumber) //If it's greater, great nothing else will match. Skip it
				{
					break;
				}
				else //If wordNumber is < currentWordNumber, then something overlapped. In this case, the thing is useless.
				{
					chunkResults[chunk].splice(posChunkIdx, 1);
					posChunkIdx--;
				}
			}
		}

		//In the end after going thru all chunks, if the currentWordNumber didn't change, that means no POSChunk that includes the current index has been added
		//In that case, just chuck it in
		if (currentWordNumber == wordNumber)
		{
			toRet.push(posSorted[wordNumber].concat(wordNumber));
			currentWordNumber++;
		}
	}

	return toRet;
}

/**
 * Completely chunks the current sentence provided in order of comparisons, nouns, adjectives, and verbs (sequentially)
 * Anything that's not chunked gets chucked in the return array in POS format.
 * @return An array that contains all chunks and individual words (if not chunked) in sequential format
 */
module.exports.chunkSentence = this.chunkMultiple.bind(null, [
	chunkComp, chunkNoun, chunkAdj, chunkVerb
])

// (async () => {
// 	console.log(chunkNoun((await this.calculate)("If you're feeling like you need a little bit of company you might be in for a ride.")));
// })();