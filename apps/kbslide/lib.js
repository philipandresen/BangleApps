/**
 * Given initial options, allow the user to type a set of characters and return their entry in a promise. If you do not
 * submit your own character set, a default alphanumeric keyboard will display.
 * @example
 * input({
 *     text: "Initial text",
 *     charSets: [["a", "b", "c", "d", "e", "f", "g"], ["1", "2", "3", "4"], ["="], ["ok"], ["del"], ["caps"]],
 *     charSetsShift: [["A", "B", "C", "D", "E", "F", "G"], ["!", "@", "#", "$"], ["cncl"], ["del"], ["caps"]],
 * }).then(typedText => {console.log(typedText);});
 * @param options The object containing initial options for the keyboard.
 * @param {string} options.text The initial text to display / edit in the keyboard
 * @param {array[]|string[]} [options.charSets] An array of arrays of characters. Each array becomes a key that, when
 *   pressed, takes the user to a sub-keyboard of that array's characters. If you define your own character set, you
 *   can include arrays containing special strings to serve as buttons. These can be ["ok"] ["cncl"] ["del"] ["shft"]
 *   ["spc"] or ["caps"]. You can include either the special "spc" button or just use the " " character. Individual
 *   letters in their own arrays will be given dedicated buttons.
 * @param {array[]|string[]} [options.charSetsShift] Identical to options.charSets however these keys will only be
 *   displayed when the "SHFT" or "CAPS" key has been pressed.
 * @param {string} [options.chars] Similar to options.charSets but just a single string. The keyboard will
 *   automatically divide the string into keys and subkeys.
 * @param {string} [options.charsShift] Similar to options.chars but only visible after the user hits "SHFT" or "CAPS"
 * @returns {Promise<unknown>}
 */

