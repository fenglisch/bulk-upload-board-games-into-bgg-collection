# Bulk upload your Board Games to your BoardGameGeek Collection

This programs allows you to bulk upload a list of boar dgames to your BGG collection, a feature currently missing on BGG.

You need to provide the BGG ID of each game. [This website](https://github.com/fenglisch/bgg-names-to-ids) identifies the ID's of your board games, given a list of their names.

See also the thread on BGG, where this tool is discussed: https://boardgamegeek.com/thread/3045904/new-program-to-bulk-upload-import-board-games-to-y

## How to setup

**Prerequisites**: You need to have `node` and `npm` installed (see [instructions](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)). You also need Google Chrome or Firefox. Google Chrome is set as the default browser. If you want to use Firefox, you must explicitly specify that when exectuting the program (see "Additional options").

1. Download this repository and save it as a directory on your local computer.
2. Navigate to the directory.
3. Open the terminal/command line in the directory.
4. Run the following command:

```
$ npm install
```

## How to run

The program is executed from the terminal within the directory. Your command must follow the following syntax:

```
$ node bgg-bulk-upload.js PATH/TO/my-collection.csv -u your_username -p your_password
```

So, for example:

```
$ node bgg-bulk-upload.js Desktop/Boardgames/list-of-ids.csv -u gamingFreak3000 -p 12345678
```

## Adding board game versions in your language

You can also set a language. If you do so, the program does not just add a general reference to the board game to your collection, but a specific version in your language. If there is no version in your language, the program just adds a general reference as it would by default. If there are several versions in your chosen language, the program selects the oldest one. You can later manually change or remove the versions of those board games where the automatic assignment was wrong.

Set a language simply by adding `-l Language` to your command, so for example `-l German`.

Our previous example would then look like this:

```
$ node bgg-bulk-upload.js Desktop/Boardgames/list-of-ids.csv -u gamingFreak3000 -p 12345678 -l German
```

<details>
  <summary>All currently supported languages you can choose from</summary>

- Afrikaans
- Arabic
- English
- Estonian
- Latvian
- Lithuanian
- Basque
- Bulgarian
- Japanese
- Catalan
- Chinese
- Croatian
- Serbian
- Slovenian
- Czech
- Slovak
- Danish
- Portuguese
- Dutch
- Russian
- Finnish
- French
- German
- Greek
- Hebrew
- Hungarian
- Icelandic
- Italian
- Korean
- Norwegian
- Polish
- Romanian
- Macedonian
- Spanish
- Swedish
- Thai

</details>

### Additional options

- `firefox` - The default browser is Google Chrome. If you want to use Firefox instead, just add `firefox` at the end of your command.
- `debugging-mode` - By default, the programm logs the number of ID's it found in your already existing BGG collection and in the file you uploaded, as well as the resulting number of new ID's to be added. When `debugging-mode` is activated, the program will not only log each number, but the full list of ID's.

Our previous example would look as follows, when all additional options are set:

```
$ node bgg-bulk-upload.js Desktop/Boardgames/list-of-ids.csv -u gamingFreak3000 -p 12345678 firefox debugging-mode
```

(The order of the additional options does not matter.)

## Formatting requirements of the input file

The file must include a semicolon-separated list of the ID's to be added. It does not matter, whether the ID's are wrapped in quotation marks or not. All non-numerical content is ignored. There is no restriction regarding the file extension, but CSV and TXT probably makes most sense.

## How it works

The program reads the ID's from the input file. It then compares them to the ID's which are already in the user's collection. To do that, it sends a http request to XML API2 of BoardGameGeek. After this comparision, the program knows which of the ID's of the input file are actually new ID's to be added to the collection.

It then starts a browser session (Chrome or Firefox, as you wish) with Selenium webdriver. After logging in, it navigates to the pages of all the games specified by the ID's. Here, it clicks the buttons to add each game to the user's collection. This continues until all ID's are processed (or until something occured that lead to an abortion).

## Performance / Speed

On my computer, it takes about 3 - 4 seconds per game (4 - 5 with Firefox). When a language is set to add specific versions instead of general references, each iteration takes a bit longer, maybe 6 - 7 seconds. The less other programs you run on your computer simultaneously, the quicker it will run.
