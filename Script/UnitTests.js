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
        if (Helper.cleanseContractions(test[0]).toUpperCase() != test[1].toUpperCase())
        {
            console.log(`> testCleanseContract failed: ${test[0]} !--> ${test[1]}`);
            worked = false;
        }
    });

    return worked;
}

const testPOS = async () => {
    await POS.readPOSData()
}

/**
 * Runs all the unit tests and prints results of whether they're working properly.
 */
module.exports.runTests = () => {
    console.log("----------RUNNING UNIT TESTS--------------");

    //Functions are objects so run through all these and test them
    [
        testFixSpaces,
        testCleanseContract
    ].forEach(async test => {
        await test() ? console.log(`✔️ ${test.name} is working properly!`) : console.log(`❌ ${test.name} failed.`);
    });
}