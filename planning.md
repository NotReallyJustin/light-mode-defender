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

Use it or lose it momento but we can prolly DP this
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