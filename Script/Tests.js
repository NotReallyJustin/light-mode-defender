/*
    A ton of unit tests from module.exports to make sure things don't go haywire
    Also it makes sure the program doesn't blow up
*/
const Helper = require("./Helper");
const POS = require("./POS");
const RelationExtraction = require("./RelationExtraction");
const PronounAnaphora = require("./PronounAnaphora");
const NameGender = require("./NameGender");
const Detection = require("./Detection");
const Lemmatize = require("./Lemmatize");
const { sentimentAnalysis } = require("./SentimentAnalysis");
 
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

        var findNoun = relationTree.children[0].findNoun();
        if (findNoun.length != 2) throw "Relation findNoun does not give the right number of nouns";
        if (findNoun[0].length != 1) throw "Relation findNoun's array isn't structured properly for a word";
        if (findNoun[0][0].toString() != "cat") throw "Relation findNoun failed for 1 word";
        if (findNoun[1].length != 2) throw "Relation findNoun's array isn't structured properly for 2 words";
        if (findNoun[1][1].toString() != "vegas") throw "Relation findNoun failed for 2 words";
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

        if (sentenceOne.childrenHas("PNOUN")) throw "Children has doesn't work for 1 level surface";
        if (!sentenceOne.children[0].childrenHas("PNOUN")) throw "childrenHas doesn't work in a chunk";
        if (sentenceOne.childrenHas("SCONJ")) throw "Children has doesn't work";

        if (relationTree.countChildren("ADPOSITION", true) != 2) throw "Count Children doesn't work recursively."
        if (relationTree.countChildren("NOUN", true) != 4) throw "Count Children doesn't work recursively for phrases with chunks."

        var findNoun = sentenceOne.children[0].findNoun();
        if (findNoun.length != 2) throw "Relation findNoun does not give the right number of nouns";
        if (findNoun[0].length != 1) throw "Relation findNoun's array isn't structured properly for a word";
        if (findNoun[0][0].toString() != "cat") throw "Relation findNoun failed for 1 word";
        if (findNoun[1].length != 2) throw "Relation findNoun's array isn't structured properly for 2 words";
        if (findNoun[1][1].toString() != "vegas") throw "Relation findNoun failed for 2 words";
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
 * Creates a fake sentence to test whether RelationExtraction.relationExtraction() works.
 * This is an integration test that requires lookAhead(), lookBehind(), and Relation class to all work properly. See previous tests.
 * @returns Whether relation extraction function works.
 */
