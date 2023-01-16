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

## Relation Extraction Rules
The item to relate to will be in all caps <br><br>
**For Verb Phrases**: <br>
```
1. Determine if the verb phrase like "is running" or "is ___ing"
2. If they are, link [NOUN/PNOUN/PRONOUN as subject] [verb phrase] [NOUN/PRONOUN/PNOUN as object if they exist]		--> ie. "She is running from the dog"
3. Determine if the verb phrase is like "was ran over by" or "has been bonked by"
4. If they are, link [NOUN/PNOUN/PRONOUN as object if they exist] [verb phrase] [NOUN/PRONOUN/PNOUN as subject]		--> ie. "She was ran over by a car"
5. If the verb phrase has neither, it's just a regular word. 
6. Link [NOUN/PNOUN/PRONOUN as subject] [verb phrase] [NOUN/PRONOUN/PNOUN as object if they exist]		--> ie. "She ran from the dog"

Missing part --> Deal with "had run from"
``` 
<br> <br>

**For Comparison Phrases**: <br>
```
1. Link [NOUN/PRONOUN/PNOUN as subject] [comparison phrase] [NOUN/PRONOUN/PNOUN as object if there's something like "compared to (VERB-COMP)" or "than" (SCONJ) in the comp phrase]
ie. "a is better than b"
```
<br> <br>

**For Adjective Phrases** <br>
```
1. Link [NOUN/PRONOUN/PNOUN] [adjective phrase]		--> ie. The cat is bad
``` 
<br>
This works because any [adjective phrase] [NP] gets chunked as a noun phrase
<br><br>

**For Adverb Phrases** <br>
```
1. Start from the current index (that contains the adverb). Then go to the right and left at the same time to find the closest verb
2. Once you find the closest verb, link [VERB] [adverb phrase] or [adverb phrase] [VERB]
3. However, if you encounter a punctuation without a conjunction when you're moving left, stop. That's a different verb the adverb doesn't affect (ie. slept well, QUICKLY). 
	The exception to this is if the pos before the punctuation is also an ADVERB, in which case you have an adverb chain (ie. ran quickly, SWIFTLY, and quietly)
4. If you encounter a verb on the right that has a punctuation without a conjunction, stop. (ie. QUICKLY, slept well) vs (ie. QUICKLY, quitely, and sneakily crawled)
```
<br><br>

**For Noun Phrases** <br>
```
1. Look at the children in the noun phrase. Look through every word in there because shit is related
2. Look behind for NOUNs and IS. If you see a second noun or pronoun while also seeing "IS", link [SECOND NOUN] [first noun as subject of second noun]. As a shortcut, if you see /COMPARISON|ADJECTIVE|\bVERB\b|PUNCTUATIONEND/gmi, this means the current noun is not going to be a metaphor for another word. Break; the search
3. IMMEDIATELY determine whether something is in an is-chain (basically, "that IS __________" or "that HAD _______" or " that WAS ________"). The IS CHAIN ends when the current POS is not an adjective, verb, conjunction, punctuation, or adverb (comparisons aren't chunked as NPs so don't worry about that IS BETTER THAN _______)
4. Rel extract the adjectives. If you're in an is-chain, look behind. Or else, look ahead.
5. Rel extract the verbs. Fortunately, since you're in a noun-phrase, the verbs only serve to describe the subject and object of that noun phrase. Start at the current index and look forward & backward at the same time until you can link [NOUN] [verb] or [verb] [NOUN]. If you're in an isChain (ie. axe was used by Justin), link [NOUN as object] [verb] [NOUN as subject]. If not (ie. Justin used axe), link [NOUN as subject] [verb] [NOUN as object]
```
<br>
The logic behind the is-chain is that the only time you'll see an is chain is when you have a pronoun that substitutes the main noun subject. <br>
Basically, when you have "that" as the main subject and you need to use "that __" (the is-chain) to describe it

