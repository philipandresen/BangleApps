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
  g.clearRect(Bangle.appRect);
  g.reset();
  Bangle.drawWidgets();
  mainMenuLayout.setUI();
  mainMenuLayout.update();
  mainMenuLayout.render();
}

function navTask(task) {
  g.clearRect(Bangle.appRect);
  g.reset();
  taskLayout.taskTitle.label = task.text;
  taskLayout.taskTitle.font  = task.font;
  taskLayout.setUI();
  taskLayout.update();
  taskLayout.render();
}

function navNudge(task) {
  g.clearRect(Bangle.appRect);
  g.reset();
  nudgeLayout.taskTitle.label = task.text;
  nudgeLayout.taskTitle.font  = task.font;
  nudgeLayout.setUI();
  nudgeLayout.update();
  nudgeLayout.render();
}

function navPrioritize() {
  g.clearRect(Bangle.appRect);
  g.reset();
  prioritizeLayout.setUI();
  nudgeLayout.update();
  prioritizeLayout.render();
}

navMainMenu();

function interruptTask() {
  clearTimeout(taskTimeout);
}

function addTask() {
  require("textinput").input({text:""})
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
      require("textinput").input({text:task.text})
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
  require("textinput").input({text:""})
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
  const template = templates[templateId];
  require("textinput").input({text:template.name})
  .then(result => {
    if (result) {
      template.name = result;
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