const testRelationExtraction = () => {
    const root = RelationExtraction.Relation.buildFromPOSArr([
        [
            ["The", "DETERMINER", 0, "NOUN"],
            ["cat", "NOUN", 1, "NOUN"] //s1np0
        ],
        [
            ["sat", "VERB", 0, "VERB"] //s1vp0
        ],
        ["happily", "ADVERB"],
        [",", "PUNCTUATION"],
        ["sleepily", "ADVERB"],
        [",", "PUNCTUATION"],
        ["and", "CONJUNCTION"],
        ["tiredly", "ADVERB"],
        ["on", "ADPOSITION"],
        ["the", "DETERMINER"],
        [
            ["bed", "NOUN", 0, "NOUN"] //s1np1
        ],
        [".", "PUNCTUATIONEND"],
        [
            ["The", "DETERMINER", 0, "NOUN"], //s2np0
            ["cat", "NOUN", 1, "NOUN"],
            ["that", "SCONJ", 2, "NOUN"],
            ["is", "IS", 3, "NOUN"],
            ["tired", "ADJECTIVE", 4, "NOUN"]
        ],
        [
            ["is", "IS", 0, "COMPARISON"], //s2cp0
            ["better", "COMPARISON", 1, "COMPARISON"],
            ["than", "SCONJ", 2, "COMPARISON"]
        ],
        [
            ["the", "DETERMINER", 0, "NOUN"], //s2np1
            ["sleepy", "ADJECTIVE", 1, "NOUN"],
            [",", "PUNCTUATION", 2, "NOUN"],
            ["barking", "ADJECTIVE", 3, "NOUN"],
            ["dog", "NOUN", 4, "NOUN"],
            ["that", "SCONJ", 5, "NOUN"],
            ["was", "IS", 6, "NOUN"],
            ["attacked", "VERB", 7, "NOUN"],
            ["by", "ADPOSITION", 8, "NOUN"],
            ["a", "DETERMINER", 9, "NOUN"],
            ["bus", "PRONOUN", 10, "NOUN"]
        ]
    ]);

    const sentence1 = root.children[0];
    const sentence2 = root.children[1];
    const s1np0 = sentence1.children[0]; //Read: sentence 1 noun phrase 0
    const s1vp0 = sentence1.children[1];
    const s1np1 = sentence1.children[10];
    const s2np0 = sentence2.children[0];
    const s2cp0 = sentence2.children[1];
    const s2np1 = sentence2.children[2];

    RelationExtraction.relationExtraction(root);
    try
    {
        if (sentence1.children.length != 12) throw "Relation extraction tree for sentence 1 doesn't chunk sentences properly";
        if (sentence2.children.length != 3) throw "Relation extraction tree for sentence 2 doesn't chunk sentences properly";

        if (s1vp0.subject != s1np0) throw "Relation extraction on VPs don't identify subjects correctly";
        if (s1vp0.object != s1np1) throw "Relation extraction on VPs don't identify objects correctly after a ton of adverbs and conjunctions";
        if (sentence1.children[2].subject != s1vp0) throw "Relation extraction on adverbs don't identify a verb subjecy right next to it";
        if (sentence1.children[4].subject != s1vp0) throw "Relation extraction on adverbs don't identify a verb subject muddled by commas";
        if (sentence1.children[7].subject != s1vp0) throw "Relation extraction on adverbs don't identify a verb subject muddled by commas and conjunctions";

        if (s2cp0.subject != s2np0) throw "Relation extraction on comparisons doesn't identify subjects correctly";
        if (s2cp0.object != s2np1) throw "Relation extraction on comparisons doesn't identify objects correctly";

        if (s2np0.children[4].subject != s2np0.children[1]) throw "Relation extraction in NPs for adjectives in is-chain doesn't work properly";

        if (s2np1.children[1].subject != s2np1.children[4]) throw "Relation extraction in NPs for adjectives not in is-chain doesn't work properly amidst commas and ANDs";
        if (s2np1.children[3].subject != s2np1.children[4]) throw "Relation extraction in NPs for adjectives not in is-chain doesn't work properly without commas and ANDs";
        if (s2np1.children[7].object != s2np1.children[4]) throw "Relation extraction in NPs for verbs in is-chain doesn't identify objects properly"
        if (s2np1.children[7].subject != s2np1.children[10]) throw "Relation extraction in NPs for verbs in is-chain doesn't identify subjects properly";
    }
    catch(err)
    {
        console.log(`> testLookBehind failed: ${err}`);
        return false;
    }

    return true;
}

/**
 * Tests Helper.capitalizeFirstLetter()
 * @return Whether the function works
 */
const testCapitalizeFirstLetter = () => {
    const tests = [
        ["billy", "Billy"],
        ["boB", "Bob"],
        ["Dream", "Dream"],
        ["SAPNAP", "Sapnap"]
    ];

    for (var testCase of tests)
    {
        if (Helper.capitalizeFirstLetter(testCase[0]) != testCase[1])
        {
            console.log(`> testCapitalizeFirstLetter failed: ${Helper.capitalizeFirstLetter(testCase[0])} != ${testCase[1]}`);
            return false;
        }
    }
    return true;
}

/**
 * Create test cases to test NameGender.scout().
 * Basically we use one giant array lol.
 * Integration test actually, requires testCapitalizeFirstLetter() to work
 * @return Whether NameGender.scout() works
 */
const testScout = () => {
    var goog = true;
    let nameArr = [
        "Beep",
        "Boop",
        "Dream",
        "George",
        "Mexicandream",
        "Quackity",
        "Sapnap",
        "Technoblade"
    ];

    [
        ["bEep", true],
        ["dReam", true],
        ["jorge", false],
        ["GEORGE", true],
        ["tEcHnoBlAdE", true],
        ["Technoblades", false],
        ["ArianaGrande", false]

    ].forEach(testCase => {
        if (NameGender.scout(nameArr, testCase[0]) != testCase[1])
        {
            console.log(`> testScout failed: ${testCase[0]} returned ${NameGender.scout(nameArr, testCase[0])} instead of ${testCase[1]}`);
            goog = false;
        }
    });

    return goog;
}