# 4) Pronoun Anaphora
## Some Tools
**JSON data of pronouns:** <br>
```json
{"he":{"plural":false,"gender":"m","reflexive":false},"him":{"plural":false,"gender":"m","reflexive":false},"his":{"plural":false,"gender":"m","reflexive":false},"himself":{"plural":false,"gender":"m","reflexive":true},"she":{"plural":false,"gender":"f","reflexive":false},"her":{"plural":false,"gender":"f","reflexive":false},"hers":{"plural":false,"gender":"f","reflexive":false},"herself":{"plural":false,"gender":"f","reflexive":true},"it":{"plural":false,"gender":"n","reflexive":false},"its":{"plural":false,"gender":"n","reflexive":false},"zim":{"plural":false,"gender":"n","reflexive":false},"zie":{"plural":false,"gender":"n","reflexive":false},"zir":{"plural":false,"gender":"n","reflexive":false},"zis":{"plural":false,"gender":"n","reflexive":false},"zieself":{"plural":false,"gender":"n","reflexive":true},"they":{"plural":true,"gender":"n","reflexive":false},"them":{"plural":true,"gender":"n","reflexive":false},"their":{"plural":true,"gender":"n","reflexive":false},"theirs":{"plural":true,"gender":"n","reflexive":false},"themselves":{"plural":true,"gender":"n","reflexive":true},"themself":{"plural":false,"gender":"n","reflexive":true},"I":{"plural":false,"gender":"n","reflexive":false},"my":{"plural":false,"gender":"n","reflexive":false},"mine":{"plural":false,"gender":"n","reflexive":false},"mines":{"plural":false,"gender":"n","reflexive":false},"myself":{"plural":false,"gender":"n","reflexive":true},"you":{"plural":false,"gender":"n","reflexive":false},"your":{"plural":false,"gender":"n","reflexive":false},"yours":{"plural":false,"gender":"n","reflexive":false},"yourself":{"plural":false,"gender":"n","reflexive":true},"yourselves":{"plural":true,"gender":"n","reflexive":true}}
```
<br> <br>

**Pluralize/Singularize RegExp:** <br>
```js
//Adapted version of kuwamoto's pluralize algorithm
plural = {
    '(quiz)$'               : "$1zes",
    '^(ox)$'                : "$1en",
    '([m|l])ouse$'          : "$1ice",
    '(matr|vert|ind)ix|ex$' : "$1ices",
    '(x|ch|ss|sh)$'         : "$1es",
    '([^aeiouy]|qu)y$'      : "$1ies",
    '(hive)$'               : "$1s",
    '(?:([^f])fe|([lr])f)$' : "$1$2ves",
    '(shea|lea|loa|thie)f$' : "$1ves",
    'sis$'                  : "ses",
    '([ti])um$'             : "$1a",
    '(tomat|potat|ech|her|vet)o$': "$1oes",
    '(bu)s$'                : "$1ses",
    '(alias)$'              : "$1es",
    '(octop)us$'            : "$1i",
    '(ax|test)is$'          : "$1es",
    '(us)$'                 : "$1es",
    '([^s]+)$'              : "$1s"
};

singular = {
    '(quiz)zes$'             : "$1",
    '(matr)ices$'            : "$1ix",
    '(vert|ind)ices$'        : "$1ex",
    '^(ox)en$'               : "$1",
    '(alias)es$'             : "$1",
    '(octop|vir)i$'          : "$1us",
    '(cris|ax|test)es$'      : "$1is",
    '(shoe)s$'               : "$1",
    '(o)es$'                 : "$1",
    '(bus)es$'               : "$1",
    '([m|l])ice$'            : "$1ouse",
    '(x|ch|ss|sh)es$'        : "$1",
    '(m)ovies$'              : "$1ovie",
    '(s)eries$'              : "$1eries",
    '([^aeiouy]|qu)ies$'     : "$1y",
    '([lr])ves$'             : "$1f",
    '(tive)s$'               : "$1",
    '(hive)s$'               : "$1",
    '(li|wi|kni)ves$'        : "$1fe",
    '(shea|loa|lea|thie)ves$': "$1f",
    '(^analy)ses$'           : "$1sis",
    '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$': "$1$2sis",        
    '([ti])a$'               : "$1um",
    '(n)ews$'                : "$1ews",
    '(h|bl)ouses$'           : "$1ouse",
    '(corpse)s$'             : "$1",
    '(us)es$'                : "$1",
    's$'                     : ""
};
``` 
<br>

