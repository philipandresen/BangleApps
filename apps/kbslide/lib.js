function input(initial) {
  const width         = 50;
  const height        = 40;
  const margin        = 5;
  const offsetX       = 5;
  const offsetY       = 43;
  const padding       = 2;
  const border        = 2;
  const gridWidth     = 3;
  let typed           = initial && initial.text || "";
  let resolveFunction = () => {
  };
  let shift = false;
  const cursorChar = "_";
  let nextChar = cursorChar;

  const charSets = [
    ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    ["j", "k", "l", "m", "n", "o", "p", "q", "r"],
    ["s", "t", "u", "v", "w", "x", "y", "z", " "],
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    ["0", "-", "=", ",", ".", "/", ";", "'", "\\"],
    ["[", "]"]
  ];

  const charSetsShift = [
    ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    ["J", "K", "L", "M", "N", "O", "P", "Q", "R"],
    ["S", "T", "U", "V", "W", "X", "Y", "Z", " "],
    ["!", "@", "#", "$", "%", "^", "&", "*", "("],
    [")", "_", "+", "<", ">", "?", ":", "\"", "|"],
    ["{", "}"],
  ];

  function drawKey(key) {
    let bgColor = g.theme.bg;
    if (key.special === "ok") bgColor = "#0F0";
    if (key.special === "<-") bgColor = "#F00";
    if (key.special === "del") bgColor = g.theme.bg2;
    if (key.special === "shft") {
      bgColor = shift ? g.theme.bgH : g.theme.bg2;
    }
    g.setColor(g.theme.fg)
     .fillRect({x: key.x, y: key.y, w: key.w, h: key.h, r: 9});
    g.setColor(bgColor)
     .fillRect({x: key.x + key.bord, y: key.y + key.bord, w: key.w - 2 * key.bord, h: key.h - 2 * key.bord, r: 9});
    drawChars(key);
  }

  function drawChars(key) {
    if (key.chars.length > 1) {
      for (let i = 0; i < key.chars.length; i++) {
        const gridx = i % 3;
        const gridy = Math.floor(i / 3) % 3;
        const posx  = key.pad + key.x + gridx * ((key.w / 2 - key.pad) - 6) + 3;
        const posy  = key.pad + key.y + gridy * ((key.h / 2 - key.pad) - 8) + 4;
        g.setColor(g.theme.fg)
         .setFont("6x8")
         .drawString(key.chars[i], posx, posy, true);
      }
    } else if (key.chars.length === 1) {
      g.setColor(g.theme.fg)
       .setFont("12x20")
       .drawString(key.chars[0], key.x + key.w / 2 - 6, key.y + key.h / 2 - 10, true);
    } else if (key.chars.length === 0) {
      if (key.special) {
        g.setColor(g.theme.fg)
         .setFont("12x20")
         .drawString(key.special, key.x + key.w / 2 - g.stringWidth(key.special)/2, key.y + key.h / 2 - 10, false);
      }
    }
  }

  function getKeys(charSets) {
    const keys = [];
    charSets.forEach((charSet, i) => {
      key       = getKeyByIndex(i);
      key.chars = charSet;
      keys.push(key);
    });
    return keys;
  }

  function getKeyByIndex(i, special) {
    const gridx = i % gridWidth;
    const gridy = Math.floor(i / gridWidth) % gridWidth;
    const x     = padding + gridx * (width + margin) + offsetX;
    const y     = padding + gridy * (height + margin) + offsetY;
    const w     = width;
    const h     = height;
    let bgCol   = g.theme.bg;
    return {x, y, w, h, pad: padding, bord: border, chars: [], special};
  }

  const mainKeys = getKeys(charSets);
  const mainKeysShift = getKeys(charSetsShift);
  mainKeys.push(getKeyByIndex(7, "del"));
  mainKeys.push(getKeyByIndex(8, "ok"));
  mainKeys.push(getKeyByIndex(6, "shft"));
  mainKeysShift.push(getKeyByIndex(7, "del"));
  mainKeysShift.push(getKeyByIndex(8, "<-"));
  mainKeysShift.push(getKeyByIndex(6, "shft"));

  function getMainKeySet(shift) {
    return shift ? mainKeysShift : mainKeys;
  }

  function getSubKeys(key) {
    const subKeyCharSet = key.chars.map(char => [char]);
    return getKeys(subKeyCharSet);
  }

  function drawKeys(keys) {
    keys.forEach(key => {
      drawKey(key);
    });
  }

  function drawTyped(text) {
    g.setColor(g.theme.bg2)
     .fillRect(5, 5, 171, 30);
    g.setColor(g.theme.fg2)
     .setFont("12x20")
     .drawString(text, 10, 10, false);
  }

  let isCursorVisible = true;
  const blinkInterval = setInterval(() => {
    isCursorVisible = !isCursorVisible;
    if (isCursorVisible) {
      drawTyped(typed + nextChar);
    } else {
      drawTyped(typed);
    }
  }, 200);

  function clearKeySpace() {
    g.setColor(g.theme.bg)
     .fillRect(offsetX, offsetY, 176, 176);
  }

  function getPressedKey(dragEvent, keys, onlyRelease) {
    nextChar = cursorChar;
    return keys.reduce((pressed, key) => {
      if (dragEvent.x < key.x) return pressed;
      if (dragEvent.x > key.x + key.w) return pressed;
      if (dragEvent.y < key.y) return pressed;
      if (dragEvent.y > key.y + key.h) return pressed;
      if (onlyRelease) {
        // Make the cursor flash the hovered letter if it exists.
        if (dragEvent.b === 0) {
          nextChar = cursorChar;
        } else {
          nextChar = key.chars[0] ? key.chars[0] : cursorChar;
          return;
        }
      }
      return key;
    }, null);
  }

  g.clear(true);

  function mainKeyPress(dragEvent) {
    const pressedKey = getPressedKey(dragEvent, getMainKeySet(shift), false);
    if (pressedKey) {
      if (pressedKey.special === "ok") {
        if (dragEvent.b === 0) {
          // Seems to be a race condition between drag events and touch events
          // This timeout helps us make sure the touch event has resolved before
          // returning to the previous UI.
          setTimeout(() => resolveFunction(typed), 50);
        }
        return;
      }
      if (pressedKey.special === "del") {
        if (dragEvent.b === 0) {
          typed = typed.slice(0, -1);
          drawTyped(typed);
        }
        return;
      }
      if (pressedKey.special === "shft") {
        if (dragEvent.b === 0) {
          shift = !shift;
          enterMainKeyMode();
        }
        return;
      }
      if (pressedKey.special === "<-") {
        if (dragEvent.b === 0) {
          setTimeout(() => resolveFunction(), 50);
        }
        return;
      }
      enterSubKeyMode(pressedKey);
    }
  }

  function subKeyPress(subKeys, dragEvent) {
    const releasedKey = getPressedKey(dragEvent, subKeys, true);
    if (releasedKey) {
      typed = typed + releasedKey.chars[0];
      shift = false;
      drawTyped(typed);
      enterMainKeyMode();
    }
    if (dragEvent.b === 0) {
      enterMainKeyMode();
    }
  }

  function enterSubKeyMode(key) {
    const subKeys = getSubKeys(key);
    clearKeySpace();
    drawKeys(subKeys);
    Bangle.setUI();
    Bangle.setUI({
                   mode: "custom", drag: (dragEvent) => subKeyPress(subKeys, dragEvent)
                 });
  }

  function enterMainKeyMode() {
    clearKeySpace();
    drawKeys(getMainKeySet(shift));
    Bangle.setUI();
    Bangle.setUI({
                   mode: "custom", drag: mainKeyPress
                 });
  }

  enterMainKeyMode();
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