function input(options) {
  options             = options || {};
  let typed           = options.text || "";
  let resolveFunction = () => {};
  let shift           = false;
  let caps            = false;
  let activeKeySet;

  const charSets = options.charSets || options.chars && createCharSet(options.chars, ["ok", "del", "caps"]) || [
    ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    ["j", "k", "l", "m", "n", "o", "p", "q", "r"],
    ["s", "t", "u", "v", "w", "x", "y", "z", "0"],
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    [" ", "`", "-", "=", "[", "]", "\\", ";", "'"],
    [",", ".", "/"],
    ["ok"],
    ["caps"],
    ["del"]
  ]

  const charSetsShift = options.charSetsShift || options.charsShift && createCharSet(options.charsShift,
    ["cncl", "del", "caps"]) || [
    ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    ["J", "K", "L", "M", "N", "O", "P", "Q", "R"],
    ["S", "T", "U", "V", "W", "X", "Y", "Z", ")"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "("],
    ["~", "_", "+", "{", "}", "|", ":", "\"", "<"],
    [">", "?"],
    ["ok"],
    ["caps"],
    ["del"]
  ];

  /**
   * Attempt to lay out a set of characters in a logical way to optimize the number of buttons with the number
   * of characters per button. Useful if you need to dynamically (or frequently) change your character set
   * and don't want to create a layout for ever possible combination.
   * @param text The text you want to parse into a character set.
   * @param specials Any special buttons you want to add to the keyboard (must match hardcoded special string values)
   * @returns {*[]}
   */
  function createCharSet(text, specials) {
    specials                 = specials || [];
    const mandatoryExtraKeys = specials.length;
    const preferredNumChars  = [1, 2, 4, 6, 9, 12];
    const preferredNumKeys   = [4, 6, 9, 12].map(num => num - mandatoryExtraKeys);
    let keyIndex             = 0, charIndex = 0;
    let keySpace             = preferredNumChars[charIndex] * preferredNumKeys[keyIndex];
    while (keySpace < text.length) {
      const numKeys      = preferredNumKeys[keyIndex];
      const numChars     = preferredNumChars[charIndex];
      const nextNumKeys  = preferredNumKeys[keyIndex];
      const nextNumChars = preferredNumChars[charIndex];
      if (numChars <= numKeys) {
        charIndex++;
      } else if ((text.length / nextNumChars) < nextNumKeys) {
        charIndex++;
      } else {
        keyIndex++;
      }
      console.log(keyIndex, charIndex);
      keySpace = preferredNumChars[charIndex] * preferredNumKeys[keyIndex];
    }
    const charsPerKey = preferredNumChars[charIndex];
    const charSet     = [];
    for (let i = 0; i < text.length; i += charsPerKey) {
      charSet.push(text.slice(i, i + charsPerKey)
                       .split(""));
    }
    specials.forEach(special => {
      charSet.push([special]);
    });
    return charSet;
  }

  const offsetX       = 5;
  const offsetY       = 32;
  const margin        = 3;
  const keyDrawWidth  = 176 - offsetX;
  const keyDrawHeight = 176 - offsetY;

  function drawKey(key) {
    let bgColor = g.theme.bg;
    if (key.special === "ok") bgColor = "#0F0";
    if (key.special === "cncl") bgColor = "#F00";
    if (key.special === "del") bgColor = g.theme.bg2;
    if (key.special === "spc") bgColor = g.theme.bg2;
    if (key.special === "shft") {
      bgColor = shift ? g.theme.bgH : g.theme.bg2;
    }
    if (key.special === "caps") {
      bgColor = caps ? g.theme.bgH : g.theme.bg2;
    }
    g.setColor(g.theme.fg)
     .fillRect({x: key.x, y: key.y, w: key.w, h: key.h, r: 1});
    g.setColor(bgColor)
     .fillRect({x: key.x + key.bord, y: key.y + key.bord, w: key.w - 2 * key.bord, h: key.h - 2 * key.bord, r: 1});
    drawChars(key);
  }

  function drawChars(key) {
    const numChars = key.chars.length;
    if (key.special) {
      g.setColor(g.theme.fg)
       .setFont("12x20")
       .setFontAlign(-1, -1)
       .drawString(key.special, key.x + key.w / 2 - g.stringWidth(key.special) / 2, key.y + key.h / 2 - 10, false);
    } else {
      const gridWidth    = Math.ceil(Math.sqrt(numChars));
      const gridHeight   = Math.ceil(numChars / gridWidth);
      const pad          = key.pad;
      const bestFont     = getBestFont(key.w - pad, key.h - pad, 0, gridWidth, gridHeight);
      const letterWidth  = bestFont.w;
      const letterHeight = bestFont.h;
      const totalWidth   = (gridWidth - 1) * (key.w / gridWidth) + pad + letterWidth + 1;
      const totalHeight  = (gridHeight - 1) * (key.h / gridHeight) + pad + letterHeight + 1;
      const extraPadH    = (key.w - totalWidth) / 2;
      const extraPadV    = (key.h - totalHeight) / 2;
      for (let i = 0; i < numChars; i++) {
        const gridX   = i % gridWidth;
        const gridY   = Math.floor(i / gridWidth) % gridWidth;
        const offsetX = gridX * (key.w / gridWidth);
        const offsetY = gridY * (key.h / gridHeight);
        const posX    = key.x + pad + offsetX + extraPadH;
        const posY    = key.y + pad + offsetY + extraPadV;
        g.setColor(g.theme.fg)
         .setFont(bestFont.font)
         .setFontAlign(-1, -1)
         .drawString(key.chars[i], posX, posY, false);
      }
    }
  }

  function getBestFont(width, height, padding, gridWidth, gridHeight) {
    let font            = "4x6";
    let w               = 4;
    let h               = 6;
    const charMaxWidth  = width / gridWidth - padding * gridWidth;
    const charMaxHeight = height / gridHeight - padding * gridHeight;
    if (charMaxWidth >= 6 && charMaxHeight >= 8) {
      w    = 6;
      h    = 8;
      font = "6x8"
    }
    if (charMaxWidth >= 12 && charMaxHeight >= 16) {
      w    = 12;
      h    = 16;
      font = "6x8:2"
    }
    if (charMaxWidth >= 12 && charMaxHeight >= 20) {
      w    = 12;
      h    = 20;
      font = "12x20"
    }
    if (charMaxWidth >= 20 && charMaxHeight >= 20) {
      w    = charMaxWidth;
      h    = charMaxHeight;
      font = "Vector" + Math.floor(Math.min(w, h));
    }
    return {w, h, font};
  }

  function getKeys(characterArrays) {
    const keys = [];
    characterArrays.forEach((characterArray, i) => {
      let special;
      if (characterArray[0].length > 1) {
        special = characterArray[0];
      }
      const key = getKeyByIndex(characterArrays, i, special);
      if (!special) {
        key.chars = characterArray;
      }
      if (key.chars.length > 1) {
        key.subKeys = getKeys(key.chars);
      }
      keys.push(key);
    });
    return keys;
  }

  function getKeyByIndex(charSet, i, special) {
    const padding    = 4;
    const border     = 2;
    const gridWidth  = Math.ceil(Math.sqrt(charSet.length));
    const gridHeight = Math.ceil(charSet.length / gridWidth);
    const keyWidth   = Math.floor(keyDrawWidth / gridWidth) - margin;
    const keyHeight  = Math.floor(keyDrawHeight / gridHeight) - margin;
    const gridx      = i % gridWidth;
    const gridy      = Math.floor(i / gridWidth) % gridWidth;
    const x          = gridx * (keyWidth + margin) + offsetX;
    const y          = gridy * (keyHeight + margin) + offsetY;
    const w          = keyWidth;
    const h          = keyHeight;
    let bgCol        = g.theme.bg;
    return {x, y, w, h, pad: padding, bord: border, chars: [], special};
  }

  const mainKeys      = getKeys(charSets);
  const mainKeysShift = getKeys(charSetsShift);

  function getMainKeySet(shift) {
    return shift ? mainKeysShift : mainKeys;
  }

  function drawKeys(keys) {
    keys.forEach(key => {
      drawKey(key);
    });
  }

  function drawTyped(text, cursorChar) {
    cursorChar      = cursorChar || "_";
    let visibleText = text;
    let ellipsis    = false;
    const maxWidth  = 176 - 40;
    while (g.setFont("12x20")
            .stringWidth(visibleText) > maxWidth) {
      ellipsis    = true;
      visibleText = visibleText.slice(1);
    }
    if (ellipsis) {
      visibleText = "..." + visibleText;
    }
    g.setColor(g.theme.bg2)
     .fillRect(5, 5, 171, 30);
    g.setColor(g.theme.fg2)
     .setFont("12x20")
     .drawString(visibleText + cursorChar, 15, 10, false);
  }

  let isCursorVisible = true;
  const blinkInterval = setInterval(() => {
    isCursorVisible = !isCursorVisible;
    if (isCursorVisible) {
      drawTyped(typed, "_");
    } else {
      drawTyped(typed, "");
    }
  }, 200);

  function clearKeySpace() {
    g.setColor(g.theme.bg)
     .fillRect(offsetX, offsetY, 176, 176);
  }

  g.clear(true);

  function getTouchedKey(touchEvent, keys) {
    return keys.reduce((pressed, key) => {
      if (touchEvent.x < key.x) return pressed;
      if (touchEvent.x > key.x + key.w) return pressed;
      if (touchEvent.y < key.y) return pressed;
      if (touchEvent.y > key.y + key.h) return pressed;
      return key;
    }, null);
  }

  function keyTouch(button, touchEvent) {
    const pressedKey = getTouchedKey(touchEvent, activeKeySet);
    if (pressedKey == null) {
      // User tapped empty space.
      swapKeySet(getMainKeySet(shift !== caps));
      return;
    }
    // Haptic feedback
    Bangle.buzz(25, 1);
    if (pressedKey.subKeys) {
      if (touchEvent.type > 1) {
        shift = !shift;
        swapKeySet(getMainKeySet(shift !== caps));
      } else {
        swapKeySet(pressedKey.subKeys);
      }
    } else {
      if (pressedKey.special) {
        evaluateSpecialFunctions(pressedKey);
      } else {
        typed = typed + pressedKey.chars;
        shift = false;
        drawTyped(typed);
        swapKeySet(getMainKeySet(shift !== caps));
      }
    }
  }

  function swapKeySet(newKeys) {
    activeKeySet = newKeys;
    clearKeySpace();
    drawKeys(activeKeySet);
  }

  function evaluateSpecialFunctions(key) {
    switch (key.special) {
      case "ok":
        setTimeout(() => resolveFunction(typed), 50);
        break;
      case "del":
        typed = typed.slice(0, -1);
        drawTyped(typed);
        break;
      case "shft":
        shift = !shift;
        swapKeySet(getMainKeySet(shift !== caps));
        break;
      case "caps":
        caps = !caps;
        swapKeySet(getMainKeySet(shift !== caps));
        break;
      case "cncl":
        setTimeout(() => resolveFunction(), 50);
        break;
      case "spc":
        typed = typed + " ";
        break;
    }
  }

  Bangle.setUI({
    mode: "custom", touch: keyTouch
  });
  swapKeySet(getMainKeySet(shift !== caps));
  Bangle.setLocked(false);

  return new Promise((resolve, reject) => {
    // We want to be able to call this resolve outside of the promise declaration scope
    // I'm opting to do this because we are relying on user input mediated outside the
    // scope of the code where the promise is declared.
    resolveFunction = resolve;
  }).then((result) => {
    g.clearRect(Bangle.appRect);
    clearInterval(blinkInterval);
    Bangle.setUI();
    return result;
  });
}

exports.input = input;