/**
 * Creates test cases for PronounAnaphora.proposeAntecedent().
 * Integration test - requires testScout() and Relation to work properly
 * @return Whether the function works
 */
const testProposeAntecedent = () => {
    const root1 = new RelationExtraction.Relation(undefined, undefined, "ROOT1");
    const sentence1 = root1.createChild(undefined, "SENTENCE1");
    const sentence2 = root1.createChild(undefined, "SENTENCE2");
    const np1 = sentence1.createChild(undefined, "NP1");
    const np2 = sentence2.createChild(undefined, "NP2");

    try
    {
        var cp1 = np1.createChild(["she", "PRONOUN", 3, "NOUN"]);
        var ca1 = sentence1.createChild([
            ["Maria", "PNOUN", 0, "NOUN"]
        ]);
        ca1.generateChildFromChunk();

        if (!PronounAnaphora.proposeAntecedent(cp1, ca1)) throw "Propose Antecedent doesn't work for a singular name in same sentence";

        var ca2 = sentence2.createChild([
            ["Maria", "PNOUN", 0, "NOUN"]
        ]);
        ca2.generateChildFromChunk();
        if (!PronounAnaphora.proposeAntecedent(cp1, ca2)) throw "Propose Antecedent doesn't work for a singular name in different sentence";

        var ca3 = sentence2.createChild([
            ["Cali", "PNOUN", 0, "NOUN"],
            ["Maria", "PNOUN", 1, "NOUN"]
        ]);
        ca3.generateChildFromChunk();

        if (!PronounAnaphora.proposeAntecedent(cp1, ca3)) throw "Propose Antecedent doesn't work for names with 2 consecutive PNOUNs";

        var cp2 = np1.createChild(["they", "PRONOUN", 4, "NOUN"]);
        if (PronounAnaphora.proposeAntecedent(cp2, ca3)) throw "Propose Antecedent detects consecutive pronouns as plural";

        var ca4 = sentence2.createChild([
            ["The", "DETERMINER", 0, "NOUN"],
            ["burger", "NOUN", 1, "NOUN"],
            ["and", "CONJUNCTION", 2, "NOUN"],
            ["it", "PRONOUN", 3, "NOUN"]
        ]);
        ca4.generateChildFromChunk();

        if (!PronounAnaphora.proposeAntecedent(cp2, ca4)) throw "Propose Antecedent doesn't work for noun and pronoun in a NP";
        if (PronounAnaphora.proposeAntecedent(cp1, ca4)) throw "Propose Antecedent treats multiple nouns in a NP as singular";

        var cp3 = np2.createChild(["themselves", "PRONOUN", 4, "NOUN"]);
        if (!PronounAnaphora.proposeAntecedent(cp3, ca4)) throw "Propose Antecedent doesn't detect reflexives for multiple nouns in an NP";

        var cp4 = np2.createChild(["itself", "PRONOUN", 5, "NOUN"]);
        if (PronounAnaphora.proposeAntecedent(cp4, ca4)) throw "Propose Antecedent treats multiple nouns in an NP as reflexive singular";

        var cp5 = np1.createChild(["themselves", "PRONOUN", 4, "NOUN"]);
        if (PronounAnaphora.proposeAntecedent(cp5, ca4)) throw "Propose Antecedent detects reflexive even though ca4 and np5 are in different sentences";

        var ca5 = sentence1.createChild([
            ["The", "DETERMINER", 0, "NOUN"],
            ["boys", "NOUN", 1, "NOUN"] //Really good show btw
        ]);
        ca5.generateChildFromChunk();

        if (!PronounAnaphora.proposeAntecedent(cp5, ca5)) throw "Propose Antecedent doesn't treat boys as plural";

        var ca6 = sentence1.createChild([
            ["dUde", "NOUN", 0, "NOUN"]
        ]);
        ca6.generateChildFromChunk();

        if (PronounAnaphora.proposeAntecedent(cp1, ca6)) throw "Propose Antecedent doesn't match gender correctly (dude != f)";

        cp6 = np1.createChild(["himself", "PRONOUN", 1, "NOUN"]);
        if (!PronounAnaphora.proposeAntecedent(cp6, ca6)) throw "Propose Antecedent doesn't match reflexive gender correctly";
    }
    catch(err)
    {
        console.log("> testProposeAntecedent failed: " + err);
        return false;
    }
    
    return true;
}

