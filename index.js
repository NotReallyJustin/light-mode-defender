/*
Main Entrance portal for Light Mode Defender!
This bot detects whether or not a sentence (used in Srs Bot - Discord Post) is anti-light mode
Actually it a number from 0 (not anti-light mode) to 1 (anti-light mode)
*/

const main = (sentence) => {
    return "filler";
}

//Test the bot by scanning sentences/inputs! 🎃
//Type 'exit' to exit
function scan()
{
    const leScan = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });

    leScan.on("line", sentence => {
        if (sentence == "exit")
        {
            leScan.close();
            return;
        }

        console.log(main(sentence));
    });

    leScan.once("close", () => {
        console.log("Light Mode Defender scan closed");
    });
}

scan();