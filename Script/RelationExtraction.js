/**
 * A "node-like" structure that tracks POS relationships. <br />
 * Whenever we say node, POS node, relation, or relation node from now on, we mean Relation object <br />
 * Could also just be called a POS node ngl
 * @see https://i.imgur.com/1Sm0f2L.png
 */
class Relation
{
    /**
     * Constructor for relation node. Don't use this unless it's the root node; run this.createChild() instead.
     * @param {String[]} posTag The [[word, POS, wordIndex, chunkType],...] or 2D POS [word, POS] chunk that's represented by the "relation node"
     * @param {Relation} parent The parent of the relation node.
     * @param {String} forcedPOS If entered, this node will be forcibly set to this POS. If not, the POS will be detected via posTag
     */
    constructor(posTag=[], parent=null, forcedPOS)
    {
        this.posTag = posTag;
        this.parent = parent;

        /**
         * The children of this relation. See the imgur.
         * @type {Relation[]}
         */
        this.children = [];

        /**
         * Subject. In the case of an adjective relation, subject is the thing the Rel is describing
         */
        this.subject;
        this.object;

        /**
         * Whether the current node is a 2D POS chunk or not.
         */
        this.isChunk = typeof posTag[0] == "object";

        /**
         * Whether the POS is forcibly overwritten
         */
        this.hasForcedPOS = forcedPOS != undefined;

        /**
         * The POS of the Relation node. This would be the POS of the individual word (if not chunk) or the POS of the POS chunk (if chunk)
         */
        this.pos = forcedPOS ? forcedPOS : (this.isChunk ? posTag[0][3] : posTag[1]);

        /**
         * Later decision down the line, indicating if we want to override this word in Sentiment Analysis calculations
         */
        this.overridden = false;
    }

    /**
     * @return All the text of this node. Basically, ["a", 1] returns "a" and [["a", 1], ["b", 2]] returns "a b". This returns in lowercase.
     */
    toString()
    {
        return this.posTag.length == 0 ? "" : (this.isChunk ? this.posTag.map(x => x[0]).join(" ").toLowerCase().trim() : this.posTag[0].toLowerCase().trim());
    }

    /**
     * 😎 Good job this is the proper way to create a relation! Now you'll save yourself from a fuck ton of headaches.
     * Appends a new child relation to the current relation
     * @param {String[]} posTag The [word, POS, wordIndex] or 3D POS chunk that's represented by the "relation node"
     * @param {String} forcedPOS If entered, this node will be forcibly set to this POS. If not, the POS will be detected via posTag
     * @return {Relation} The newly created child, in case you want to do stuff with it
     */
    createChild(posTag, forcedPOS)
    {
        var newRel = new Relation(posTag, this, forcedPOS);
        this.children.push(newRel);
        return newRel;
    }

    /**
     * If the current item is a chunk, generate child nodes from the 2D POS Arrays ([word, POS]) in the POS chunk.
     * The sequence of the child nodes are preserved.
     */
    generateChildFromChunk()
    {
        if (this.isChunk)
        {
            for (var posArr of this.posTag)
            {
                this.createChild(posArr);
            }
        }
    }

    /**
     * Read: "the node's children has a noun"
     * @param {String} posType The POS type you're looking for
     * @returns Whether any children in the POS chunk has the specified posType. If this doesn't have children, just return false.
     */
    childrenHas(posType)
    {
        if (!this.hasForcedPOS && this.isChunk)
        {
            return this.children.some(twoDPOS => new RegExp(`\\b${posType}\\b`, 'gmi').test(twoDPOS.pos));
        }

        return false;
    }

    /**
     * Read: "count the number of children that has [an ADJECTIVE]"
     * @param {String} posType The POS type you're trying to count
     * @param {boolean} recursive Whether to recursively do this for all child elements of child nodes. False by default
     * @returns Number of child elements that have the POS. If this doesn't have children, just return 0.
     */
    countChildren(posType, recursive=false)
    {
        if (!recursive)
        {
            if (!this.hasForcedPOS && this.isChunk)
            {
                return this.children.filter(twoDPOS => new RegExp(`\\b${posType}\\b`, 'gmi').test(twoDPOS.pos)).length;
            }

            return 0;
        }
        else
        {
            let num = 0;
            let posTypeRegEx = new RegExp(`\\b${posType}\\b`, 'gmi'); //RegExp of the POS to use to clear any case sensitive blah blah blah that comes up

            if (this.children.length != 0)
            {
                this.children.forEach(childElement => {
                    
                    if (posTypeRegEx.test(childElement.pos))
                    {
                        num++;
                    }
                    num += childElement.countChildren(posType, true);
                });
            }

            return num;
        }
    }

