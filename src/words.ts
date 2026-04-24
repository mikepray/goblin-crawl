export const koboldSyllables = new Map<string, number>([
  ["ik", 6],
  ["awk", 4],
  ["kwa", 3],
  ["tka", 2],
  ["kow", 4],
  ["ko", 6],
  ["wok", 3],
  ["kwo", 2],
  ["owk", 2],
  ["ak", 5],
  ["þo", 2],
  ["þa", 2],
]);

export const punctuation = new Map<string, number>([
  [".", 4],
  ["!", 2],
  ["?", 1],
]);

export function getKoboldWord() {
  let arr = [];
  let ind = 0;
  // roulette wheel
  for (const entry of koboldSyllables) {
    for (let i = 0; i < entry[1]; i++) {
      arr[ind++] = entry[0];
    }
  }

  const wordSize = Math.ceil(Math.random() * 3);
  let word = "";
  for (let i = 0; i < wordSize; i++) {
    word = word.concat(arr[Math.floor(Math.random() * arr.length)]);
  }
  return word;
}

export function getKoboldPhrase() {
  const phraseWords = 2 + Math.ceil(Math.random() * 4);
  let phrase = "";
  for (let i = 0; i < phraseWords; i++) {
    if (i > 0) {
      phrase = phrase.concat(" ");
    }
    phrase = phrase.concat(getKoboldWord());
  }

  let arr = [];
  let ind = 0;
  // roulette wheel
  for (const entry of punctuation) {
    for (let i = 0; i < entry[1]; i++) {
      arr[ind++] = entry[0];
    }
  }

  phrase = phrase.concat(arr[Math.floor(Math.random() * arr.length)]);
  return phrase;
}
