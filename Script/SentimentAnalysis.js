// Uses AFINN 165 to sentiment analysis

const { Relation } = require("./RelationExtraction");
const Detection = require("./Detection");
const afinn = require("../Data/afinn165.json");
const { lemmatize } = require("./Lemmatize");

/**
 * Uses the AFINN-165 file to conduct sentiment analysis on an sentence, given by a root POS node.
 * @param {Relation} root The root relation
 * @param {Number} bias A number to skew the results by. By default, this is 0.
 * @see planning.md for how we did this
 */
module.exports.sentimentAnalysis = (root, bias=0) => {
    const KEEP_AFINN = 1;
    const REVERSE_AFINN = -1;   //Constants for readbility down the line
    const NOTHING_AFINN = 0;

    let total = 0;

    const allPOSChunks = [...root.children].map(sentence => sentence.children).flat();
    allPOSChunks.forEach(el => {

        switch (el.pos)
        {
            case "NOUN":
                var chunkMode = Detection.testContainMode(el);
                var sentimentScore = 0;

                if (chunkMode != "none")
                {
                    el.children.forEach(npChild => {
                        //If the words are an adjective or verb, check if their subject is a mode word. 

                        if ((npChild.pos == "ADJECTIVE" || npChild.pos == "VERB") && npChild.subject)
                        {
                            if (Detection.testContainMode(npChild.subject) != "none")
                            {
                                //If they are, sentiment analysis them.
                                var lemmatized = lemmatize(npChild.toString(), npChild.pos);
                                if (afinn[lemmatized])
                                {
                                    sentimentScore += afinn[lemmatized];
                                }
                            }
                        }
                    });
                }

                //Take into account negations.
                var negated = Detection.testNegations(el);

                if ((chunkMode == "light" && !negated) || (chunkMode == "dark" && negated))
                {
                    total += sentimentScore;
                }
                else if ((chunkMode == "dark" && !negated) || (chunkMode == "light" && negated))
                {
                    total -= sentimentScore;
                }

            break;

            case "VERB":
                //See is VP has light mode or dark mode as its subject and/or object.
                var subjectMode = el.subject ? testContainMode(el.subject) : "none";
			    var objectMode = el.object ? testContainMode(el.object) : "none";

                //To track AFINN score to add later
                var sentimentScore = 0;
                var afinnStatus = NOTHING_AFINN;

                if (subjectMode != "none")
                {
                    //Light attack dark. Reverse AFINN.
                    if (subjectMode == "light" && objectMode == "dark")
                    {
                        afinnStatus = REVERSE_AFINN;
                    }
                    else if (subjectMode == "dark" && objectMode == "light") //Dark attack light. Keep AFINN.
                    {
                        afinnStatus = KEEP_AFINN;
                    }
                    else if (subjectMode == "light") //Keep AFINN
                    {
                        afinnStatus = KEEP_AFINN;
                    }
                    else if (subjectMode == "dark") //Reverse AFINN
                    {
                        afinnStatus = REVERSE_AFINN;
                    }
                }
                else if (objectMode != "none")
                {
                    if (objectMode == "light")  //Reverse AFINN
                    {
                        afinnStatus = REVERSE_AFINN;
                    }
                    else if (objectMode == "dark")  //Keep AFINN
                    {
                        afinnStatus = KEEP_AFINN;
                    }
                }

                if (subjectMode != "none" || objectMode != "none")
                {
                    //Adjust for negation
                    var negated = Detection.testNegations(el);
                    if (negated) afinnStatus = afinnStatus * -1;

                    //Now sentiment analysis everything!
                    el.children.forEach(vpChild => {
                        
                        var lemmatized = lemmatize(vpChild.toString(), vpChild.pos);
                        if (afinn[lemmatized])
                        {
                            sentimentScore += afinn[lemmatized];
                        }
                    });

                    total += sentimentScore * afinnStatus;
                }
            break;

            case "ADJECTIVE":
                //To track AFINN score to add later
                var sentimentScore = 0;
                var afinnStatus = NOTHING_AFINN;

                var subjectMode = el.subject ? testContainMode(el.subject) : "none";

                if (subjectMode == "light")
                {
                    afinnStatus = KEEP_AFINN;
                }
                else if (subjectMode == "dark")
                {
                    afinnStatus = REVERSE_AFINN;
                }

                //Account for negations
                if (Detection.testNegations(el)) afinnStatus = afinnStatus * -1;

                //Loop through all words in the ADJECTIVE phrase and AFINN it
                if (subjectMode != "none")
                {
                    el.children.forEach(adjChild => {
                        if (adjChild.pos == "ADJECTIVE")
                        {
                            var lemmatized = lemmatize(adjChild.toString(), adjChild.pos);
                            if (afinn[lemmatized])
                            {
                                sentimentScore += afinn[lemmatized];
                            }
                        }
                    });

                    total += sentimentScore * afinnStatus;
                }
            break;

            case "COMPARISON":
                //To track AFINN score to add later
                var sentimentScore = 0;
                var afinnStatus = NOTHING_AFINN;

                var subjectMode = el.subject ? testContainMode(el.subject) : "none";
                var objectMode = el.object ? testContainMode(el.object) : "none";

                /*
                1. If light is in subject, AFINN normally.
                2. Else if dark is in subject, reverse AFINN.
                3. Else if light is in object, reverse AFINN.
                4. Else if dark is in object, keep AFINN.
                */
                if (subjectMode == "light")
                {
                    afinnStatus = KEEP_AFINN;
                }
                else if (subjectMode == "dark")
                {
                    afinnStatus = REVERSE_AFINN;
                }
                else if (objectMode == "light")
                {
                    afinnStatus = REVERSE_AFINN;
                }
                else if (objectMode == "dark")
                {
                    afinnStatus = KEEP_AFINN;
                }

                //Take negations into account
                if (Detection.testNegations(el)) afinnStatus = afinnStatus * -1;

                if (subjectMode != "none" || objectMode != "none")
                {
                    //Find the actual COMPARSION word inside the POS chunk and AFINN it.
                    el.children.forEach(compChild => {
                        if (compChild.pos == "COMPARISON")
                        {
                            var lemmatized = lemmatize(compChild.toString(), compChild.pos);
                            if (afinn[lemmatized])
                            {
                                sentimentScore += afinn[lemmatized];
                            }
                        }
                    });

                    total += sentimentScore * afinnStatus;
                }
            break;
        }
    });

    return total + bias;
}