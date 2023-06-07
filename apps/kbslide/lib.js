/**
 * Given initial options, allow the user to type a set of characters and return their entry in a promise. If you do not
 * submit your own character set, a default alphanumeric keyboard will display.
 * @example
 * input({
 *     text: "Initial text",
 *     charSets: [["a", "b", "c", "d", "e", "f", "g"], ["1", "2", "3", "4"], ["="], "ok", "del", "caps"],
 *     charSetsShift: [["A", "B", "C", "D", "E", "F", "G"], ["!", "@", "#", "$"], "cncl", "del", "caps"],
 * }).then(typedText => {console.log(typedText);});
 * @param options The object containing initial options for the keyboard.
 * @param {string} options.text The initial text to display / edit in the keyboard
 * @param {array[]|string[]} [options.charSets] An array of arrays of characters. Each array becomes a key that, when
 *   pressed, takes the user to a sub-keyboard of that array's characters. If you define your own character set, you
 *   can include special strings to serve as buttons. These can be "ok" "cncl" "del" "shft" "spc" or "caps". You can
 *   include either the special "spc" button or just use the " " character. Individual letters in their own arrays will
 *   be given dedicated buttons.
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
    "ok",
    "caps",
    "del"
  ]

  const charSetsShift = options.charSetsShift || options.charsShift && createCharSet(options.charsShift,
    ["cncl", "del", "caps"]) || [
    ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    ["J", "K", "L", "M", "N", "O", "P", "Q", "R"],
    ["S", "T", "U", "V", "W", "X", "Y", "Z", ")"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "("],
    ["~", "_", "+", "{", "}", "|", ":", "\"", "<"],
    [">", "?"],
    "ok",
    "caps",
    "del"
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

  /**
   * Draw an individual keyboard key - handles special formatting and the rectangle pad, followed by the character
   * rendering. Returns a promise so that you can do many of these in a loop without blocking the thread.
   * @param key
   */
  function drawKey(key) {
    return new Promise((resolve, reject) => {
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
       .fillRect({x: key.x, y: key.y, w: key.w, h: key.h, r: 3});
      g.setColor(bgColor)
       .fillRect({x: key.x + key.bord, y: key.y + key.bord, w: key.w - 2 * key.bord, h: key.h - 2 * key.bord, r: 3});
      drawChars(key);
      resolve();
    })
  }

  /**
   * Draw the characters for a given key - this handles the layout of all characters needed for the key, whether the
   * key has 12 characters, 1, or if it represents a special key.
   * @param key
   */
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

  /**
   * Given the width, height, padding (between chars) and number of characters that need to fit horizontally /
   * vertically, this function attempts to select the largest font it can that will still fit within the bounds when
   * drawing a grid of characters. Does not handle multi-letter entries well, assumes we are laying out a grid of
   * single characters.
   * @param width The total width available for letters (px)
   * @param height The total height available for letters (px)
   * @param padding The amount of space required between characters (px)
   * @param gridWidth The number of characters wide the rendering is going to be
   * @param gridHeight The number of characters high the rendering is going to be
   * @returns {{w: number, h: number, font: string}}
   */
  function getBestFont(width, height, padding, gridWidth, gridHeight) {
    let font            = "4x6";
    let w               = 4;
    let h               = 6;
    const charMaxWidth  = width / gridWidth - padding * gridWidth;
    const charMaxHeight = height / gridHeight - padding * gridHeight;
    if (charMaxWidth >= 6 && charMaxHeight >= 8) {
      w    = 6;
      h    = 8;
      font = "6x8";
    }
    if (charMaxWidth >= 12 && charMaxHeight >= 16) {
      w    = 12;
      h    = 16;
      font = "6x8:2";
    }
    if (charMaxWidth >= 12 && charMaxHeight >= 20) {
      w    = 12;
      h    = 20;
      font = "12x20";
    }
    if (charMaxWidth >= 20 && charMaxHeight >= 20) {
      font       = "Vector" + Math.floor(Math.min(charMaxWidth, charMaxHeight));
      const dims = g.setFont(font)
                    .stringMetrics("W");
      w          = dims.width
      h          = dims.height;
    }
    return {w, h, font};
  }

  /**
   * Generate a set of key objects given an array of arrays of characters to make available for typing.
   * @param characterArrays
   * @returns {*[]}
   */
  function getKeys(characterArrays) {
    const keys = [];
    characterArrays.forEach((characterArray, i) => {
      let special;
      if (!Array.isArray(characterArray) && characterArray.length > 1) {
        // If it's not an array we assume it's a string. Fingers crossed I guess, lol. Be nice to my functions!
        special = characterArray;
      }
      const key = getKeyByIndex(characterArrays, i, special);
      if (!special) {
        key.chars = characterArray;
      }
      if (key.chars.length > 1) {
        /*
         This is a little hack - we know the user is going to have to touch the screen before we need to do anything
         with subkeys - we're taking a "get to it when you get ot it" knowing it will be done before we need it.
         */
        new Promise(resolve => {
          key.subKeys = getKeys(key.chars);
        })
      }
      keys.push(key);
    });
    return keys;
  }

  /**
   * Given a set of characters (or sets of characters) get the position and dimensions of the i'th key in that set.
   * @param charSet An array where each element represents a key on the hypothetical keyboard.
   * @param i The index of the key in the set you want to get dimensions for.
   * @param special The special property of the key - for example "del" for a key used for deleting characters.
   * @returns {{special, bord: number, pad: number, w: number, x: number, h: number, y: number, chars: *[]}}
   */
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
    return {x, y, w, h, pad: padding, bord: border, chars: [], special};
  }

  const mainKeys      = getKeys(charSets);
  const mainKeysShift = getKeys(charSetsShift);

  /**
   * Get the key set corresponding to the indicated shift state. Allows easy switching between capital letters and
   * lower case by just switching the boolean passed here.
   * @param shift
   * @returns {*[]}
   */
  function getMainKeySet(shift) {
    return shift ? mainKeysShift : mainKeys;
  }

  /**
   * Draw all the given keys on the screen.
   * @param keys
   */
  function drawKeys(keys) {
    keys.forEach(key => {
      drawKey(key);
    });
  }

  /**
   * Draw the text that the user has typed so far, includes a cursor and automatic truncation when the string is too
   * long.
   * @param text
   * @param cursorChar
   */
  function drawTyped(text, cursorChar) {
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

  /**
   * Clear the space on the screen that the keyboard occupies (not the text the user has written).
   */
  function clearKeySpace() {
    g.setColor(g.theme.bg)
     .fillRect(offsetX, offsetY, 176, 176);
  }

  g.clear(true);

  /**
   * Based on a touch even, determine which key was pressed by the user.
   * @param touchEvent
   * @param keys
   * @returns {*}
   */
  function getTouchedKey(touchEvent, keys) {
    return keys.find((key) => {
      let relX = touchEvent.x - key.x;
      let relY = touchEvent.y - key.y;
      return relX > 0 && relX < key.w && relY > 0 && relY < key.h;
    })
  }

  /**
   * On a touch event, determine whether a key is touched and take appropriate action if it is.
   * @param button
   * @param touchEvent
   */
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
      // Hold press for "shift!"
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
        drawTyped(typed, "");
        swapKeySet(getMainKeySet(shift !== caps));
      }
    }
  }

  /**
   * Manage setting, generating, and rendering new keys when a key set is changed.
   * @param newKeys
   */
  function swapKeySet(newKeys) {
    activeKeySet = newKeys;
    clearKeySpace();
    drawKeys(activeKeySet);
  }

  /**
   * Determine if the key contains any of the special strings that have their own special behaviour when pressed.
   * @param key
   */
  function evaluateSpecialFunctions(key) {
    switch (key.special) {
      case "ok":
        setTimeout(() => resolveFunction(typed), 50);
        break;
      case "del":
        typed = typed.slice(0, -1);
        drawTyped(typed, "");
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

  /**
   * We return a promise but the resolve function is assigned to a variable in the higher function scope. That allows
   * us to return the promise and resolve it after we are done typing without having to return the entire scope of the
   * application within the promise.
   */
  return new Promise((resolve, reject) => {
    resolveFunction = resolve;
  }).then((result) => {
    g.clearRect(Bangle.appRect);
    clearInterval(blinkInterval);
    Bangle.setUI();
    return result;
  });
}

exports.input = input;