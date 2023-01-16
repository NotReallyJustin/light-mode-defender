//This file tracks, processed, and finds the gender of certain names
const path = require("path");
const fs = require('fs');
const { binarySearch, capitalizeFirstLetter } = require("./Helper");

const boyNames = fs.readFileSync(path.resolve(`${__dirname}`, '../Data/boyNames.txt')).toString().split("\r\n");
const girlNames = fs.readFileSync(path.resolve(`${__dirname}`, '../Data/girlNames.txt')).toString().split("\r\n");

/**
 * Finds whether or not a name exists in arrName file
 * Assumes that the arrName is already in alphabetical order (which it should be for boyNames.txt and girlNames.txt)
 * @param {String[]} arrName Name of the array to look for the name in
 * @param {String} name Name to look for. We automatically trim it and capitalize it properly
 * @returns A boolean of whether or not the name exists
 */
const scout = (arrName, name) => binarySearch(arrName, capitalizeFirstLetter(name)) != -1;
module.exports.scout = scout;

/**
 * Determine whether or not a name is a boy name
 * @param {String} name Name to look for
 * @returns Whether or not name exists in boyNames.txt
 */
module.exports.scoutBoy = name => scout(boyNames, name);

/**
 * Determine whether or not a name is a girl name
 * @param {String} name Name to look for
 * @returns Whether or not name exists in girlNames.txt
 */
module.exports.scoutGirl = name => scout(girlNames, name);