/**
 * This tests PronounAnaphora.hobbs() - The hobb algorithm
 * @returns Whether Hobbs Algorithm works
 */
const testHobbs = () => {
    const root = RelationExtraction.Relation.buildFromPOSArr([
        [
            ["David", "PNOUN", 0, "NOUN"],
        ],
        [
            ["met", "VERB", 0, "VERB"],
        ],
        [
            ["Sarah", "PNOUN", 0, "NOUN"]
        ],
        [".", "PUNCTUATIONEND"],
        [
            ["A", "DETERMINER", 0, "NOUN"],
            ["girl", "PRONOUN", 1, "NOUN"],
            ["that", "SCONJ", 2, "NOUN"],
            ["ate", "VERB", 3, "NOUN"],
            ["with", "ADPOSITION", 4, "NOUN"],
            ["him", "PRONOUN", 5, "NOUN"],
        ],
        [
            ["drank", "VERB", 0, "VERB"]
        ],
        [
            ["herself", "PRONOUN", 0, "NOUN"]
        ]
    ]);

    const npDavid = root.children[0].children[0];
    const npSarah = root.children[0].children[2];
    const npGirl = root.children[1].children[0];
    const npHim = root.children[1].children[0].children[5];
    const npHerself = root.children[1].children[2].children[0];

    PronounAnaphora.hobbs(root);    

    try
    {
        if (npHerself.subject != npGirl) throw "Herself doesn't pronoun anaphora correctly.";
        if (npHim.subject != npDavid) throw "Him doesn't pronoun anaphora across sentences.";
    }
    catch(err)
    {
        console.log("> testProposeAntecedent failed: " + err);
        return false;
    }

    return true;
}

/**
 * Tests Detection.testNegations
 * @returns Whether or not Detection.testNegations work.
 */
const testTestNegations = () => {
    const root = RelationExtraction.Relation.buildFromPOSArr([
        [
            ["is", "IS", 0, "ADJECTIVE"],
            ["not", "PART", 1, "ADJECTIVE"],
            ["excited", "ADJECTIVE", 2, "ADJECTIVE"]
        ],
        [
            ["is", "IS", 0, "ADJECTIVE"],
            ["not", "PART", 1, "ADJECTIVE"],
            ["not", "PART", 2, "ADJECTIVE"],
            ["excited", "ADJECTIVE", 3, "ADJECTIVE"]
        ],
        [
            ["is", "IS", 0, "ADJECTIVE"],
            ["not", "PART", 1, "ADJECTIVE"],
            ["not", "PART", 2, "ADJECTIVE"],
            ["reverse", "PART", 2, "ADJECTIVE"],
            ["counter", "PART", 2, "ADJECTIVE"],
            ["not", "PART", 2, "ADJECTIVE"],
            ["opposite", "PART", 2, "ADJECTIVE"],
            ["rarely", "PART", 2, "ADJECTIVE"],
            ["excited", "ADJECTIVE", 3, "ADJECTIVE"]
        ],
        [
            ["is", "IS", 0, "ADJECTIVE"],
            ["not", "PART", 1, "ADJECTIVE"],
            ["excited", "ADJECTIVE", 2, "ADJECTIVE"],
            [",", "PUNCTUATION", 3, "ADJECTIVE"],
            ["glad", "ADJECTIVE", 4, "ADJECTIVE"],
            [",", "PUNCTUATION", 5, "ADJECTIVE"],
            ["or", "CONJUNCTION", 6, "ADJECTIVE"],
            ["sleepy", "ADJECTIVE", 7, "ADJECTIVE"]
        ],
        [
            ["is", "IS", 0, "ADJECTIVE"],
            ["not", "PART", 1, "ADJECTIVE"],
            ["excited", "ADJECTIVE", 2, "ADJECTIVE"],
            [",", "PUNCTUATION", 3, "ADJECTIVE"],
            ["not", "PART", 4, "ADJECTIVE"],
            ["glad", "ADJECTIVE", 5, "ADJECTIVE"],
            [",", "PUNCTUATION", 6, "ADJECTIVE"],
            ["and", "CONJUNCTION", 7, "ADJECTIVE"],
            ["not", "PART", 8, "ADJECTIVE"],
            ["sleepy", "ADJECTIVE", 9, "ADJECTIVE"]
        ]
    ]);

    const sentence1 = root.children[0];
    const normalNegate = sentence1.children[0];
    const doubleNegate = sentence1.children[1];
    const wackyNegate = sentence1.children[2];
    const factoredNegate = sentence1.children[3];
    const distributedNegate = sentence1.children[4];

    try
    {
        if (!Detection.testNegations(normalNegate)) throw "Normal Negation is not working properly";
        if (Detection.testNegations(doubleNegate)) throw "Double Negations aren't getting detected";
        if (!Detection.testNegations(wackyNegate)) throw "Multiple, mixed negations aren't getting detected properly";
        if (!Detection.testNegations(factoredNegate)) throw "Factored adj negations aren't getting checked";
        if (!Detection.testNegations(distributedNegate)) throw "Distributed adj negations aren't getting the correct treatment"; 
    }
    catch(err)
    {
        console.log("> testTestNegations failed: " + err);
        return false;
    }

    return true;
}

