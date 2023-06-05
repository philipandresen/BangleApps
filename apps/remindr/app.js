const Layout = require("Layout");

const localTaskFile = "remindr.settings.json";
const savedData     = require("Storage")
.readJSON(localTaskFile, true);
let tasks           = savedData && savedData.tasks || {};
const settings      = savedData && savedData.settings || {theme: g.theme};
const templates     = savedData && savedData.templates || {};
let taskTimeout     = null;
let responseTimeout = null;
let activeTaskId    = null;
Bangle.loadWidgets();
Bangle.drawWidgets();

const darkTheme = {
  fg  : 0xFFFF,  // foreground colour
  bg  : 0,       // background colour
  fg2 : 0xFFFF,  // accented foreground colour
  bg2 : 0x0007,  // accented background colour
  fgH : 0xFFFF,  // highlighted foreground colour
  bgH : 0x02F7,  // highlighted background colour
  dark: true,  // Is background dark (e.g. foreground should be a light colour)
};

const lightTheme = {
  fg  : 0,  // foreground colour
  bg  : 0xFFFF,       // background colour
  fg2 : "#000",  // accented foreground colour
  bg2 : 0xFFF8,  // accented background colour
  fgH : 0,  // highlighted foreground colour
  bgH : 0xFD08,  // highlighted background colour
  dark: false,  // Is background dark (e.g. foreground should be a light colour)
};

g.setTheme(settings.theme);

const mainMenuLayout = new Layout({
  type: "v", pad: 5, c: [
    {type: "txt", label: "-- WORKING --", font: "12x20"},
    {type: "txt", label: "MEMORY", font: "12x20"},
    {type: "btn", label: "New Task", fillx: 1, filly: 1, cb: () => addTask()},
    {type: "btn", label: "View Tasks", fillx: 1, filly: 1, cb: () => navManageTasks()},
    {type: "btn", label: "Settings", fillx: 1, cb: () => navSettings()}
  ]
});

const taskLayout = new Layout({
  type: "v", pad: 5, c: [
    {type: "txt", label: "-- Current Task --", font: "6x8"},
    {type: undefined, filly: 1},
    {type: "txt", id: "taskTitle", label: "", font: "Vector10"},
    {type: undefined, filly: 1},
    {type: "btn", label: "Done", fillx: 1, cb: () => affirmDone(activeTaskId)},
    {type: "btn", label: "Re-prioritize", fillx: 1, cb: () => changePriority(activeTaskId)}
  ]
});

const nudgeLayout = new Layout({
  type: "v", pad: 5, c: [
    {type: "txt", label: "-- Current Task --", font: "6x8"},
    {type: undefined, filly: 1},
    {type: "txt", id: "taskTitle", label: "", font: "Vector10"},
    {type: "txt", label: "-- Are you on task? --", font: "6x8"},
    {type: undefined, filly: 1},
    {
      type: "h", filly: 1, fillx: 1, c: [
        {
          type: "btn", col: "#0F0", label: "Yes!", fillx: 1, filly: 1, cb: () => {
            affirmOnTask(activeTaskId);
          }
        }, {
          type: "btn", col: "#F00", font: "6x8:2", label: "No!", fillx: 1, filly: 1, cb: () => {
            affirmDistracted(activeTaskId);
          }
        }
      ]
    },
    {type: undefined, filly: 1},
  ]
});

const prioritizeLayout = new Layout({
  type: "v", pad: 5, c: [
    {type: "txt", label: "Manage Task", font: "6x8"},
    {type: undefined, filly: 1},
    {type: "txt", id: "taskTitle", label: "-- re-prioritize --", font: "12x20"},
    {type: undefined, filly: 1},
    {type: "btn", label: "New Task", fillx: 1, cb: () => addTask()},
    {type: "btn", label: "View Tasks", fillx: 1, cb: () => navManageTasks()},
    {type: "btn", label: "Take a Break", fillx: 1, cb: () => takeABreak()},
  ]
});

function navMainMenu() {
  g.clear(true);
  Bangle.drawWidgets();
  mainMenuLayout.setUI();
  mainMenuLayout.update();
  mainMenuLayout.render();
}

function navTask(task) {
  g.clear(true);
  Bangle.drawWidgets();
  taskLayout.taskTitle.label = task.text;
  taskLayout.taskTitle.font  = task.font;
  taskLayout.setUI();
  taskLayout.update();
  taskLayout.render();
}

function navNudge(task) {
  g.clear(true);
  Bangle.drawWidgets();
  nudgeLayout.taskTitle.label = task.text;
  nudgeLayout.taskTitle.font  = task.font;
  nudgeLayout.setUI();
  nudgeLayout.update();
  nudgeLayout.render();
}

