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
    var reflexive = pronoun.parent == antecedent.parent;
    if (reflexive != pronounInfo.reflexive) return false;
    
    return true;
}

module.exports.proposeAntecedent = proposeAntecedent;