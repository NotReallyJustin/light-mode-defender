# Ideally this happens 🎃
**Srs Bot gets:** "Fuck light mode all my homies hate light mode delete this already" <br>
**LMD (Light Mode Defender) goes:** This is anti-light mode propaganda (88% accuracy) <br>
**Srs Bot sends:** "😤😤😤 shut this light's brighter than your future 😤😤😤"

# Overall Plan
1. Tag POS
2. Get POS Phrases / Chunk it
3. Take care of the pronouns (pronoun anaphora stuff)
4. Find out which phrases mention light mode
5. Take care of negations
6. Sentiment Analysis every phrase that mentions light mode
7. Return a score
8. ???
9. Discord HQ bows down before the cult, goes to church, and removes dark mode from the app

# 1) Tag POS (POS.js)
## Hidden Markov Models
Hidden == Has hidden states; Markov Model == Probability of the next item depends on previous item<br>
Find the probability of a word being a certain POS (transmission probability) * probability of POS following another POS (emission probability) <br><br>

To find the total probability, multiply all the probabilities up and then find the maximum probability of them all<br><br>

## Psuedocode Recursive method of finding the probability
```
1. Create memoization map
2. Create function findMaxProbability(currentState, trackingArray) where currentState is the current POS state you're using
3. For all previous states that connect to the current state, findMaxProbability() of those states. If it's already memoized, fetch it
4. Get the transmission * emission probability that those previous states will connect to the current state
5. The maximum probability you got from step 4 is the maximum probability that the sentence's POS lands on the current state
6. Memoize that probability somewhere
7. Return the max
8. End function findMaxProbability
9. Run findMaxProbability() on the end node/state
```
## Viterbi's Algorithm apparently exists XD
If you don't want to blow up the call stack (because it's going to be a lot of recursion), use Viterbi's algorithm prolly <br>
```
1. Start from the first word/state. Find the transmission * (emission probability with respect to the start node/state) for all states of that word.
2. Go onto the next word. Find the transmission * (emission probability with respect to all the states of the last word) * (probability of the last node --> AKA probability that all the previous words are in the POS order that they are) for all states of the current word
3. For each state, take the maximum probability you got from step 2.
4. Get rid of the states in the previous word because that just clogs up memory and you're done using it
5. Repeat steps 2-4 until you get to the end
6. Take the state (or rather, the chain of states) with the maximum probability you get at the end
```
It kinda works like the recursion method but you're starting from the ground up <br>
Viterbi is finding shortest path logically like a normal human being would

## smh justin data doesn't appear out of thin air
I know we steal copypasta from Reddit <br>
Also we do a bit of trolling with the NYT
## Getting more data
Run [file name goes here] and it'll generate a POS output file. Then clean it and throw it in [Training Data/POSData.txt]

# 2) POS Chunking
## Regular Expressions
First, write the regular expressions that fit in a certain POS phrase (ie. What are the POS components of a noun phrase?) <br>
Go from the most precise to the most generic capturing group because chances are, you'll capture more this way <br>
Create test sentences, identify the POS phrases, and try to make a RegEx rule for them <br><br>

ie. "The cat that I bought last year in Alaska" should be a noun phrase. Hence, a RegEx is "DETERMINER NOUN SCONJ PRONOUN VERB ADJECTIVE NOUN ADPOSITION PNOUN"
## Chunking
Before you do ANY chunking, convert the sentence into a string of POS seperated by words because that's how the Regular Expressions work <br>
Then make a map that will map the starting indexes of each POS to their corresponding index in words (basically, index 8 in the POS sentence corresponds to the 2nd word) <br>
Use JSON probably, it's easier. Add a property that determines whether the POS is occupied (or has already been chunked) to prevent double chunking <br>
```
1. Iterate through each regular expression you have
2. Find the indexes of ALL regular expression matches, and the ending indexes of ALL regular expresion matches
3. Anything within those index ranges are part of your POS chunk!
4. Now, mark everything in those ranges as occupied and yeet them in the np array
5. Remember to sort the np array by which one comes first (basically, sort by corresponding POS index)
```
# 3) Relation Extraction
## MYOD (Make your own node lol thank RobbyQ for the name)
Create a class called Relation. Relation will act like a node. <br />
<img src="https://i.imgur.com/7RpzTgn.png" /> <br />
The goal is to treat each sentence as a hierarchy of POS components. The child relation is a part of the parent relation. In human words, it should ideally look like this: <br>
<img src="https://i.imgur.com/FEjK1G9.png" /> <br />
After making the relation nodes that act in hierarchal order, we describe things much more easily and visualize POS.js: <br>
<img src="https://i.imgur.com/FwYDzb2.png" /> <br />
<img src="https://i.imgur.com/1Sm0f2L.png" /> <br />

## Methods
Add some methods to save some time down the line. Ideas: <br />
```
1. A toString() that returns all the text belonging to the relation node (like sentence text that belongs)
2. Please add createChild() method because it's such a pain to manually create and append a child node, and then you get into referencing problems
3. findNoun(). Find the actual noun in a noun phrase because NPs come with a bunch of nonsense
```

## Helpy functions
It's kind of like RegExp but we're hardcoding it <br>
Create a lookAhead() and lookBehind() function that will find a POS chunk or POS type (both represented by relation nodes) before or after the current relation node. These are stolen from Srs Bot Running before revamp<br>
<br>

```js
const lookAhead = (levelNode, desiredPOSType, findChunk, startIdx) => {
	for (var i = startIdx; i < levelNode.length; i++)
	{
		if (levelNode[i].pos == desiredPOSType && levelNode[i].isChunk == findChunk)
		{
			return levelNode[i];
		}
	}
	return null;
}

const lookBehind = (levelNode, desiredPOSType, findChunk, startIdx) => {
	for (var i = startIdx - 1; i >= 0; i--)
	{
		if (levelNode[i].pos == desiredPOSType && levelNode[i].isChunk == findChunk)
		{
			return levelNode[i];
		}
	}
	return null;
}
``` 

# 4) Pronoun Anaphora

# 5) Find which NOUN PHRASEs mention light mode

# 6) Find Negations

# 7) Sentiment Analysis all light mode noun phrases

# 8) Return score

# 9) ???
## Write tests for everything
I'll get to that probably in 2077

# 10) Religious Victory