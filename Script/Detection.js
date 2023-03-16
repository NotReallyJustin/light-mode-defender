/*
We call this file the detection file. It's kinda named that way because the items in the lists here just keeps on growing.
We detect negations and whether or not any phrases mention light mode.
*/

const negations = require("../Data/negations.json");
const { Relation } = require("./RelationExtraction");

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