Note that we modified the original pluralize algorithm because it was leaving out "e"s and other unholy British stuff <br>
How to use: <br>
```
1. Make a list of uncountable words. Ignore those that come into the pluralize algorithm.
2. Make a list of irregular verbs. Map them 1 --> 1 as they come in.
3. If the conditions on the left match for single and plural JSON, replace it with the right
	(A note here: $1 == first [and only in these arrays] capturing group)
```

## Proposing Antecedents
Basically, given a pronoun and an antecedent (noun phrase), return whether the pronoun could represent the antecedent <br>
When you propse one of these, make sure the gender (or lack of gender in case of things like tables), reflexive, and numbers match <br><br>

**Determine Number Match**<br>
```
1. Run the findNoun method in Relation on the antecedent. If it returns 0 nouns, return false because it's impossible.
2. If the antecedent has 2+ nouns and pronoun is plural, we good. If not, we bad.
3. If the antecedent has only 1 noun, determine whether that noun is plural:
	3a. If that noun cannot be made singular/plural (ie. the plural of sheep is still sheep) - we good with number match. Read more here: https://www.englishlci.edu/blog/english-grammar-lessons/did-you-know-that-these-words-have-no-plural/#:~:text=The%20words%20%E2%80%9Cmoose%2C%E2%80%9D%20%E2%80%9C,The%20moose%20is%2Fare%20migrating.
	3b. Put the noun under a plural --> singular noun translator. If the noun before and after the translator are the same, that means the noun is singular. If the noun turned out to have changed, then it's a plural noun.
```
<br> <br>

**Determine Gender Match** <br>
```
1. If the antecedent is plural, completely ignore this step because English doesn't do something like ellOs/ellAs
2. If the antecedent is singular, check if you have a PNOUN.
3. If you have a PNOUN, check to see if it's in boyNames.txt or girlNames.txt to confirm the gender.
4. If you don't have a PNOUN, check all the ways you can refer to women and all the ways you can refer to men. See if the noun contains any of those words for gender.
5. Make sure the gender matches
```
<br><br>

**Determine Reflexive Match** <br>
```
1. If the pronoun is reflexive, make sure the pronoun and antecedent are part of the same sentence
    Pronoun belongs in a NP usually and the antecedent is an NP, so pronoun.parent.parent == antecedent.parent
```

## That Weird Hobb's Thing 
Follow the instructions <a href="https://www.usna.edu/Users/cs/nchamber/courses/nlp/s15/slides/set14-coreference.pdf">here</a> <br>
I tried some supervised learning stuff and deterministic stuff myself and they all have like 0% accuracy so just use this for now <br>
This is the flakiest part of the program. <br><br>

Hobbs broken down since we chunked it slightly differently: <br>
```
0. Depth first search from left to right for all children of root (sentences)
1. If you see a pronoun, start at the pronoun
2. Climb the Relation node until you see the NP chunk for the pronoun
3. Traverse all the child nodes of the NP before the pronoun node. Propose any nouns.
4. Call the NP chunk node X
5. If node X is a sentence, traverse the previous sentences' children left to right breadth first. Propose any NPs you see along the way as antecedents. STOP algorithm.
6. If node X is not a sentence, go up until you see a sentence.
7. Traverse breadth first all child nodes of the sentence to the left of node X (right to left). Propose any NPs you see as antecedents.
8. Call the sentence node X
9. Go back to step 5
```
<br> <br>
Side note: handle stuff like "light mode said to dark mode 'i am dumb'" because the algorithm would link I --> Dark mode <br>
Also side note: handle stuff like "Bob has a dog. I petted it" because the algorithm would link I --> Bob <br>
Also side note: handle "She's a great cat and her name is Becca" because Becca never gets discovered <br>
Also side note: handle the clusterfuck that is step 8 in the manual because the more I look at it, the worse it gets.

# 5) Find which NOUN PHRASEs mention light mode

# 6) Find Negations

# 7) Sentiment Analysis all light mode noun phrases

# 8) Return score

# 9) ???
## Write tests for everything
I'll get to that probably in 2077

# 10) Religious Victory