/**
 * Tests whether or not Detection.testContainMode works
 * Requires testTestNegations to also work.
 * @returns Whether it works
 */
const testContainMode = () => {
    const root = RelationExtraction.Relation.buildFromPOSArr([
        [
            ["Discord", "PNOUN", 0, "NOUN"],
            ["light", "ADJECTIVE", 1, "NOUN"],
            ["mode", "NOUN", 2, "NOUN"]
        ],
        [
            ["dark", "ADJECTIVE", 0, "NOUN"],
            ["theme", "NOUN", 1, "NOUN"],
            ["Discord", "PNOUN", 2, "NOUN"]
        ],
        [
            ["vanilla", "ADJECTIVE", 0, "NOUN"],
            ["popcorn", "NOUN", 1, "NOUN"],
            ["swirl", "NOUN", 2, "NOUN"]
        ],
        [
            ["slow", "ADJECTIVE", 0, "NOUN"],
            ["mode", "NOUN", 1, "NOUN"],
            ["on", "VERB", 2, "NOUN"]
        ],
        [
            ["light", "ADJECTIVE", 0, "NOUN"],
            ["mocha", "NOUN", 1, "NOUN"],
            ["caramel", "NOUN", 2, "NOUN"],
            ["frappuchino", "NOUN", 3, "NOUN"]
        ],
        [
            ["dark", "ADJECTIVE", 0, "NOUN"],
            ["chocolate", "NOUN", 1, "NOUN"],
            ["mousse", "NOUN", 2, "NOUN"],
            ["cake", "NOUN", 3, "NOUN"]
        ],
        [
            ["that", "DETERMINER", 0, "NOUN"],
            ["white", "ADJECTIVE", 1, "NOUN"],
            ["theme", "NOUN", 2, "NOUN"]
        ],
        [
            ["Discord", "PNOUN", 0, "NOUN"],
            ["default", "ADJECTIVE", 1, "NOUN"],
            ["font", "NOUN", 2, "NOUN"]
        ],
        [
            ["not", "PART", 0, "NOUN"],
            ["grey", "ADJECTIVE", 1, "NOUN"],
            ["amoled", "ADJECTIVE", 2, "NOUN"],
            ["mode", "NOUN", 3, "NOUN"]
        ],
        [
            ["not", "PART", 0, "NOUN"],
            ["not", "PART", 1, "NOUN"],
            ["dark", "ADJECTIVE", 2, "NOUN"],
            ["font", "NOUN", 3, "NOUN"]
        ],
        [
            ["the", "DETERMINANT", 0, "NOUN"],
            ["theme", "NOUN", 1, "NOUN"],
            ["that", "SCONJ", 2, "NOUN"],
            ["Justin", "PNOUN", 3, "NOUN"],
            ["uses", "VERB", 4, "NOUN"]
        ]
    ]);

    //Manually do rel extraction here
    root.children[0].children[10].children[4].subject = root.children[0].children[10].children[3];

    const lightModeBasic = root.children[0].children[0];
    const darkModeBasic = root.children[0].children[1];
    const neutralBasic = root.children[0].children[2];
    const neutralHasMode = root.children[0].children[3];
    const neutralHasLight = root.children[0].children[4];
    const neutralHasDark = root.children[0].children[5];
    const light = root.children[0].children[6];
    const dark = root.children[0].children[7];
    const lightNegated = root.children[0].children[8];
    const darkDoubleNegated = root.children[0].children[9];
    const lightJustin = root.children[0].children[10];

    try
    {
        if (Detection.testContainMode(lightModeBasic) != "light") throw "Normal light detection is not working properly";
        if (Detection.testContainMode(darkModeBasic) != "dark") throw "Normal dark detection is not working properly";
        if (Detection.testContainMode(neutralBasic) != "none") throw "Neutral detection not working";
        if (Detection.testContainMode(neutralHasMode) != "none") throw "Neutral not detected when only has mode word";
        if (Detection.testContainMode(neutralHasLight) != "none") throw "Neutral not detected when only has light"; 
        if (Detection.testContainMode(neutralHasDark) != "none") throw "Neutral not detected when only has dark"; 
        if (Detection.testContainMode(light) != "light") throw "Normal/Casual Light not detected"; 
        if (Detection.testContainMode(dark) != "dark") throw "Normal/Casual Dark not detected"; 
        if (Detection.testContainMode(lightNegated) != "light") throw "Correct node not detected when negated"; 
        if (Detection.testContainMode(darkDoubleNegated) != "dark") throw "Correct node not detected when double negated"; 
        if (Detection.testContainMode(lightJustin) != "light") throw "Light not detected when adding Justin context";
    }
    catch(err)
    {
        console.log("> testContainMode failed: " + err);
        return false;
    }

    return true;
}

