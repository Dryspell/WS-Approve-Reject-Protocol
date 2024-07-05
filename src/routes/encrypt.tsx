import { createSignal } from "solid-js";

const encryptionTable = {
  ".": ["e", "t", "a", "o", "i", "n", "s", "r", "h"],
  ":": ["l", "d", "c", "u", "m", "f", "g", "p", "w"],
  "(": ["y", "b", "v", "k", "x", "j", "q", "z"],
};

const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

const encryptionTableEntries = Object.entries(encryptionTable);

const encrypt = (text: string) => {
  let previousPair = null as [string, number] | null;

  return text
    .toLowerCase()
    .split("")
    .map((char, i) => {
      if (char === ".") {
        previousPair = [".", previousPair ? previousPair[1] : 0];
        return ")";
      }

      const encryptionPair = encryptionTableEntries
        .filter(([key, values]) => values.includes(char))
        .map(([key, value]) => [key, value.indexOf(char) + 1] as [string, number])[0];

      if (!encryptionPair) return char;

      if (!previousPair) {
        previousPair = encryptionPair;
        return encryptionPair.join("");
      } else {
        const [previousKey, previousIndex] = previousPair;
        const [currentKey, currentIndex] = encryptionPair;
        if (previousIndex === currentIndex) return currentKey;
        if (previousKey === currentKey) {
          previousPair = encryptionPair;
          return currentIndex.toString();
        } else {
          previousPair = encryptionPair;
          return encryptionPair.join("");
        }
      }
    })
    .join("");
};

const secondaryEncryption = (text: string) => {
  const tex = text.toLowerCase().split("");

  const encryptedText = [] as string[];
  for (let i = 0; i < tex.length; i++) {
    const char = tex[i];
    const nextChar = tex[i + 1];

    if ((char === "." && nextChar === ",") || (char === "," && nextChar === ".")) {
      encryptedText.push(";");
      i++;
      continue;
    }

    if (!parseInt(char)) encryptedText.push(char);
    if (!nextChar) {
      encryptedText.push(alphabet[parseInt(char) - 1]);
      continue;
    } else {
      if (parseInt(nextChar) && alphabet[parseInt(char + nextChar) - 1]) {
        i++;
        encryptedText.push(alphabet[parseInt(char + nextChar) - 1]);
        continue;
      } else {
        encryptedText.push(alphabet[parseInt(char) - 1]);
        continue;
      }
    }
  }
  return encryptedText.join("");
};

export default function EncryptPage() {
  const [inputText, setInputText] = createSignal("");
  return (
    <main class="flex h-screen flex-col items-center">
      <div class="m-2 p-2">
        <input
          type="text"
          placeholder="Enter text to encrypt"
          onInput={e => setInputText(e.currentTarget.value)}
        />
        <p class="m-1 p-1">{inputText()}</p>
        <p class="m-1 p-1">{encrypt(inputText())}</p>
        <p class="m-1 p-1">{secondaryEncryption(encrypt(inputText()))}</p>
      </div>
    </main>
  );
}
