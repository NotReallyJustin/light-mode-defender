const pronounData = require("../Data/pronounData.json");
const { Relation } = require("./RelationExtraction");
const Helpy = require("./Helper");
const NameGender = require("./NameGender");

/**
 * Singular synonym for guys
 */
const male = [
    "man",
    "guy",
    "dude",
    "bloke",
    "boy",
    "male",
    "fella",
    "fellow",
    "gent",
    "husband",
    "boyfriend",
    "groom",
    "mister",
    "buddy",
    "sir",
    "he",
    "himself",
    "his",
    "lad"
];

/**
 * Singular synonym for females
 */
const female = [
    "lady",
    "woman",
    "madame",
    "girl",
    "wife",
    "girlfriend",
    "miss",
    "madam",
    "she",
    "her",
    "herself"
];

/**
 * Determine whether a pronoun node could be grammatically linked to an antecedent node.
 * @param {Relation} pronoun A pronoun relation node
 * @param {Relation} antecedent A noun phrase relation node that could potentially be an antecedent
 * @return A boolean on whether or not a pronoun could grammatically be linked to an antecedent.
 */
const proposeAntecedent = (pronoun, antecedent) => {
    let pronounStr = pronoun.toString();

    const nouns = antecedent.findNoun();
    const pronounInfo = pronounData[pronounStr];

    if (pronounInfo == undefined) return true;

    //Determine number match
    if (nouns.length == 0)
    {
        return false;
    }
    else if (nouns.length >= 2)
    {
        if (!pronounInfo.plural) return false;
    }
    else
    {
        if (Helpy.uncountable.indexOf(nouns[0][0].toString()))
        {
            //We good because it's uncountable
        }
        else if (nouns[0][0].pos == "NOUN") //Only try to pluralize nouns. This is in case we end up with a pronoun or proper noun (name) that can't be fucked with
        {
            var isPlural = Helpy.pluralize(nouns[0][0].toString(), true) != nouns[0][0].toString();
            if (isPlural != pronounInfo.plural) return false;
        }
    }

    //Gender agreement
    if (nouns.length == 1) //Ignore plural, only check if it's 1
    {
        /**
         * Antecedent gender
         */
        var gender;
        if (nouns[0][0].pos == "PNOUN")
        {
            //Determine gender of name

            if (NameGender.scoutBoy(nouns[0][0].toString()))
            {
                gender = "m";
            }
            else if (NameGender.scoutGirl(nouns[0][0].toString()))
            {
                gender = "f";
            }
            else
            {
                gender = "n";
            }

            if (gender != pronounInfo.gender) return false;
        }
        else
        {
            if (male.indexOf(nouns[0][0].toString()) != -1)
            {
                gender = "m";
            }
            else if (female.indexOf(nouns[0][0].toString()) != -1)
            {
                gender = "f";
            }

            if (gender == "m" || gender == "f")
            {
                if (gender != pronounInfo.gender) return false;
            }
        }
    }

    //Reflexive agreement
    if (pronounInfo.reflexive && pronoun.parent.parent != antecedent.parent) return false;

    return true;
}

module.exports.proposeAntecedent = proposeAntecedent;

/**
 * Runs pronoun anaphora via that Hobbs thing. Pronoun.prototype.subject will point to the noun the pronoun refers to, if it exists.
 * This can't be though... hobbs algorithm here looks wayyyyyy too simple.
 * @param {Relation} root The root relation node
 */
const hobbs = (root) => {
    let pronounRef;
    const queue = [root]; //We'll do the DFS by shoving items into this queue

    while (!!queue.length)
    {
        let currentItem = queue.shift();

        //If current item is pronoun, run hobbs
        if (currentItem.pos == "PRONOUN")
        {
            pronounRef = currentItem;

            //Traverse everything in the NP before the pronoun node and propose any antecedents we see
            var foundRef = false; //Track whether or not we found a antecedent reference so we can continue on a new word
            for (var i = pronounRef.parent.children.indexOf(pronounRef); i >= 0; i--)
            {
                if (/\bNOUN\b|\bPNOUN\b/gmi.test(pronounRef.parent.children[i].pos) && proposeAntecedent(pronounRef, pronounRef.parent.children[i]))
                {
                    foundRef = true;
                    pronounRef.subject = pronounRef.parent.children[i];
                    break;
                }
            }

            //If we already found a match, move on to the next pronoun. 
            if (foundRef)
            {
                foundRef = false;
                continue;
            }
            //If we have not, start BFS on pronounRef's parent towards the left of the current pronoun

            const matchQueue = []; //We'll do the BFS hobbs by shoving necessary items in this queue
            let currSentence = pronoun.parent.parent;
            matchQueue.unshift(...currSentence.children.slice(0, currSentence.children.indexOf(pronounRef.parent)).reverse());
            
            while (!!matchQueue.length && currSentence)
            {
                //If we ran out of BFS for the current sentence, go to the previous sentence if it exists. If not, give up.
                if (matchQueue.length == 0)
                {
                    var idxCurrSentence = currSentence.parent.children.indexOf(currSentence);
                    currSentence = idxCurrSentence > 0 ? currSentence.parent.children[idxCurrSentence - 1] : undefined;
                    matchQueue.push(currSentence);

                    //if step 8 actually is useful in the manual, if currSentence == 0, then the next iteration of currSentence should be to the right
                }

                const currentWord = matchQueue.shift();

                if (/\bNOUN\b|\bPNOUN\b/gmi.test(currentWord.pos) && proposeAntecedent(pronounRef, currentWord))
                {
                    //if it's a noun, first thing we do is propose it as antecedent
                    //If it matches, good job! Now exit this hobbs algorithm because it ends.

                    matchQueue.length = 0; //Clears the match queue
                    pronounRef.subject = currentWord;
                    break;
                }

                //If the current word is a chunk but not a noun, see if we can BFS it
                if (currentWord.isChunk) 
                {
                    matchQueue.push(...currentWord.children);
                }
            }
        }
        else
        {
            //If not, keep DFSing until we find a pronoun
            currentItem.children.length && queue.unshift(...currentItem.children);
        }
    }
}