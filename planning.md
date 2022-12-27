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

**Psuedocode Recursive method of finding the probability** <br>
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
**Viterbi's Algorithm apparently exists**
If you don't want to blow up the call stack (because it's going to be a lot of recursion), use Viterbi's algorithm prolly <br>
```
1. Start from the first word/state. Find the transmission * (emission probability with respect to the start node/state) for all states of that word.
2. Go onto the next word. Find the transmission * (emission probability with respect to all the states of the last word) * (probability of the last node --> AKA probability that all the previous words are in the POS order that they are) for all states of the current word
3. For each state, take the maximum probability you got from step 2.
4. Get rid of the states in the previous word because that just clogs up memory and you're done using it
5. Repeat steps 2-4 until you get to the end
6. Take the state (or rather, the chain of states) with the maximum probability you get at the end
```
It kinda works like the recursion method but you're starting from the ground up

## smh justin data doesn't appear out of thin air
I know we steal copypasta from Reddit <br>
Also we do a bit of trolling with the NYT
## Getting more data
Run [file name goes here] and it'll generate a POS output file. Then clean it and throw it in [Training Data/POSData.txt]

# 2) POS Chunking

# 3) Pronoun Anaphora

# 4) Find which NOUN PHRASEs mention light mode

# 5) Find Negations

# 6) Sentiment Analysis all light mode noun phrases

# 7) Return score

# 8) ???
## Write tests for everything
I'll get to that probably in 2077

# 9) Religious Victory