/*
Main Entrance portal for Light Mode Defender!
This bot detects whether or not a sentence (used in Srs Bot - Discord Post) is anti-light mode
Actually it a number from 0 (not anti-light mode) to 1 (anti-light mode)
*/

const POS = require("./Script/POS.js");
const RelationExtraction = require("./Script/RelationExtraction.js");
const PronounAnaphora = require("./Script/PronounAnaphora.js");
const SentimentAnalysis = require("./Script/SentimentAnalysis.js");

module.exports.main = async (sentence) => {
    sentence = sentence.trim();
    const calculate = await POS.calculate();

    let posChunk = POS.chunkSentence(calculate(sentence));
    let root = RelationExtraction.Relation.extractFromPOSArr(posChunk);

    PronounAnaphora.hobbs(root);
    let result = SentimentAnalysis.sentimentAnalysis(root);

    return result;
}