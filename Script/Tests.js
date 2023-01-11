/*
    A ton of unit tests from module.exports to make sure things don't go haywire
    Also it makes sure the program doesn't blow up
*/
const Helper = require("./Helper");
const POS = require("./POS");
const RelationExtraction = require("./RelationExtraction");

/**
 * Tests Helper.fixSpaces. There's only 1 but all the possible errors are thrown into this test case
 * @returns Whether test is successful
 */
const testFixSpaces = () => Helper.fixSpaces("  I  fetched  my    cute, smiling,happy dog!") == "I fetched my cute , smiling , happy dog !";

/**
 * Tests Helper.cleanseContractions(). This should be case insensitive.
 * @returns Whether the test worked
 */
const testCleanseContract = () => {
    var worked = true;
    [
        ["I am henceforth unable to can't.", "I am henceforth unable to can not."],
        ["He'd email you it or smth", "He would email you it or smth"],
        ["you're*", "you are*"],
        //["there's a sus imposter among us", "there is a sus imposter among us"],
        ["Bryan's dog is sleeping", "Bryan dog is sleeping"],
        ["employn't", "employ not"],
        ["say i'Ve ate a donut you woN't", "say i have ate a donut you would not"],
        ["i'm addicted to she'll", "I am addicted to she will"],
        ["hey this is a totally normal sentence", "hey this is a totally normal sentence"]
    ].forEach(test => {
        var testRes = Helper.cleanseContractions(test[0]).toUpperCase()
        if (testRes != test[1].toUpperCase())
        {
            console.log(`> testCleanseContract failed: ${test[0]} !--> ${test[1]}. Instead, got ${testRes}`);
            worked = false;
        }
    });

    return worked;
}

/**
 * Uses test cases, labeled "TEST" as POS, to test whether the file POSData.txt is being read properly
 * @returns Whether POS.readPOSData() is working properly
 */
const testReadPOS = async () => {
    const [probWordPOS, emissionPOS] = await POS.readPOSData();

    try
    {
        if (probWordPOS.get("ANEMO_TEST_6308").TEST != 2) throw "ANEMO_TEST_6308 doesn't have 2 TEST";
        if (probWordPOS.get("ANEMO_TEST_6308").total != 2) throw "ANEMO_TEST_6308 doesn't have 2 total";
        if (probWordPOS.get("ANEMO_TEST_6308").calcProb("TEST") != 1) throw "ANEMO_TEST_6308 isn't 100% test. Read failed";
        if (emissionPOS.get("TEST").total != 4) throw "TEST in emission prob doesn't have 4 total";
        if (emissionPOS.get("TEST").calcProb("TEST") != 0.5) throw "TEST emission prob failed";
    }
    catch(err)
    {
        console.log(`> testReadPOS failed: ${err}`);
        return false;
    }

    return true;
}

/**
 * See VTB chart. Creates a fake VTB graph to check whether calcPOS is functional
 * @returns Whether calcPOS works
 */
const testCalcPOS = () => {
    let emission = new Helper.AutoMap(Helper.CountingTable);
    emission.get("AUX").addProb("NOUN");
    emission.get("AUX").addProb("PRONOUN", 6);
    emission.get("AUX").addProb("VERB", 3);
    emission.get("VERB").addProb("NOUN", 8);
    emission.get("VERB").addProb("VERB", 0);
    emission.get("VERB").addProb("DETERMINER", 2);
    emission.get("DETERMINER").addProb("AUX", 8);
    emission.get("DETERMINER").addProb("TEST", 2);
    emission.get("PRONOUN").addProb("SPACE", 4);
    emission.get("PRONOUN").addProb("TEST", 6);
    emission.get("NOUN").addProb("SPACE", 60);
    emission.get("NOUN").addProb("NOUN", 5);
    emission.get("NOUN").addProb("DETERMINER", 35);

    let transmission = new Helper.AutoMap(Helper.CountingTable);
    transmission.get("I").addProb("PRONOUN", 4);
    transmission.get("I").addProb("NOUN", 6);
    transmission.get("AM").addProb("AUX", 80);
    transmission.get("AM").addProb("NOUN", 15);
    transmission.get("AM").addProb("VERB", 5);
    transmission.get("A").addProb("DETERMINER", 1);

    let hmmResults = POS.calcPOS(transmission, emission, "I am a scorpio", true);
    //console.log(hmmResults.pos.map(tuple => tuple[1]))
    var resMatch = hmmResults.pos.map(tuple => tuple[1]).toString() == ["PRONOUN", "AUX", "DETERMINER", "NOUN"].toString();
    var probabilitiesMatch = hmmResults.prob.toFixed(6) == 0.021504;

    if (!resMatch) console.log("> testReadPOS failed: The POS returned are not correct even in this controlled environment");
    if (!probabilitiesMatch) console.log("> testReadPOS Failed: The probability of the POS results do not match. Something went wrong in the HMM math.");

    return resMatch && probabilitiesMatch;
}

