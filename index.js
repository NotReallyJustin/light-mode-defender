/*
    Main Entrance portal for Light Mode Defender!
    This bot detects whether or not a sentence (used in Srs Bot - Discord Post) is anti-light mode
    If it's positive, it's pro-light mode. If it's negative, it's anti-light mode.

    🙃 To see the actual package srs bot will use, check package.js
*/

const { main } = require("./package.js");

//Test the bot by scanning sentences/inputs! 🎃
//Type 'exit' to exit
function scan()
{
    const leScan = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log("Start printing:");

    leScan.on("line", async sentence => {
        if (sentence == "exit")
        {
            leScan.close();
            return;
        }

        let result = await main(sentence);

        if (result == 0)
        {
            console.log("Sentence is neutral, or very close to neutral that it doesn't matter.");
        }
        else if (result < 0)
        {
            console.log(`Sentence is anti-light mode. Strength: ${result}`);
        }
        else
        {
            console.log(`Sentence is pro-light mode. Strength: ${result}`);
        }
    });

    leScan.once("close", () => {
        console.log("Light Mode Defender scan closed");
    });
}

scan();