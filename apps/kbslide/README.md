# Swipe Keyboard
![icon](icon.png)

![screenshot](screenshot.png)

A gesture based keyboard input utility.

## How to type

Press your finger down on the letter group that contains the character you would like to type, then, without lifting
your finger, slide it over to the letter you want to enter. Once you are touching the letter you want, release your 
finger. The letter you are holding your finger over will show up in the typing interface and blink until you release,
allowing you to easily preview what you are typing before you commit.

![help](help.png)

If you pressed down on the screen, and realized you hit the wrong letter group, simply slide your finger above the top
row of buttons to cancel.

Press "shft" to access alternative characters, including upper case letters, punctuation, and special characters.
Pressing "shft" also reveals a cancel button if you would like to terminate input without saving.

Press "ok" to finish typing and send your text to whatever app called this keyboard.

Press "del" to delete the leftmost character.

The "Space" character is in the bottom right corner of the top right letter group, next to "z".

## Themes and Colors
This keyboard will attempt to use whatever theme or colorscheme is being used by your Bangle device. 

## How to use in a program

This was developed to match the interface implemented for kbtouch, kbswipe, etc.

In your app's metadata, add:

```
  "dependencies": {"textinput":"type"},
```

From inside your app, call:

```
require("textinput").input({text:""}).then(result => {
  console.log("The user entered: ", result);
});
```
### Documentation

`{Promise(string)} input(options)`

Given initial options, allow the user to type a set of characters and return their entry in a promise. If you do not 
submit your own character set, a default alphanumeric keyboard will display.

* `options`: The object containing initial options for the keyboard.

  * `{string} options.text`: The initial text to display / edit in the keyboard
  * `{array[]|string[]} [options.charSets]`: An array of arrays of characters. Each array becomes a key that, when 
pressed, takes the user to a sub-keyboard of that array's characters. If you define your own character set, you
can include arrays containing special strings to serve as buttons. These can be ["ok"] ["cncl"] ["del"] ["shft"]
["spc"] or ["caps"]. You can include either the special "spc" button or just use the " " character. Individual
letters in their own arrays will be given dedicated buttons.
  * `{array[]|string[]} [options.charSetsShift]`: Identical to options.charSets however these keys will only be
displayed when the "SHFT" or "CAPS" key has been pressed.
  * `{string} [options.chars]`: Similar to options.charSets but just a single string. The keyboard will 
automatically divide the string into keys and subkeys.
  * `{string} [options.charsShift]`: Similar to options.chars but only visible after the user hits "SHFT" or "CAPS"

### Example:
```js
input({
  text: "Initial text",   
  charSets: [["a", "b", "c", "d", "e", "f", "g"], ["1", "2", "3", "4"], ["="], ["ok"], ["del"], ["caps"]],
  charSetsShift: [["A", "B", "C", "D", "E", "F", "G"], ["!", "@", "#", "$"], ["cncl"], ["del"], ["caps"]],
}).then(typedText => {console.log(typedText);});
```

The promise resolves when the user hits "ok" on the input or if they cancel. If the user cancels, undefined is 
returned, although the user can hit "OK" with an empty string as well. If you define a custom character set and
do not include the "ok" button your user will be soft-locked by the keyboard. Fair warning!

At some point I may add swipe-for-space and swipe-for-delete as well as swipe-for-submit and swipe-for-cancel
however I want to have a good strategy for the touch screen 
[affordance](https://careerfoundry.com/en/blog/ux-design/affordances-ux-design/).

## Secret features

If you long press a key with characters on it, that will enable "Shift" mode. 
Not sure how to indicate this with affordances, but it DOES work.

