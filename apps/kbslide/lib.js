function input(initial) {
  let typed           = initial && initial.text || "";
  let resolveFunction = () => {};
  let shift           = false;
  let activeKeySet;

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

  const width         = 50;
  const height        = 44;
  const margin        = 5;
  const offsetX       = 5;
  const offsetY       = 30;
  const padding       = 2;
  const border        = 2;
  const gridWidth     = 3;

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
         .drawString(key.special, key.x + key.w / 2 - g.stringWidth(key.special) / 2, key.y + key.h / 2 - 10, false);
      }
    }
  }

  function getKeys(charSets) {
    const keys = [];
    charSets.forEach((charSet, i) => {
      const key = getKeyByIndex(i);
      key.chars = charSet;
      if (key.chars.length > 1) {
        key.subKeys = getKeys(key.chars);
      }
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

  const mainKeys      = getKeys(charSets);
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

  function drawKeys(keys) {
    keys.forEach(key => {
      drawKey(key);
    });
  }

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
      swapKeySet(getMainKeySet(shift));
      return;
    }
    // Haptic feedback
    Bangle.buzz(25, 1);
    if (pressedKey.subKeys) {
      if (touchEvent.type > 1) {
        shift = !shift;
        swapKeySet(getMainKeySet(shift));
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
        swapKeySet(getMainKeySet(shift));
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
        swapKeySet(getMainKeySet(shift));
        break;
      case "<-":
        setTimeout(() => resolveFunction(), 50);
        break;
    }
  }

  Bangle.setUI({
    mode: "custom", touch: keyTouch
  });
  swapKeySet(getMainKeySet(shift));
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