export const koboldSyllables = new Map<string, number>([
  ["ik", 6],
  ["awk", 4],
  ["kwa", 3],
  ["tka", 2],
  ["tkå", 2],
  ["kow", 4],
  ["ko", 6],
  ["kó", 6],
  ["wok", 3],
  ["kwo", 2],
  ["owk", 2],
  ["ówk", 2],
  ["ak", 5],
  ["þo", 2],
  ["þa", 2],
]);

export const punctuation = new Map<string, number>([
  [".", 4],
  ["!", 2],
  ["?", 1],
]);

const badAdjectives = new Map<string, number>([
  ["scurrilous", 1],
  ["treacherous", 2],
  ["villanous", 2],
  ["besmirched", 1],
  ["perfidious", 2],
  ["shifty", 1],
  ["faithless", 1],
  ["conniving", 3],
  ["cowardly", 3],
  ["prevaricatory", 1],
  ["scheming", 5],
  ["mendacious", 2],
  ["insidious", 2],
  ["conniving", 2],
  ["unscrupulous", 2],
  ["vile", 4],
  ["wicked", 5],
  ["nefarious", 4],
  ["depraved", 1],
  ["deplorable", 1],
  ["felonious", 1],
  ["peccant", 1],
  ["sinful", 4],
  ["dammnable", 2],
  ["dammned", 2],
  ["accursed", 4],
  ["despicable", 4],
  ["base", 4],
  ["filthy", 4],
  ["abject", 4],
  ["loathsome", 4],
  ["contemptible", 4],
  ["wretched", 4],
  ["ignonimous", 2],
  ["degenerate", 4],
]);

function rouletteWheel(map: Map<string, number>) {
  let arr = [];
  let ind = 0;
  // roulette wheel
  for (const entry of map) {
    for (let i = 0; i < entry[1]; i++) {
      arr[ind++] = entry[0];
    }
  }
  return arr;
}

function random(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getKoboldTitle() {
  const adj = rouletteWheel(badAdjectives);
  const title = capitalize(random(adj));
  const name = getKoboldPhrase(0, 2, true, false);
  return `${name} the ${title} Kobold`;
}

export function getKoboldWord() {
  const arr = rouletteWheel(koboldSyllables);

  const wordSize = Math.ceil(Math.random() * 3);
  let word = "";
  for (let i = 0; i < wordSize; i++) {
    let w = random(arr);
    // remove duplicative letters
    if (w.charAt(0) === word.charAt(word.length - 1)) {
      word = word.concat(w.substring(1, w.length - 1));
    } else {
      word = word.concat(w);
    }
  }
  return word;
}

export function getKoboldPhrase(
  minLen?: number,
  maxLen?: number,
  capitalized?: boolean,
  punctuate?: boolean,
) {
  const phraseWords =
    (minLen ? minLen : 2) + Math.floor(Math.random() * (maxLen ? maxLen : 4));
  let phrase = "";
  for (let i = 0; i < phraseWords; i++) {
    if (i > 0) {
      phrase = phrase.concat(" ");
    }
    let word = getKoboldWord();
    if (capitalized) {
      word = capitalize(word);
    }
    phrase = phrase.concat(word);
  }
  if (punctuate) {
    const arr = rouletteWheel(punctuation);
    phrase = phrase.concat(random(arr));
  }
  return phrase;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
