/*
    Le helper functions go here
*/

/**
 * Your run off the mill binary search
 * @param {Object[]} arr The array you're searching from
 * @param {Object} item Anything you're searching for
 * @returns The index of the item in the array. Returns -1 if not found.
 */
module.exports.binarySearch = (arr, item) => {
    var found = -1;
    for (var left = 0, right = arr.length, middle = Math.floor(arr.length / 2); left <= right; middle = Math.floor((left + right) /2))
    {
        if (arr[middle] < item)
        {
            left = middle + 1;
        }
        else if (arr[middle] > item)
        {
            right = middle - 1;
        }
        else if (arr[middle] == item)
        {
            found = middle;
            break;
        }
    }
    return found;
};

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

//Adapted version of kuwamoto's pluralize algorithm
String.plural = {
    '(quiz)$'               : "$1zes",
    '^(ox)$'                : "$1en",
    '([m|l])ouse$'          : "$1ice",
    '(matr|vert|ind)ix|ex$' : "$1ices",
    '(x|ch|ss|sh)$'         : "$1es",
    '([^aeiouy]|qu)y$'      : "$1ies",
    '(hive)$'               : "$1s",
    '(?:([^f])fe|([lr])f)$' : "$1$2ves",
    '(shea|lea|loa|thie)f$' : "$1ves",
    'sis$'                  : "ses",
    '([ti])um$'             : "$1a",
    '(tomat|potat|ech|her|vet)o$': "$1oes",
    '(bu)s$'                : "$1ses",
    '(alias)$'              : "$1es",
    '(octop)us$'            : "$1i",
    '(ax|test)is$'          : "$1es",
    '(us)$'                 : "$1es",
    '([^s]+)$'              : "$1s"
};

String.singular = {
    '(quiz)zes$'             : "$1",
    '(matr)ices$'            : "$1ix",
    '(vert|ind)ices$'        : "$1ex",
    '^(ox)en$'               : "$1",
    '(alias)es$'             : "$1",
    '(octop|vir)i$'          : "$1us",
    '(cris|ax|test)es$'      : "$1is",
    '(shoe)s$'               : "$1",
    '(o)es$'                 : "$1",
    '(bus)es$'               : "$1",
    '([m|l])ice$'            : "$1ouse",
    '(x|ch|ss|sh)es$'        : "$1",
    '(m)ovies$'              : "$1ovie",
    '(s)eries$'              : "$1eries",
    '([^aeiouy]|qu)ies$'     : "$1y",
    '([lr])ves$'             : "$1f",
    '(tive)s$'               : "$1",
    '(hive)s$'               : "$1",
    '(li|wi|kni)ves$'        : "$1fe",
    '(shea|loa|lea|thie)ves$': "$1f",
    '(^analy)ses$'           : "$1sis",
    '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$': "$1$2sis",        
    '([ti])a$'               : "$1um",
    '(n)ews$'                : "$1ews",
    '(h|bl)ouses$'           : "$1ouse",
    '(corpse)s$'             : "$1",
    '(us)es$'                : "$1",
    's$'                     : ""
};

String.uncountable = ['furniture', 'information', 'knowledge', 'jewelry', 'homework', 'marketing', 'livestock', 'education', 'courage', 'bravery', 'luck', 'cowardice', 'greed', 'clarity', 'honesty', 'evidence', 'insurance', 'butter', 'love', 'news', 'curiosity', 'satisfaction', 'work', 'mud', 'weather', 'racism', 'sexism', 'patriotism', 'chaos', 'scenery', 'help', 'advice', 'water', 'fun', 'wisdom', 'silence', 'sugar', 'coal', 'money', 'spelling'];
module.exports.uncountable = String.uncountable;

String.irregularPlurals = require("../Data/irregularPlurals.json");

/**
 * Does a binary search to find the singular/plural form of the irregular plural noun. Anyways, don't touch this function unless it's in pluralize
 * @param {String} item Word you're finding
 * @param {Boolean} revert Set to true if you want plural --> singular. By default, it's false. 
 * @returns Empty string if there's no match. If there is, return the singular/plural form of the irregular plural noun
 */
const searchIrregular = (item, revert) => {
    item = item.toLowerCase();

    const arr = revert ? Object.values(String.irregularPlurals) : Object.keys(String.irregularPlurals); //The before
    const toTransformInto = revert ? Object.keys(String.irregularPlurals) : Object.values(String.irregularPlurals); //The after

    var found = this.binarySearch(arr, item);

    if (found == -1)
    {
        return "";
    }
    
    return toTransformInto[found];
}

/**
 * Either makes a singular word plural or plural word singular.
 * @param {String} word The word to pluralize or singularize
 * @param {Boolean} revert Do you want to plural --> singular. By default, it's false 
 * @returns Welp kinda self explanatory.
 */
module.exports.pluralize = (word, revert=false) => {
    word = word.toLowerCase();

    if (/\W/gmi.test(word))
    {
        console.error("Pluralize only works for one word");
        return "";  
    }

    //If the word is uncountable, just return it as default.
    if (String.uncountable.indexOf(word) != -1)
    {
        return word;
    }

    //if the word has an irregular plural, return that irregular plural
    var irregularPlural = searchIrregular(word, revert);
    if (irregularPlural) return irregularPlural;
    
    //Now, apply the pluralize/singularize rules. Depending on revert, we apply different transformation rules.
    const transformation = revert ? String.singular : String.plural;

    for (var regExpString in transformation)
    {
        var pattern = new RegExp(regExpString, "i");
        if (pattern.test(word)) return word.replace(pattern, transformation[regExpString]);
    }

    //Last resort, return word
    return word;
}