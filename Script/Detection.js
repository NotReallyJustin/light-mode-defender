/*
We call this file the detection file. It's kinda named that way because the items in the lists here just keeps on growing.
We detect negations and whether or not any phrases mention light mode.
*/

const negations = require("../Data/negations.json");
const { Relation } = require("./RelationExtraction");
const { SimpleMap } = require("./Helper.js");
const { lemmatize } = require("./Lemmatize.js");
const afinn = require("../Data/afinn165.json");

/**
 * Tests negations inside a certain chunk. 
 * First it strips everything down to its basic chunks
 * Then it looks for CONJUNCTION tags and scouts for NOT
 * ie. The book that Justin did not rip apart and eat
 * 										      ^^^ and detected, distribute the not
 * The book that Justin did NOT rip apart and not eat --> Not is counted once here
 * Targets adj, verb, and adv
 * Things like since and because won't trigger CONJUNCTION because we already flagged it as SCONJ
 * @param {Relation} chunk A relation, preferably `chunk.isChunk == true`. Quite literally.
 * @returns {Boolean} A boolean representing whether or not something is a negation
 */
module.exports.testNegations = (chunk) => {
    let numAdj = chunk.countChildren("ADJECTIVE");

    //Loop to find numNegation
    let numNegation = 0;

    chunk.children.forEach(child => {
        if (negations[child.toString()])
        {
            numNegation++;
        }
    });

    //Adjust for adjectives
    numNegation = Math.max(1, numNegation - numAdj + 1);

    return numNegation % 2 == 1;
}

// ------------------ These are pasted for "mode detection". Fix these later. -----------------
const modeWords = new SimpleMap([
	"mode",
	"theme",
	"color",
	"style",
    "font"
]);

const lightMode = new SimpleMap([
	"light",
	"white",
	"bright",
]);

const darkMode = new SimpleMap([
	"amoled",
	"dark",
	"black",
	"default",
    "grey"
]);

const justinRelLight = {
	"justin": new SimpleMap(["use", "have", "look", "see", "set"]),
	"seal": new SimpleMap(["use", "have", "look", "see", "set"])
};

const justinRelDark = {
	"justin": new SimpleMap(["hate", "vomit", "dislke"]),
	"seal": new SimpleMap(["hate", "vomit", "dislke"])
};

/**
 * Tests whether a chunk is referring to a light or dark mode.
 * This also jots the determined result down so it won't have to calculate it in the future
 * AMOLED isn't a bad theme so it doesn't do anything with that
 * Precondition: You should really only use this on a NP
 * @param {Relation} chunk A relation, preferably `chunk.isChunk == true`. Quite literally.
 * @return {String} code: "light", "dark", "none" - each representing what mode this NP is talking about
 */
module.exports.testContainMode = (chunk) => {
    //If we by some magic have already evaluated the mode type, just return it.
    if (chunk.modeType)
    {
        return chunk.modeType;
    }

    let negated = this.testNegations(chunk);
    let overriddenLoop;              //Whether or not we have overridden the results. If this has something, we've overridden the total mode of the chunk

    //Determinant variables for whether something contains mode
    let mentionMode = false;            // Whether "mode" is mentioned
    let mentionLight = false;
    let mentionDark = false;

    // Loop through each word in the NP
    for (var word in chunk)
    {
        //If it's a pronoun and refers to a subject, just use the mode type. End everything right there.
		if (word.pos == "PRONOUN" && word.subject)
		{
			let stacko = testContainMode(word.subject);
			if (stacko != "none") overriddenLoop = stacko;
			break;
		}

        let lemmatizedWord = lemmatize(word.toString(), word.pos);

        if (word.pos == "NOUN" || word.pos == "PNOUN")
		{
			if (modeWords[lemmatizedWord]) mentionMode = true;
		}
        else if (word.pos == "ADJECTIVE")
        {
            if (lightMode[lemmatizedWord]) mentionLight = true;
			if (darkMode[lemmatizedWord]) mentionDark = true;
        }
        else if (word.pos == "VERB")
        {
            //(Experimental) If the word is a verb, check to see if Justin's name is in its subject, and whether or not the verb is something like "justin hates." 
            //If it is, mentionsLight/mentionsDark

            let subject = word.subject.toString();

            if (justinRelLight[subject])                    // If any word like "Justin" pops up
			{
				if (justinRelLight[subject][lemmatizedWord]) //ie. The theme that Justin uses  --> Given context here, refers to light mode
				{
					mentionLight = true;
				}
				else if (justinRelDark[subject][lemmatizedWord])
				{
					mentionDark = true;
				}
				else if (afinn[lemmatizedWord])             //Logic is that if Justin thinks positively of something and you mention mode, it's going to be light mode             
				{
					if (afinn[lemmatizedWord] > 0)
					{
						mentionLight = true;
					}
					else
					{
						mentionDark = true;                 //Conversely if he doesn't, it's going to be dark mode
					}
				}
			}
        }
    }

    // If we overrode a loop...
    if (overriddenLoop)
	{
		if (overriddenLoop == "light")
		{
			chunk.modeType = !negated ? "light" : "dark";
			return chunk.modeType;
		}
		else if (overriddenLoop == "dark")
		{
			chunk.modeType = !negated ? "dark" : "light";
			return chunk.modeType;
		}
		return "none"; //Just in case
	}
    else        //Else, use the mode + faction equation to determine modeType
    {
        var faction = "none";
        if (mentionMode)
        {
            if (mentionLight)
            {
                faction = !negated ? "light" : "dark";
            }
            else if (mentionDark)
            {
                faction = !negated ? "dark" : "light";
            }
        }

        chunk.modeType = faction;
        return faction;
    }
}