/**
 * Tests Lemmatize.lemmatize. 
 * @return If Lemmatize.lemmatize works
 */
const testLemmatize = () => {
    try
    {
        if (Lemmatize.lemmatize("sleeping", "VERB") != "sleep") throw "Lemmatize not working for -ing";
        if (Lemmatize.lemmatize("created", "VERB") != "create") throw "Lemmatize not working for drop e add ed past tenses";
        if (Lemmatize.lemmatize("crashed", "VERB") != "crash") throw "Lemmatize not working for -ed";
        if (Lemmatize.lemmatize("crashes", "VERB") != "crash") throw "Lemmatize not working for -s";
        if (Lemmatize.lemmatize("slept", "VERB") != "sleep") throw "Lemmatize not working for past tense that drops ep with et";
        if (Lemmatize.lemmatize("dragged", "VERB") != "drag") throw "Lemmatize not working for double consonant past tense";
        if (Lemmatize.lemmatize("conjuring", "VERB") != "conjure") throw "Lemmatize not working for dropping e in ing";
        if (Lemmatize.lemmatize("swam", "VERB") != "swim") throw "Lemmatize not working for irregular past tense items";
    }
    catch(err)
    {
        console.log("> testLemmatize failed: " + err);
        return false;
    }

    return true;
}

/**
 * Tests SentimentAnalysis.sentimentAnalysis()
 * Not rly a unit test at this point bc it uses so many other stuff
 * @returns Whether the function works
 */