/**
 * Creates own RegExp equations and fake POS tags to test chunkItem. This also checks whether it chunks it in chronological order of the RegExp array
 * @return Whether chunkItem works
 */
const testChunkItem = () => {
    const regExps = [
        /NOUN VERB DETERMINER (NOUN|PNOUN|PRONOUN)/gmi,
        /NOUN VERB/gmi,
    ];

    const sentence = [
        ["Donut", "NOUN"],
        ["donuting", "VERB"],
        ["a", "DETERMINER"],
        ["Munchkin", "PNOUN"],
        ["actually", "RANDOM"],
        ["Donut", "NOUN"],
        ["Sleeps", "VERB"],
        ["but", "SCONJ"],
        ["Donut", "NOUN"],
        ["donuting", "VERB"],
        ["a", "DETERMINER"],
        ["duck", "NOUN"]
    ];

    const expected = [
        [
            ["Donut", "NOUN", 0, "TEST"],
            ["donuting", "VERB", 1, "TEST"],
            ["a", "DETERMINER", 2, "TEST"],
            ["Munchkin", "PNOUN", 3, "TEST"]
        ],
        [
            ["Donut", "NOUN", 8, "TEST"],
            ["donuting", "VERB", 9, "TEST"],
            ["a", "DETERMINER", 10, "TEST"],
            ["duck", "NOUN", 11, "TEST"]
        ],
        [
            ["Donut", "NOUN", 5, "TEST"],
            ["Sleeps", "VERB", 6, "TEST"],
        ],
    ];

    const testChunk = POS.chunkItem(regExps, "TEST", sentence);
    return expected.toString() == testChunk.toString();
}

/**
 * Unit test for POS.chunkMultiple()
 * This overwrites the functions for chunkIndividual (basically set the chunkIndividual output) to ensure that we're only testing how well chunkMultiple pieces stuff together.
 * The override capabilities are also tested
 * @return whether chunkMultiple() works
 */
const testChunkMultiple = () => {
    const sentence = [
        ["L", "THEL"],
        ["plus", "CONJ"],
        ["ratio", "VERB"],
        ["plus", "CONJ"],
        ["bozo", "NOUN"],
        ["plus", "CONJ"],
        ["you", "PNOUN"],
        ["fell", "VERB"],
        ["off", "ADPOSITION"],
        ["plus", "CONJ"],
        ["that", "PNOUN"],
        ["is", "IS"],
        ["wacko", "ADJ"],
        ["plus", "CONJ"],
        ["beep", "HI"],
        ["bop", "TEST"],
        ["boink", "NO"]
    ];

    const expected = [
        [
          ["L", "THEL", 0, "FATL"],  
        ],
        ["plus", "CONJ", 1],
        [
            ["ratio", "VERB", 2, "VERB"], 
        ],
        ["plus", "CONJ", 3],
        [
            ["bozo", "NOUN", 4, "NOUN"],
        ],        
        ["plus", "CONJ", 5],
        [
            ["you", "PNOUN", 6, "TERM"],
            ["fell", "VERB", 7, "TERM"],
            ["off", "ADPOSITION", 8, "TERM"],
        ],
        ["plus", "CONJ", 9],
        [
            ["that", "PNOUN", 10, "TERM"],
            ["is", "IS", 11, "TERM"],
            ["wacko", "ADJ", 12, "TERM"],
        ],
        ["plus", "CONJ", 13],
        [
            ["beep", "HI", 14, "TERM"],
            ["bop", "TEST", 15, "TERM"],
            ["boink", "NO", 16, "TERM"]
        ]
    ];

    const testChunk = POS.chunkMultiple([
        () => [ //Chunk term
            [
                ["you", "PNOUN", 6, "TERM"],
                ["fell", "VERB", 7, "TERM"],
                ["off", "ADPOSITION", 8, "TERM"],
            ],
            [
                ["that", "PNOUN", 10, "TERM"],
                ["is", "IS", 11, "TERM"],
                ["wacko", "ADJ", 12, "TERM"],
            ],
            [
                ["beep", "HI", 14, "TERM"],
                ["bop", "TEST", 15, "TERM"],
                ["boink", "NO", 16, "TERM"]
            ]
        ],
        () => [ //Chunk noun
            [
                ["bozo", "NOUN", 4, "NOUN"]
            ],
            [
                ["you", "PNOUN", 6, "NOUN"]
            ],
            [
                ["bop", "TEST", 15, "NOUN"]
            ]
        ],
        () => [ //Chunk verb
            [
                ["ratio", "VERB", 2, "VERB"]
            ],
            [
                ["fell", "VERB", 7, "VERB"]
            ],
            [
                ["beep", "HI", 14, "VERB"]
            ]
        ],
        () => [ //Chunk fat L
            [
                ["L", "THEL", 0, "FATL"]
            ]
        ]
    ], sentence);

    if (testChunk.toString() == expected.toString())
    {
        return true;
    }
    else
    {
        console.log("> testChunkMultiple failed: Items don't match. Got:");
        console.log(testChunk.toString());
        console.log("---")
        console.log(expected.toString());
        return false;
    }
}

