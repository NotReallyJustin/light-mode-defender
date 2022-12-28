/*
    Le helper functions go here
*/

module.exports.CountingTable = class {
    /**
        * Class that creates a counting table of all the different occurances of something
        * Then, the table tracks how many total entries there are, and the probability of a probType occuring in admist the total entries
        * All probTypes the counting table counts are stored in JSON attributes
    */
    constructor()
    {
        this.total = 0;
    }

    /**
     * Add 1 to the probType in the counting table
     * @param {String} probType Case sensititve. The item you're counting
     * @param {Number} number The number of probabilities to add if you don't want to add 1
     */
    addProb(probType, number=1)
    {
        if (!this[probType]) this[probType] = 0;
		this[probType] += number;
		this.total += number;
    }

    /**
     * @param {String} probType Case sensititve. The item you're finding the probability of 
     * @returns 0 if the counting table is empty, or the probability of a probType existing amidst the total entries. If no emission entry, return 0.
     */
    calcProb(probType)
    {
        if (!this.total) return 0;
        if (this[probType] == undefined) return 0;
		return this[probType] / this.total;
    }
}

module.exports.AutoMap = class extends Map 
{
    /**
     * Custom made data type - this acts like everything HashMap, but it creates a hashmap slot when you try to grab something that doesn't exist
     * It usually makes more sense to make a function, but Ima probs migrate this to Database.js
     * @param {Class} Blueprint The class to create if the map returns undefined - The constructor will soft-lock the data type of the map though
     */
	constructor(Blueprint){
		super();
		this.Blueprint = Blueprint;
	}

    /**
     * Returns a value stored at the key-pair value. If no value exists, use the Blueprint to make one,
     * @param {*} item The key value you're fetching
     */
	get(item)
	{
		if (super.get(item) == undefined)
		{
			super.set(item, new this.Blueprint());
		}

		return super.get(item);
	}
}

const puncts = `[,.!?:"';<>/=-]`;
/**
 * Ensures spaces between words are done properly (so apple[space][space] doesn't occur)
 * Also ensures punctuations have 1 space padding (so [space],[space]) 
 * @param {String} sentence Sentence to properly space
 */
module.exports.fixSpaces = (sentence) => {
    var toRet = "";
    var track = "";

    for (var i = 0; i < sentence.length; i++)
    {
        if (toRet.length && toRet[toRet.length - 1] == " " && track == "" && sentence[i] == " ") //Prevent double (triple.. etc) space
        {
            continue;
        }
        else if (sentence[i] == " ")
        {
            toRet += track + " ";
            track = "";
        }
        else if (puncts.indexOf(sentence[i]) != -1) //If it's a punctuation
        {
            toRet += track;
            //If there's already a leading space, don't add a leading space in the punctuation
            //Trailing spaces after a punctuation will be dealt with by "prevent double space" case
            toRet += toRet[toRet.length - 1] == " " ? `${sentence[i]} ` : ` ${sentence[i]} `;
            track = "";
        }
        else
        {
            track += sentence[i];
        }
    }

    toRet += track; //Any straggling last items goes into toRet
    return toRet.trim();
}

const contractPatterns = {
    "won't": "would not",
    "can't": "can not",
    "ain't": "am not",
    "n't": " not",
    "'s": "",       //Need a better way of dealing with 's to be honest because it could mean two things
    "'re": " are",
    "'d": " would",
    "'ll": " will",
    "'ve": " have",
    "'m": " am"
};

module.exports.cleanseContractions = (sentence) => {
	for (var pattern of Object.keys(contractPatterns))
	{
		sentence = sentence.replace(new RegExp(pattern, 'gmi'), contractPatterns[pattern]);
	}

	return sentence;
}