function navPrioritize() {
  g.clear(true);
  Bangle.drawWidgets();
  prioritizeLayout.setUI();
  nudgeLayout.update();
  prioritizeLayout.render();
}

navMainMenu();

function interruptTask() {
  clearTimeout(taskTimeout);
}

function addTask() {
  getText()
  .then(text => {
    if (!text) {
      navMainMenu();
      return;
    }
    const font        = getTaskFont(text);
    const newTask     = {
      id                : Math.round(getTime()),
      text,
      font,
      baseInterval      : 30,
      backoffScale      : [0.5, 1, 2, 3, 6, 10],
      reminderIndex     : 1,
      incrementalBackoff: true,
      distractCount     : 0,
      onTaskCount       : 0,
      unresponsiveCount : 0,
      complete          : false,
    };
    tasks[newTask.id] = newTask;
    saveTasksToFlash();
    startTask(newTask.id);
  });
}

function getTaskFont(text) {
  g.setFont("Vector", 176);
  const textWidth    = g.stringWidth(text);
  const vectorHeight = Math.min(Math.floor(160 * (176 / textWidth)), 50);
  const font         = "Vector" + vectorHeight;
  return font;
}

function navManageTasks() {
  const menu = {
    "": {
      title: "Pending Tasks", back: navMainMenu
    }
  };
  Object.keys(tasks)
        .forEach(taskId => {
          const task  = tasks[taskId];
          const label = task.text;
          if (!task.complete) {
            menu[label] = () => navEditTask(task.id);
          }
        });
  E.showMenu(menu);
}

function saveTasksToFlash() {
  const data = {
    tasks, settings, templates
  };
  require("Storage")
  .writeJSON(localTaskFile, data);
}

function navEditTask(taskId) {
  const task = tasks[taskId];
  interruptTask();
  const menu = {
    ""                      : {
      title: task.text, back: navManageTasks
    }, "Start Task"         : () => startTask(taskId), "Edit Title": () => {
      getText(task.text)
      .then(result => {
        if (result) {
          task.text = result;
          task.font = getTaskFont(result);
          saveTasksToFlash();
        }
        navEditTask(taskId);
      });
    }, "Interval"           : {
      value: task.baseInterval, min: 10, max: 300, step: 10, wrap: false, onchange: v => {
        task.baseInterval = v;
        saveTasksToFlash();
      }
    }, "Incremental Backoff": {
      value: task.incrementalBackoff, format: v => v ? "Yes" : "No", onchange: v => {
        task.incrementalBackoff = v;
        saveTasksToFlash();
      }
    },
  };
  E.showMenu(menu);
}

function navSettings() {
  const menu = {
    ""            : {
      title: "Settings", back: navMainMenu
    }, "Theme"    : {
      value: g.theme.dark, format: v => v ? "Dark" : "Light", onchange: v => {
        if (v) {
          g.setTheme(darkTheme);
        } else {
          g.setTheme(lightTheme);
        }
        settings.theme = g.theme;
        saveTasksToFlash();
        navSettings();
      }
    }, "Templates": navTemplates,
  };
  E.showMenu(menu);
}

function navTemplates() {
  const menu = {
    ""                   : {
      title: "Templates", back: navSettings
    }, "New From Pending": createTemplate,
  };
  Object.keys(templates)
        .forEach(templateId => {
          const template      = templates[templateId];
          menu[template.name] = () => editTemplate(templateId);
        });
  E.showMenu(menu);
}

function createTemplate() {
  getText()
  .then(result => {
    if (result) {
      const templateId   = Math.round(getTime());
      const pendingTasks = {};
      for (let id of Object.keys(tasks)) {
        const task = tasks[id];
        if (!task.complete) {
          const newTaskId           = task.id + "t";
          const taskCopy            = JSON.parse(JSON.stringify(task));
          taskCopy.id               = newTaskId;
          pendingTasks[taskCopy.id] = taskCopy;
        }
      }
      templates[templateId] = {
        name: result, tasks: pendingTasks
      };
    }
    navTemplates();
  });
}

function editTemplate(templateId) {
  const template = templates[templateId];
  const menu     = {
    ""               : {title: template.name, back: navTemplates},
    "Replace Pending": () => applyTemplate(templateId),
    "Add to Pending" : () => appendTemplate(templateId),
    "Rename Template": () => renameTemplate(templateId),
    "Delete Template": () => deleteTemplate(templateId)
  };
  Object.keys(template.tasks)
        .forEach(taskId => {
          const task      = template.tasks[taskId];
          menu[task.text] = undefined;
        });
  E.showMenu(menu);
}