/**
 * Tests the Relation class in ./RelationExtraction.js by creating fake relations
 * @return Whether the relation class works
 */
const testRelation = () => {
    let posTag = [
        ["The", "DETERMINER", 0, "NOUN"],
        ["cat", "NOUN", 1, "NOUN"],
        ["in", "ADPOSITION", 2, "NOUN"],
        ["Las", "PNOUN", 3, "NOUN"],
        ["Vegas", "PNOUN", 4, "NOUN"]
    ];

    let relationTree = new RelationExtraction.Relation(undefined, undefined, "ROOT");
    relationTree.createChild(posTag);
    relationTree.createChild(["sat", "VERB"]);
    relationTree.children[0].generateChildFromChunk();

    try
    {
        if (relationTree.posTag.toString() != [].toString()) throw "Root node POS tag is not []";
        if (relationTree.pos != "ROOT") throw "Root node POS is not ROOT";
        if (relationTree.parent != null) throw "Root node's parent is not null";
        if (relationTree.children.length != 2) throw "Root node does not have 2 child nodes";

        if (relationTree.children[1].posTag.toString() != ["sat", "VERB"].toString()) throw "Relation doesn't properly transfer posTag for POS Arrays";
        if (relationTree.children[1].pos != "VERB") throw "Relation doesn't have right POS type for POS Arrays";
        if (relationTree.children[1].children.length != 0) throw "Relation wacked up the children for POS Arrays";
        if (relationTree.children[1].parent != relationTree) throw "Relation parent is not working for POS Arrays";

        if (relationTree.children[0].parent != relationTree) throw "Relation parent not working for POS chunks";
        if (relationTree.children[0].posTag.toString() != posTag.toString()) throw "Relation POS chunk doesn't have right POS tag";
        if (relationTree.children[0].pos != "NOUN") throw "Relation doesn't have right POS for POS chunks";
        if (relationTree.children[0].children.length != 5) throw "GenerateChildFromChunk for POS chunk doesn't give right number of children";
        
        if (relationTree.children[0].children[0].parent != relationTree.children[0]) throw "POS chunk's child's parent is not POS chunk";
        if (relationTree.children[0].children[0].pos != "DETERMINER") throw "POS chunk's child doesn't have right POS";
        if (relationTree.children[0].children[0].posTag.toString() != ["The", "DETERMINER", 0, "NOUN"].toString()) throw "POS chunk's child doesn't have right POS tag";
        if (relationTree.children[0].children[0].children.length != 0) throw "POS chunk's child somehow has children too";

        if (relationTree.toString() != "") throw "Root node toString is not empty";
        if (relationTree.children[1].toString() != "sat") throw "Relation doesn't have right toString for POS Arrays";
        if (relationTree.children[0].toString() != "the cat in las vegas") throw "Relation doesn't have right toString for POS Chunks";
        if (relationTree.children[0].children[0].toString() != "the") throw "Relation doesn't have right toString for child of POS chunks";

        if (!relationTree.children[0].childrenHas("PNOUN")) return "Children has doesn't work";
        if (relationTree.children[0].childrenHas("SCONJ")) return "Children has doesn't work";

        var findNoun = relationTree.children[0].findNoun();
        if (findNoun.length != 2) return "Relation findNoun does not give the right number of nouns";
        if (findNoun[0].length != 1) return "Relation findNoun's array isn't structured properly for a word";
        if (findNoun[0][0].toString() != "cat") return "Relation findNoun failed for 1 word";
        if (findNoun[1].length != 2) return "Relation findNoun's array isn't structured properly for 2 words";
        if (findNoun[1][1].toString() != "vegas") return "Relation findNoun failed for 2 words";
    }
    catch(err)
    {
        console.log(`> testRelation failed: ${err}`);
        return false;
    }

    return true;
}

