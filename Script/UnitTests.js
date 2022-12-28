/*
    A ton of unit tests from module.exports to make sure things don't go haywire
    Also it makes sure the program doesn't blow up
*/
const Helper = require("./Helper");
const POS = require("./POS");

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
 * Runs all the unit tests and prints results of whether they're working properly.
 */
module.exports.runTests = async () => {
    console.log("----------RUNNING UNIT TESTS--------------");

    //Functions are objects so run through all these and test them
    const toTest = [
        testFixSpaces,
        testCleanseContract,
        testReadPOS,
        testCalcPOS
    ];
    
    for (test of toTest)
    {
        await test() ? console.log(`✔️ ${test.name} is working properly!`) : console.log(`❌ ${test.name} failed.`);
    }
}

this.runTests();