const testSentimentAnalysis = () => {
    try
    {
        const sent1 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["light", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
            ]
        ]);

        if (sentimentAnalysis(sent1) != -3) throw "Basic SA. failed";
        if (sentimentAnalysis(sent1, 2) != -1) throw "Positive bias # failed";
        if (sentimentAnalysis(sent1, -1) != -4) throw "Negative bias # failed";

        const sent2 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["dark", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
            ]
        ]);

        if (sentimentAnalysis(sent2) != 3) throw "SA can't detect between light & dark mode";

        const sent3 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["light", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
                [",", "PUNCTUATION", 3, "ADJECTIVE"],
                ["bad", "ADJECTIVE", 4, "ADJECTIVE"],   // -3
                [",", "PUNCTUATION", 5, "ADJECTIVE"],
                ["and", "CONJUNCTION", 6, "ADJECTIVE"],
                ["useless", "ADJECTIVE", 7, "ADJECTIVE"] // -2
            ]
        ]);

        if (sentimentAnalysis(sent3) != -8) throw "SA can't detect ADJ phrases with multiple items";

        const sent4 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["light", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
                [",", "PUNCTUATION", 3, "ADJECTIVE"],
                ["bad", "ADJECTIVE", 4, "ADJECTIVE"],   // -3
                [",", "PUNCTUATION", 5, "ADJECTIVE"],
                ["and", "CONJUNCTION", 6, "ADJECTIVE"],
                ["not", "PART", 7, "ADJECTIVE"],        //Negate below
                ["great", "ADJECTIVE", 8, "ADJECTIVE"] // 3
            ]
        ]);

        if (sentimentAnalysis(sent4) != -9) throw "SA can't detect negations properly";

        const sent5 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["dark", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
                [",", "PUNCTUATION", 3, "ADJECTIVE"],
                ["bad", "ADJECTIVE", 4, "ADJECTIVE"],   // -3
                [",", "PUNCTUATION", 5, "ADJECTIVE"],
                ["and", "CONJUNCTION", 6, "ADJECTIVE"],
                ["not", "PART", 7, "ADJECTIVE"],        //Negate below
                ["great", "ADJECTIVE", 8, "ADJECTIVE"] // 3
            ]
        ]);

        if (sentimentAnalysis(sent5) != 9) throw "SA negations don't mesh well with flipping Dark Mode theme";

        const sent6 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["dark", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
                [",", "PUNCTUATION", 2, "ADJECTIVE"],
                ["bad", "ADJECTIVE", 3, "ADJECTIVE"],   // -3
                [",", "PUNCTUATION", 4, "ADJECTIVE"],
                ["and", "CONJUNCTION", 5, "ADJECTIVE"],
                ["not", "PART", 6, "ADJECTIVE"],
                ["not", "PART", 7, "ADJECTIVE"],        //Double negation - does nothing
                ["great", "ADJECTIVE", 8, "ADJECTIVE"] // 3
            ]
        ]);

        if (sentimentAnalysis(sent6) != 3) throw "SA can't handle double negations";

        const sent7 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Discord", "PNOUN", 0, "NOUN"],
                ["dark", "ADJECTIVE", 1, "NOUN"],
                ["mode", "NOUN", 2, "NOUN"]
            ],
            [
                ["is", "IS", 0, "ADJECTIVE"],
                ["terrible", "ADJECTIVE", 1, "ADJECTIVE"], // -3
                [",", "PUNCTUATION", 3, "ADJECTIVE"],
                ["not", "PART", 4, "ADJECTIVE"],    //Double negation - does nothing
                ["not", "PART", 5, "ADJECTIVE"],
                ["bad", "ADJECTIVE", 6, "ADJECTIVE"],   // -3
                [",", "PUNCTUATION", 7, "ADJECTIVE"],
                ["and", "CONJUNCTION", 8, "ADJECTIVE"],
                ["not", "PART", 9, "ADJECTIVE"],        //Negate below
                ["great", "ADJECTIVE", 10, "ADJECTIVE"] // 3
            ]
        ]);

        if (sentimentAnalysis(sent7) != 9) throw "SA can't handle double negations and negations at the same time";
    
        //From here on out, double negations + role flips are covered since they use the same code

        const sent8 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Light", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ],
            [
                ["is", "IS", 0, "COMPARISON"], 
                ["better", "COMPARISON", 1, "COMPARISON"],  // 2
                ["than", "SCONJ", 2, "COMPARISON"]
            ],
            [
                ["dark", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ]
        ]);

        if (sentimentAnalysis(sent8) != 2) throw "SA comparisons failing";

        const sent9 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Light", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ],
            [
                ["is", "IS", 0, "COMPARISON"],
                ["not", "PART", 1, "COMPARISON"],        // Negation
                ["better", "COMPARISON", 2, "COMPARISON"], // 2
                ["than", "SCONJ", 3, "COMPARISON"]
            ],
            [
                ["dark", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ]
        ]);

        if (sentimentAnalysis(sent9) != -2) throw "SA comparisons can't handle negation";

        const sent10 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Light", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ],
            [
                ["viciously", "ADVERB", 0, "VERB"],  // -2 
                ["attacked", "VERB", -1, "VERB"]     // -1
            ],
            [
                ["dark", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ]
        ]);

        if (sentimentAnalysis(sent10) != 3) throw "SA can't handle VPs";

        const sent11 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["Light", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ],
            [
                ["was", "IS", 6, "VERB"],
                ["attacked", "VERB", 7, "VERB"], // -1
                ["by", "ADPOSITION", 8, "VERB"],
            ],
            [
                ["dark", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ]
        ]);

        if (sentimentAnalysis(sent11) != -1) throw "SA can't handle reflexive VPs";

        const sent12 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["The", "DETERMINER", 0, "NOUN"],
                ["evil", "ADJECTIVE", 1, "NOUN"], // -3     But remember it's calling dark mode evil so + 3
                ["dark", "ADJECTIVE", 2, "NOUN"],
                ["mode", "NOUN", 3, "NOUN"]
            ],
            [
                ["died", "VERB", 0, "VERB"] // -3           But remember this is about dark mode so + 3
            ]
        ]);

        if (sentimentAnalysis(sent12) != 6) throw "SA can't handle ADJs inside the NP";
    
        const sent13 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["The", "DETERMINER", 0, "NOUN"], 
                ["cat", "NOUN", 1, "NOUN"],
                ["that", "SCONJ", 2, "NOUN"],
                ["is", "IS", 3, "NOUN"],
                ["tired", "ADJECTIVE", 4, "NOUN"]
            ],
            [
                ["is", "IS", 0, "COMPARISON"], 
                ["better", "COMPARISON", 1, "COMPARISON"],
                ["than", "SCONJ", 2, "COMPARISON"]
            ],
            [
                ["the", "DETERMINER", 0, "NOUN"], 
                ["sleepy", "ADJECTIVE", 1, "NOUN"],
                [",", "PUNCTUATION", 2, "NOUN"],
                ["barking", "ADJECTIVE", 3, "NOUN"],
                ["dog", "NOUN", 4, "NOUN"],
                ["that", "SCONJ", 5, "NOUN"],
                ["was", "IS", 6, "NOUN"],
                ["attacked", "VERB", 7, "NOUN"],
                ["by", "ADPOSITION", 8, "NOUN"],
                ["a", "DETERMINER", 9, "NOUN"],
                ["bus", "PRONOUN", 10, "NOUN"]
            ]
        ]);

        if (sentimentAnalysis(sent13) != 0) throw "SA tried to do something when it's not talking about light mode/dark mode";

        const sent14 = RelationExtraction.Relation.extractFromPOSArr([
            [
                ["I", "PRONOUN", 0, "NOUN"]
            ],
            [
                ["hate", "VERB", 0, "VERB"]
            ],
            [
                ["light", "ADJECTIVE", 0, "NOUN"],
                ["mode", "NOUN", 1, "NOUN"]
            ]
        ]);

        PronounAnaphora.hobbs(sent14);

        if (sentimentAnalysis(sent14) != -3) throw "SA doesn't calculate VP linking to two NPs correctly";
    }
    catch(err)
    {
        console.error("> testSentimentAnalysis failed: " + err);
        console.error(err.stack);
        return false;
    }

    return true;
}

/**
 * Runs all the unit tests and prints results of whether they're working properly.
 */
module.exports.runTests = async () => {
    console.log("----------RUNNING TESTS--------------");

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
        testLookBehind,
        testRelationExtraction,
        testCapitalizeFirstLetter,
        testScout,
        testProposeAntecedent,
        testHobbs,
        testTestNegations,
        testLemmatize,
        testContainMode,
        testSentimentAnalysis
    ];
    
    for (test of toTest)
    {
        await test() ? console.log(`✔️ ${test.name} is working properly!`) : console.log(`❌ ${test.name} failed.`);
    }
}

this.runTests();