    /**
     * Find all nouns in this relation's children.
     * If the POS is forced, return [] because no matter what, you're not going to find an actual noun here
     * @return An 2D array of this relation's child nodes that are noun phrases. The 2D array is only here in case nouns are paired together
     */
    findNoun()
    {
        if (!this.hasForcedPOS && this.isChunk)
        {
            var toRet = [];
            var chain = []; //This exists so something like "John Doe" would be considered one noun

            for (var i = 0; i < this.children.length; i++)
            {
                if (this.children[i].pos == "NOUN" || this.children[i].pos == "PNOUN" || this.children[i].pos == "PRONOUN")
                {
                    chain.push(this.children[i]);
                    if (i + 1 >= this.children.length || this.children[i].pos != this.children[i + 1].pos) //If next word is not also a noun, push chain --> toRet
                    {
                        toRet.push(chain);
                        chain = [];
                    }
                }
            }

            return toRet;
        }
        return [];
    }

    /**
     * Constructs a complete relation tree like the one shown https://i.imgur.com/1Sm0f2L.png from a POS Array that contains chunks and POS [word, POS]
     * @param {(String[] | String[][])} posArr The POS Array that contains chunks and POS [word, POS]
     * @return {Relation} A fully fledged relation tree starting from Root
     */
    static buildFromPOSArr(posArr)
    {
        let root = new Relation(undefined, undefined, "ROOT");

        //Add each sentence as children of the root class
        for (var i = 0, onHold = 0; i < posArr.length; i++)
        {
            if ((posArr[i][1] == "PUNCTUATIONEND" && /\\n|;|\./gmi.test(posArr[i][0])) || i == posArr.length - 1)
            {
                //Find all the POSTags belonging to each sentence and create relation nodes from them (bc they are a sentence)
                let sentence = root.createChild(posArr.slice(onHold, i + 1), "SENTENCE");  

                //For each posTag in the sentence, create a child node. If the child nodes represent chunks, generate the appropriate children for chunk
                //Again, if future justin is ever confused, see https://i.imgur.com/1Sm0f2L.png
                for (var posTag of sentence.posTag)
                {
                    sentence.createChild(posTag).generateChildFromChunk();
                }
                
                onHold = i + 1;
            }
        }

        return root;
    }
}
module.exports.Relation = Relation;

//NOTE: THESE ARE ACTUALLY ALL NODES

/**
 * Implements a "RegExp" POS look ahead for the current level of relation nodes (nodes on the same level)
 * @param {Relation[]} levelNode An array of all relation nodes on the same level
 * @param {String} desiredPOSType Desired POS of relation node you're finding. Use RegExp to find multiple.
 * @param {Boolean} findChunk Whether to look ahead for relation node that are chunks. If false, this will only look for relation nodes that aren't chunks
 * @param {Number} startIdx Index to start lookAhead at (Basically, the index of the current relation node in its current level)
 * @returns The first lookahead that works, or null if nothing matches
 */
const lookAhead = (levelNode, desiredPOSType, findChunk, startIdx) => {
	for (var i = startIdx; i < levelNode.length; i++)
	{
		if (new RegExp(desiredPOSType, 'gmi').test(levelNode[i].pos) && levelNode[i].isChunk == findChunk)
		{
			return levelNode[i];
		}
	}
	return null;
}

/**
 * Implements a "RegExp" POS look behind for the current level of relation nodes (nodes on the same level)
 * @param {Relation[]} levelNode An array of all relation nodes on the same level
 * @param {String} desiredPOSType Desired POS of relation node you're finding. Use RegExp to find multiple.
 * @param {Boolean} findChunk Whether to look behind for relation node that are chunks. If false, this will only look for relation nodes that aren't chunks
 * @param {Number} startIdx Index to start lookBehind at (Basically, the index of the current relation node in its current level)
 * @returns The first look behind that works, or null if nothing matches
 */
const lookBehind = (levelNode, desiredPOSType, findChunk, startIdx) => {
	for (var i = startIdx; i >= 0; i--)
	{
		if (new RegExp(desiredPOSType, 'gmi').test(levelNode[i].pos) && levelNode[i].isChunk == findChunk)
		{
			return levelNode[i];
		}
	}
	return null;
}

module.exports.lookAhead = lookAhead;
module.exports.lookBehind = lookBehind;

