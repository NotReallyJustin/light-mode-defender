/**
 * A "node-like" structure that tracks POS relationships.
 * Could also just be called a POS node ngl
 * @see https://i.imgur.com/1Sm0f2L.png
 */
class Relation
{
    /**
     * Constructor for relation node. Don't use this unless it's the root node; run this.createChild() instead.
     * @param {String[]} posTag The [word, POS, wordIndex] or 3D POS chunk for the current "relation node"
     * @param {Relation} parent The parent of the relation node.
     * @param {String} forcedPOS If entered, this node will be forcibly set to this POS. If not, the POS will be detected via posTag
     */
    constructor(posTag, parent, forcedPOS)
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
         * Whether the current node is a 3D POS chunk or not.
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

        // //arr[0] would be string/number if it's only 1 arr, but object if it's a noun/comp/adj chunk
		// if (this.hasForcedPOS)
		// {
		// 	this.string = forcedPOS.toLowerCase();
		// 	this.type = forcedPOS;
		// 	this.pos = forcedPOS;
		// }
		// else if (this.isChunk) //and is not alternatePOS
		// {
		// 	this.string = arr.map(x => x[0]).join(" ").toLowerCase();
		// 	this.type = arr[0][3];
		// 	this.pos = arr.map(x => x[1]).join(" ");
		// }
		// else
		// {
		// 	this.string = arr[0].toLowerCase();
		// 	this.pos = arr[1];
		// 	this.type = arr[1];
		// }
    }

    /**
     * @return All the text of this node. Basically, ["a", 1] returns "a" and [["a", 1], ["b", 2]] returns "a b". This returns in lowercase.
     */
    toString()
    {
        return this.isChunk ? posTag.map(x => x[0]).join(" ").toLowerCase().trim() : arr[0].toLowerCase().trim();
    }

    /**
     * Find all nouns in the pos/pos chunk that's represented by this relation node if it exists.
     * If the POS is forced, return [] because no matter what, you're not going to find an actual noun here
     * @return An 2D array with 1D arrays [word, POS, wordIndex, <possible POS of POSChunk>] representing individual nouns, if there is any
     */
    findNoun()
    {
        if (this.pos != "NOUN" || this.hasForcedPOS) return [];
        if (this.isChunk)
        {
            var toRet = [];
            var chain = []; //This exists so something like "John Doe" would be considered one noun

            for (var i = 0; i < this.posTag.length; i++)
			{
				//arr[i][1] == pos
				if (this.posTag[i][1] == "NOUN" || this.posTag[i][1] == "PNOUN")
				{
					chain.push(this.arr[i]);
					if (i + 1 >= this.arr.length || this.arr[i][1] != this.arr[i + 1][1]) //If next word is not also a noun, push chain --> toRet
					{
						toRet.push(chain);
                        chain = [];
					}
				}
			}

            return toRet;
        }
        else
        {
            return [this.posTag];
        }
    }
}