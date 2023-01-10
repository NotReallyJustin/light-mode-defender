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
 * @param {String} desiredPOSType Desired POS of relation node you're finding
 * @param {Boolean} findChunk Whether to look ahead for relation node that are chunks. If false, this will only look for relation nodes that aren't chunks
 * @param {Number} startIdx Index to start lookAhead at (Basically, the index of the current relation node in its current level)
 * @returns The first lookahead that works, or null if nothing matches
 */
const lookAhead = (levelNode, desiredPOSType, findChunk, startIdx) => {
	for (var i = startIdx; i < levelNode.length; i++)
	{
		if (levelNode[i].pos == desiredPOSType && levelNode[i].isChunk == findChunk)
		{
			return levelNode[i];
		}
	}
	return null;
}

/**
 * Implements a "RegExp" POS look behind for the current level of relation nodes (nodes on the same level)
 * @param {Relation[]} levelNode An array of all relation nodes on the same level
 * @param {String} desiredPOSType Desired POS of relation node you're finding
 * @param {Boolean} findChunk Whether to look behind for relation node that are chunks. If false, this will only look for relation nodes that aren't chunks
 * @param {Number} startIdx Index to start lookBehind at (Basically, the index of the current relation node in its current level)
 * @returns The first look behind that works, or null if nothing matches
 */
const lookBehind = (levelNode, desiredPOSType, findChunk, startIdx) => {
	for (var i = startIdx; i >= 0; i--)
	{
		if (levelNode[i].pos == desiredPOSType && levelNode[i].isChunk == findChunk)
		{
			return levelNode[i];
		}
	}
	return null;
}

module.exports.lookAhead = lookAhead;
module.exports.lookBehind = lookBehind;

const relationExtraction = () => {

}