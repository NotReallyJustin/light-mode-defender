const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Helper = require("./Helper");

// ⭐ Whenever script is initiated, read the training data file
let leScan = readline.createInterface({
	input: fs.createReadStream(path.resolve(__dirname,'../Training Data/PosData.txt')),
	output: process.stdout,
	clrfDelay: Infinity,
	terminal: false
});

// ⭐ Calculate the probability