function renameTemplate(templateId) {
  getText()
  .then(result => {
    if (result) {
      templates[templateId].name = result;
    }
    editTemplate(templateId);
  });
}

function appendTemplate(templateId) {
  const template = templates[templateId];
  const newTasks = JSON.parse(JSON.stringify(template.tasks));
  Object.keys(newTasks)
        .forEach(taskId => {
          tasks[taskId] = newTasks[taskId];
        });
  saveTasksToFlash();
  showTempMessage("Template tasks added", template.name, 1000)
  .then(navManageTasks);
}

function applyTemplate(templateId) {
  const template = templates[templateId];
  if (Object.keys(tasks).length) {
    E.showPrompt("Overwrite pending tasks with " + template.name + "?")
     .then((affirmative) => {
       if (affirmative) {
         // Make a deep copy of template tasks rather than applying references.
         tasks = JSON.parse(JSON.stringify(template.tasks));
         saveTasksToFlash();
         showTempMessage("Template Applied", template.name, 1000)
         .then(navManageTasks);
       } else {
         editTemplate(templateId);
       }
     });
  }
}

function deleteTemplate(templateId) {
  const template = templates[templateId];
  if (Object.keys(tasks).length) {
    E.showPrompt("Delete template: " + template.name + "?")
     .then((affirmative) => {
       if (affirmative) {
         delete templates[templateId];
         saveTasksToFlash();
         showTempMessage("Template: deleted", template.name, 1000)
         .then(navTemplates);
       } else {
         editTemplate(templateId);
       }
     });
  }
}


function startTask(taskId) {
  const task   = tasks[taskId];
  activeTaskId = task.id;
  navTask(task);
  let timeToNext = 1000 * task.baseInterval;
  if (task.incrementalBackoff) {
    timeToNext *= task.backoffScale[task.reminderIndex];
  }
  taskTimeout = setTimeout(() => {
    nudgeTask(task.id);
  }, timeToNext);
}

function affirmOnTask(taskId) {
  const task         = tasks[taskId];
  task.reminderIndex = Math.min(task.reminderIndex + 1, task.backoffScale.length - 1);
  task.onTaskCount++;
  clearTimeout(responseTimeout);
  responseTimeout = null;
  showTempMessage("Great work!", "On task!", 1000)
  .then(() => startTask(taskId));
}

function showTempMessage(message, title, time) {
  return new Promise((resolve, reject) => {
    E.showMessage(message, {title});
    setTimeout(resolve, time);
  });
}

function affirmDistracted(taskId) {
  const task         = tasks[taskId];
  task.reminderIndex = Math.max(task.reminderIndex - 1, 0);
  task.distractCount++;
  clearTimeout(responseTimeout);
  responseTimeout = null;
  showTempMessage("Don't worry! You got this!", "Distracted!", 1500)
  .then(() => startTask(task.id));
}

function affirmUnresponsive(taskId) {
  const task = tasks[taskId];
  task.unresponsiveCount++;
  task.reminderIndex = Math.max(task.reminderIndex - 1, 0);
  nudgeTask(task.id);
}

function nudgeTask(taskId) {
  Bangle.buzz(200, 1);
  const task = tasks[taskId];
  navNudge(task);
  responseTimeout = setTimeout(() => affirmUnresponsive(task.id), task.backoffScale[0] * task.baseInterval * 1000);
}

function affirmDone(taskId) {
  interruptTask();
  tasks[taskId].complete = true;
  E.showAlert("You did it!", tasks[taskId].text)
   .then(() => navManageTasks());
}

function changePriority(taskId) {
  interruptTask();
  prioritizeLayout.taskTitle.label = tasks[taskId].text;
  prioritizeLayout.taskTitle.font  = tasks[taskId].font;
  navPrioritize();
}

function takeABreak() {
  interruptTask();
  navMainMenu();
}

function getText(initial) {
  const width         = 50;
  const height        = 40;
  const margin        = 5;
  const offsetX       = 5;
  const offsetY       = 43;
  const padding       = 2;
  const border        = 2;
  const gridWidth     = 3;
  let typed           = initial || "";
  let resolveFunction = () => {
  };
  let shift           = false;
  const cursorChar    = "_";
  let nextChar        = cursorChar;

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
         .drawString(key.special, key.x + key.w / 2 - g.stringWidth(key.special) / 2, key.y + key.h / 2 - 10, false);
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
