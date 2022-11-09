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
     */
    addProb(probType)
    {
        if (!this[probType]) this[probType] = 0;
		this[probType]++;
		this.total++;
    }

    /**
     * @param {String} probType Case sensititve. The item you're finding the probability of 
     * @returns 0 if the counting table is empty, or the probability of a probType existing admist the total entries
     */
    calcProb(probType)
    {
        if (!this.total) return 0;
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