/**
 * Performs the exact same test as TestRelation. However, this time we create the relations from a POSArr.
 * @return Whether RelationExtraction.Relation.buildFromPOSArr() works
 */
const testRelationFromPOSArr = () => {
    let posTag = [
        ["The", "DETERMINER", 0, "NOUN"],
        ["cat", "NOUN", 1, "NOUN"],
        ["in", "ADPOSITION", 2, "NOUN"],
        ["Las", "PNOUN", 3, "NOUN"],
        ["Vegas", "PNOUN", 4, "NOUN"]
    ];

    const relationTree = RelationExtraction.Relation.buildFromPOSArr([
        [
            ["The", "DETERMINER", 0, "NOUN"],
            ["cat", "NOUN", 1, "NOUN"],
            ["in", "ADPOSITION", 2, "NOUN"],
            ["Las", "PNOUN", 3, "NOUN"],
            ["Vegas", "PNOUN", 4, "NOUN"]
        ],
        ["sat", "VERB"],
        [".", "PUNCTUATIONEND"],
        [
            ["The", "DETERMINER", 0, "NOUN"],
            ["cat", "NOUN", 1, "NOUN"],
            ["in", "ADPOSITION", 2, "NOUN"],
            ["Las", "PNOUN", 3, "NOUN"],
            ["Vegas", "PNOUN", 4, "NOUN"]
        ],
        ["ate", "VERB"],
    ]);

    try
    {
        if (relationTree.posTag.toString() != [].toString()) throw "Root node POS tag is not []";
        if (relationTree.pos != "ROOT") throw "Root node POS is not ROOT";
        if (relationTree.parent != null) throw "Root node's parent is not null";
        if (relationTree.children.length != 2) throw "Root node does not have 2 sentences";

        const sentenceOne = relationTree.children[0];
        //console.log(sentenceOne)

        if (sentenceOne.children.length != 3) throw "Sentence one doesn't have 3 POSTag components";
        if (sentenceOne.children[1].posTag.toString() != ["sat", "VERB"].toString()) throw "Relation doesn't properly transfer posTag for POS Arrays";
        if (sentenceOne.children[1].pos != "VERB") throw "Relation doesn't have right POS type for POS Arrays";
        if (sentenceOne.children[1].children.length != 0) throw "Relation wacked up the children for POS Arrays";
        if (sentenceOne.children[1].parent != relationTree.children[0]) throw "Relation parent is not working for POS Arrays";

        if (sentenceOne.children[0].parent != relationTree.children[0]) throw "Relation parent not working for POS chunks";
        if (sentenceOne.children[0].posTag.toString() != posTag.toString()) throw "Relation POS chunk doesn't have right POS tag";
        if (sentenceOne.children[0].pos != "NOUN") throw "Relation dfoesn't have right POS for POS chunks";
        if (sentenceOne.children[0].children.length != 5) throw "GenerateChildFromChunk for POS chunk doesn't give right number of children";
        
        if (sentenceOne.children[0].children[0].parent != sentenceOne.children[0]) throw "POS chunk's child's parent is not POS chunk";
        if (sentenceOne.children[0].children[0].pos != "DETERMINER") throw "POS chunk's child doesn't have right POS";
        if (sentenceOne.children[0].children[0].posTag.toString() != ["The", "DETERMINER", 0, "NOUN"].toString()) throw "POS chunk's child doesn't have right POS tag";
        if (sentenceOne.children[0].children[0].children.length != 0) throw "POS chunk's child somehow has children too";

        if (relationTree.toString() != "") throw "Root node toString is not empty";
        if (sentenceOne.children[1].toString() != "sat") throw "Relation doesn't have right toString for POS Arrays";
        if (sentenceOne.children[0].toString() != "the cat in las vegas") throw "Relation doesn't have right toString for POS Chunks";
        if (sentenceOne.children[0].children[0].toString() != "the") throw "Relation doesn't have right toString for child of POS chunks";

        if (!sentenceOne.childrenHas("PNOUN")) return "Children has doesn't work";
        if (sentenceOne.childrenHas("SCONJ")) return "Children has doesn't work";

        var findNoun = sentenceOne.children[0].findNoun();
        if (findNoun.length != 2) return "Relation findNoun does not give the right number of nouns";
        if (findNoun[0].length != 1) return "Relation findNoun's array isn't structured properly for a word";
        if (findNoun[0][0].toString() != "cat") return "Relation findNoun failed for 1 word";
        if (findNoun[1].length != 2) return "Relation findNoun's array isn't structured properly for 2 words";
        if (findNoun[1][1].toString() != "vegas") return "Relation findNoun failed for 2 words";
    }
    catch(err)
    {
        console.log(`> testRelationFromPOSArr failed: ${err}`);
        return false;
    }

    return true;
}