/**
 * Extracts relations for all posChunks and their children.
 * This does it by modifying Relation.proto.subject and Relation.proto.object.
 * @param {Relation} rootRelation The root relation node.
 */
const relationExtraction = (rootRelation) => {

    //Divide the relation extraction up by sentences
    rootRelation.children.forEach(sentence => {
        //Relation extract for each posChunk
        sentence.children.forEach((posChunk, i) => {
            //Relation extract it differently for each POS type
            switch (posChunk.pos)
            {
                //See if we can also chunk this
                case "NOUN":
                    //First case: tackle if something goes like "the game is trash" where "game" and "trash" are both NPs

                    //Look at everything before the current NP
                    for (var c = i - 1, hasIs = false; c >= 0; c--)
                    {
                        //If the previous POS' are any of the ones below, then the noun is already an object of something and just skip it
                        if (/COMPARISON|ADJECTIVE|\bVERB\b|PUNCTUATIONEND/gmi.test(sentence.children[c].pos))
                        {
                            break;
                        }

                        //If the previous words have "IS" or "become" or any of those words, then the noun is smth like "___ is ___." Then, this noun is referring to a subject
                        if (sentence.children[c].pos.trim() == "IS" || /has|had|have|be|become|became/.test(sentence.children[c].toString())) hasIs = true;

                        //Find that subject.
                        if (hasIs && (sentence.children[c].pos == "NOUN" || sentence.children[c].pos == "PRONOUN"))
                        {
                            posChunk.subject = sentence.children[c];
                            break;
                        }
                    }

                    if (posChunk.isChunk)
                    {
                        //What this whole block does: Relation extraction all the children in the NP
                        //To fix: adjective in NP that goes "not good"

                        //For each posTag in the posChunk's children, relation extraction them
                        var isChain = false;
                        posChunk.children.forEach((posTag, idx) => {
                            //Check to see if we're in an "is phrase" - AKA something like "the cat that IS happy, jumpy, and sad"
                            if (posTag.pos == "IS" || /has|had|have|be|become|became/.test(posTag.toString())) 
                            {
                                isChain = true;
                            }
                            else if (posTag.pos == "ADJECTIVE")
                            {
                                //If is chain --> the dog IS bad
                                //If not --> the bad dog
                                posTag.subject = isChain ? lookBehind(posChunk.children, "NOUN", false, idx - 1) : lookAhead(posChunk.children, "NOUN", false, idx + 1);
                            }
                            else if (posTag.pos == "VERB")
                            {
                                //If we encounter a verb among the NP children, determine the subject and object of it by doing lookaheads and lookbehinds simultaneously
                                    for (var c = idx - 1, d = idx + 1; c >= 0 || d < posChunk.children.length; c--, d++)
                                    {
                                        if (c >= 0 && /PRONOUN|NOUN|PNOUN/mi.test(posChunk.children[c].pos))
                                        {
                                            if (isChain) //AXE was used by Justin
                                            {
                                                if (!posTag.object)
                                                    posTag.object = posChunk.children[c];
                                            }
                                            else //JUSTIN used axe
                                            {
                                                if (!posTag.subject)
                                                    posTag.subject = posChunk.children[c];
                                            }
                                        }
                                        
                                        if (d < posChunk.children.length && /PRONOUN|NOUN|PNOUN/mi.test(posChunk.children[d].pos))
                                        {
                                            if (isChain) // axe was used by JUSTIN
                                            {
                                                if (!posTag.subject)
                                                    posTag.subject = posChunk.children[d];
                                            }
                                            else //justin used AXE
                                            {
                                                if (!posTag.object)
                                                    posTag.object = posChunk.children[d];
                                            }
                                        }
                                    }
                            } //If the POS is not a verb or adjective or any of the ones below, then it's definitively not in the isChain anymore
                            else if (posTag.pos != "CONJUNCTION" && posTag.pos != "PUNCTUATION" && posTag.pos != "ADVERB")
                            {
                                //To do: smth like "the cat that was attacked by the dog and chases Jerry"
                                //Running --> dog subject, cat object
                                //Chases --> cat subject, dog object
                                //Now where do we end the is chain?
                                isChain = false;
                            }
                        });
                    }
                break;

                case "COMPARISON":
                    posChunk.subject = lookBehind(sentence.children, "NOUN|PNOUN|PRONOUN", true, i - 1);

                    //If the comparison phrase has something similar to the words "than" (SCONJ) or "compared to"
                    //To fix: because would also get chunked in here
                    if (posChunk.childrenHas("SCONJ|VERB-COMP"))
                    {
                        posChunk.object = lookAhead(sentence.children, "NOUN|PNOUN|PRONOUN", true, i + 1);
                    }
                break;

                case "VERB":
                    //Praying to god rn that Gerunds and participles don't get classified as a verb (POSData.txt please do your job)
                    var hasIs = false;
				    var ing = false;

                    //For each word in the Verb Phrase:
                    posChunk.children.forEach((posTag, idx) => {
                        //Check if the word in VP is an is phrase
                        if (posTag.pos == "IS" || /get|gets|got|gotten/.test(posTag.toString()))
                        {
                            hasIs = true;
                        }
                        
                        //Check if any verbs in the VP ends in -ing
                        if (posTag.pos == "VERB" && posTag.toString().endsWith('ing'))
                        {
                            ing = true;
                        }
                    })
                    
                    //If verb phrase was smth like "OBJECT was attacked by SUBJECT"
                    if (hasIs && !ing)
                    {
                        posChunk.subject = lookAhead(sentence.children, "NOUN", true, i + 1);
                        posChunk.object = lookBehind(sentence.children, "NOUN", true, i - 1);
                    }
                    else //If verb phrase was smth like "SUBJECT was running from OBJECT" or "SUBJECT ran"
                    {
                        //To do: fix "SUBJECT ran quickly and SUBJECt2 also ran" --> make sure SUBJECT2 isn't marked as object
                        //Can't chunk by conjunction because we want "SUBJECT ran, swam, AND jumped away from OBJECT" also conflicts with the AND
                        posChunk.subject = lookBehind(sentence.children, "NOUN", true, i - 1);
                        posChunk.object = lookAhead(sentence.children, "NOUN", true, i + 1);
                    }
                break;

                case "ADJECTIVE ":
                case "ADJECTIVE":
                    //Adjectives that come before noun are in NP because *Light* in light mode is adj, but it's cruicial info to know the theme.
                    //So we only have adjectives after NP
                    rel.subject = lookBehind(sentence.children, "NOUN", true, idx - 1);
                break;

                case "ADVERB":
                    //Find closest verb to modify (praying SAT grammar prep helps here)
                    //Adverbs like very should already be classified in the adjectives
                    var conjleft = false;
                    var conjright = false;
                    var alertright = false; //Remembers to check conjright before deciding on verb

                    //Checks for commmas and acts
                    for (var c = i, d = i; c >= 0 || d < sentence.children.length; c--, d++)
                    {
                        //If you find a verb in front of the ADVERB, that gets tagged
                        if (c >= 0 && sentence.children[c].pos == "VERB")
                        {
                            posChunk.subject = sentence.children[c];
                            break;
                        } //If you find a verb after the ADVERB...
                        else if (d < sentence.children.length && sentence.children[d].pos == "VERB")
                        {
                            //If there's no punctuation, tag the verb. ie. "quickly ran"
                            //If there is a punctuation and a conjunction, it's fine. tag the verb. "quickly, hurrily, and sleepily ran"
                            if ((alertright && conjright) || !alertright)
                            {
                                posChunk.subject = sentence.children[d];
                                break;
                            }
                            else //If not, that verb doesn't belong to the ADVERB so just stop searching. ie. "quickly, slept well"
                            {
                                d = sentence.children.length;
                            }
                        }
                        else if (c >= 0 && sentence.children[c].pos == "CONJUNCTION") //Detect conjunctions on left and right
                        {
                            conjleft = true;
                        }
                        else if (d < sentence.children.length && sentence.children[d].pos == "CONJUNCTION")
                        {
                            conjright = true;
                        }
                        else if (c >= 1 && sentence.children[c].pos == "PUNCTUATION" && !conjleft && sentence.children[c - 1].pos != "ADVERB")
                        {
                            //If you see something like "[random] ran, quickly", that quickly does not belong to the ran. So stop searching.
                            //If you see something like "ran [random], [random], and quickly", that quickly belongs to the ran

                            //Likewise if you see "ran [random], quickly, and [random]", that still belongs to ran even though the comma 
                            //before quickly didn't have a conjunction since [random] in front of conjunction is an adverb
                            c = -1;
                        }
                        else if (d < sentence.children.length && sentence.children[d].pos == "PUNCTUATION")
                        {
                            //Alerts when there's a punctuation
                            alertright = true;
                        }
                    }
                break;
            }
        })
    });
}

module.exports.relationExtraction = relationExtraction;