/**
 * Tests look ahead by creating fake relation nodes.
 * Not a unit test but an integration test because I don't want to manually type out the Relation class.
 * @returns Whether or not RelationExtraction.lookAhead() works
 */
const testLookAhead = () => {
    let posTag = [
        ["The", "DETERMINER", 0, "NOUN"],
        ["cat", "NOUN", 1, "NOUN"],
        ["in", "ADPOSITION", 2, "NOUN"],
        ["Las", "PNOUN", 3, "NOUN"],
        ["Vegas", "PNOUN", 4, "NOUN"]
    ];

    let relationTree = new RelationExtraction.Relation(undefined, undefined, "ROOT");
    relationTree.createChild(posTag);
    relationTree.createChild(["sat", "VERB"]);
    relationTree.children[0].generateChildFromChunk();

    try
    {
        if (RelationExtraction.lookAhead(relationTree.children, "VERB", false, 0) != relationTree.children[1])
        {
            throw "Look ahead failed for top level look ahead search";
        }

        if (RelationExtraction.lookAhead(relationTree.children, "VERB", true, 0) != null)
        {
            throw "Look ahead doesn't properly detect chunked elements properly";
        }
        
        if (RelationExtraction.lookAhead(relationTree.children[0].children, "ADJECTIVE", false, 0) != null)
        {
            throw "Look ahead does not properly detect null elements";
        }

        if (RelationExtraction.lookAhead(relationTree.children[0].children, "PNOUN", false, 4) != relationTree.children[0].children[4])
        {
            throw "Look ahead doesn't work properly for children of children nodes";
        }
    }
    catch(err)
    {
        console.log(`> testLookAhead failed: ${err}`);
        return false;
    }

    return true;
}

/**
 * Integration test for look behind. Relies on Relation class and lookBehind to work properly.
 * @returns Whether or not RelationExtraction.lookBehind() works
 */
const testLookBehind = () => {
    let posTag = [
        ["The", "DETERMINER", 0, "NOUN"],
        ["cat", "NOUN", 1, "NOUN"],
        ["in", "ADPOSITION", 2, "NOUN"],
        ["Las", "PNOUN", 3, "NOUN"],
        ["Vegas", "PNOUN", 4, "NOUN"]
    ];

    let relationTree = new RelationExtraction.Relation(undefined, undefined, "ROOT");
    relationTree.createChild(posTag);
    relationTree.createChild(["sat", "VERB"]);
    relationTree.children[0].generateChildFromChunk();

    try
    {
        if (RelationExtraction.lookBehind(relationTree.children, "NOUN", true, 1) != relationTree.children[0])
        {
            throw "Look behind failed for top level look ahead search";
        }

        if (RelationExtraction.lookBehind(relationTree.children, "NOUN", false, 1) != null)
        {
            throw "Look behind doesn't properly detect chunked elements properly";
        }
        
        if (RelationExtraction.lookBehind(relationTree.children[0].children, "ADJECTIVE", false, 0) != null)
        {
            throw "Look behind does not properly detect null elements";
        }

        if (RelationExtraction.lookBehind(relationTree.children[0].children, "ADPOSITION", false, 4) != relationTree.children[0].children[2])
        {
            throw "Look behind doesn't work properly for children of children nodes";
        }
    }
    catch(err)
    {
        console.log(`> testLookBehind failed: ${err}`);
        return false;
    }

    return true;
}

/**
 * Runs all the unit tests and prints results of whether they're working properly.
 */
module.exports.runTests = async () => {
    console.log("----------RUNNING UNIT TESTS--------------");

    //Functions are objects so run through all these and test them
    const toTest = [
        testFixSpaces,
        testCleanseContract,
        testReadPOS,
        testCalcPOS,
        testChunkItem,
        testChunkMultiple,
        testRelation,
        testRelationFromPOSArr,
        testLookAhead,
        testLookBehind
    ];
    
    for (test of toTest)
    {
        await test() ? console.log(`✔️ ${test.name} is working properly!`) : console.log(`❌ ${test.name} failed.`);
    }
}

this.runTests();