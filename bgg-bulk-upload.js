// Used for logging in different colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

const dictLangToId = {
   Afrikaans: "2677",
   Arabic: "2178",
   English: "2184",
   Estonian: "2185",
   Latvian: "2196",
   Lithuanian: "2197",
   Basque: "2711",
   Bulgarian: "2675",
   Japanese: "2194",
   Catalan: "2179",
   Chinese: "2181",
   Croatian: "2656",
   Serbian: "2681",
   Slovenian: "2207",
   Czech: "2180",
   Slovak: "2206",
   Danish: "2182",
   Portuguese: "2200",
   Dutch: "2183",
   Russian: "2202",
   Finnish: "2186",
   French: "2187",
   German: "2188",
   Greek: "2189",
   Hebrew: "2190",
   Hungarian: "2191",
   Icelandic: "2347",
   Italian: "2193",
   Korean: "2195",
   Norwegian: "2198",
   Polish: "2199",
   Romanian: "2201",
   Macedonian: "3069",
   Spanish: "2203",
   Swedish: "2204",
   Thai: "2709",
};

const browser = process.argv.includes("firefox") ? "firefox" : "chrome";
const browserPackage = require(`selenium-webdriver/${browser}`);
const {Builder, By, Key, until} = require("selenium-webdriver");
const xml2js = require("xml2js");
const axios = require("axios");
const fs = require("fs");

const BASE_URL = "https://boardgamegeek.com";

const language =
   process.argv.indexOf("-l") > 0
      ? process.argv[process.argv.indexOf("-l") + 1]
      : null;
const isDebuggingMode = process.argv.includes("debugging-mode");
const arIdsAdded = [];
const arIdsFailedToAdd = [];

// Process arguments from command line to get username and password
function getCredentials(flag) {
   try {
      const indexOfFlag = process.argv.indexOf(flag);
      if (indexOfFlag === -1) throw new Error();
      // Syntax is "$ node index.js -u your_username -p your_password", therefore the value of username/password is next item after the flag
      const credential = process.argv[indexOfFlag + 1];
      if (!credential) throw new Error();
      return credential;
   } catch (error) {
      console.log(
         RED,
         "Please provide your username and password. Use the following syntax:"
      );
      console.log(
         "$ node index.js PATH/TO/listOfIds.csv -u your_username -p your_password"
      );
      throw new Error();
   }
}

const userName = getCredentials("-u");
const password = getCredentials("-p");

const arIdsFromInput = (function getIdsFromInput() {
   try {
      // process.argv[2] is the path to the input file, because process.argv[0] is "node" and process.argv[1] is "bgg-bulk-upload.js"
      const dataFromFile = fs.readFileSync(process.argv[2], "utf8");
      // Converting each id to a number and then filtering out all falsy elements. This removes all non-number elements
      // Then removing duplicates by converting to a set and reconverting to array
      return [
         ...new Set(
            dataFromFile
               .split(";")
               .map((id) => +id.replace(/"/g, ""))
               .filter(Boolean)
         ),
      ];
   } catch (err) {
      console.log(
         RED,
         "[Error] Could not read content of file. Please check the path and use this syntax:"
      );
      console.log(
         "$ node index.js PATH/TO/listOfIds.csv -u your_username -p your_password"
      );
      if (isDebuggingMode) console.log(err);
      process.exit();
   }
})();

async function addGamesToCollection(driver, arIdsToBeAdded) {
   try {
      // Using a "for... of" loop in order to wait for each iteration to finish before starting the next one, unlike forEach loops
      for (const [index, id] of arIdsToBeAdded.entries()) {
         try {
            await driver.get(`${BASE_URL}/boardgame/${id}`);
            const gameTitle = language
               ? await addVersionOfGame(driver, id)
               : await addGameWithoutVersion(driver);
            arIdsAdded.push(id);
            console.log(
               RESET,
               `[Status update] Successfully added "${gameTitle}" (ID ${id}) to your collection.`
            );
            if ((index + 1) % 10 === 0)
               console.log(
                  RESET,
                  `[Status update] Processed ${index + 1} of ${
                     arIdsToBeAdded.length
                  } items.`
               );
         } catch (err) {
            try {
               // Check if browser is still running
               await driver.getTitle();
               arIdsFailedToAdd.push(id);
               if (isDebuggingMode) console.log(err);
               console.log(
                  YELLOW,
                  `[Status update] Could not add ID ${id} to your collection. Attempting next item.`
               );
            } catch (err) {
               if (isDebuggingMode) console.log(err);
               console.log(
                  RED,
                  "[Error] Browser session closed. Process aborted"
               );
               break;
            }
         }
      }
      console.log(GREEN, "[Finished]");
      if (arIdsAdded.length > 0) {
         console.log(
            RESET,
            `[Final report] Successfully added ${arIdsAdded.length} games.`
         );
         if (isDebuggingMode) console.log(BLUE, arIdsAdded.join(";"));
      }
      if (arIdsFailedToAdd.length > 0) {
         console.log(
            RESET,
            "[Final report] Adding the games with the following ID's failed. Please try again or add them manually."
         );
         console.log(BLUE, arIdsFailedToAdd.join(";"));
      }
   } catch (err) {
      console.log(RED, err);
   } finally {
      if (!isDebuggingMode)
         try {
            await driver.quit();
            await service.kill(); // ensures chromedriver is gone
         } catch (err) {
            // ignore shutdown errors
         }
   }
}

async function addGameWithoutVersion(driver) {
   // Waiting for the button "Add To Collection" to be clickable
   await driver.wait(
      until.elementIsEnabled(
         driver.findElement(
            By.xpath("//button[@ng-disabled='colltoolbarctrl.loading']")
         )
      ),
      10000
   );
   await driver.sleep(1000);
   // Clicking the button "Add To Collection"
   // The normal method driver.findElement().click() does not work for the "Add To Collection" button, it throws the error:
   // "ElementNotInteractableError: Element <button class="btn btn-sm btn-primary toolbar-action-full"> could not be scrolled into view"
   await driver.executeScript(
      `document.querySelector("[ng-disabled='colltoolbarctrl.loading']").click();`
   );
   await driver.sleep(500);

   // Checking the checkbox "Own"
   await driver.executeScript(
      `document.querySelector("[ng-model='item.status.own']").click();`
   );
   await driver.sleep(500);

   // Saving
   await driver.executeScript(
      `document.querySelector("[ng-disabled='editctrl.saving']").click();`
   );
   // Getting the title of the page / the game to log it in the parent function
   const pageTitle = await driver.getTitle();
   // Remove everything after the first pipe character
   return pageTitle.replace(/(.*?) \|.*/, "$1");
}

async function addVersionOfGame(driver, id) {
   const urlOverviewTab = await driver.getCurrentUrl();
   await driver.get(
      `${urlOverviewTab}/versions?pageid=1&language=${dictLangToId[language]}`
   );
   await driver.sleep(1500);
   try {
      await driver.executeScript(
         `document.querySelector("ul.summary-border > li:last-child button[add-to-collection-button]").click()`
      );
      await driver.sleep(1000);
      // The checkbox "Own" is already checked by default, therefore directly click the button "Save"
      await driver.executeScript(
         `document.querySelector("[ng-disabled='editctrl.saving']").click();`
      );
      // Get the title of the added version to log it in the parent function
      // Remove tabs, the unnecessary substring "Name Pending" and unnecessary spaces
      return await driver.executeScript(
         `const title = document.querySelector("ul.summary-border > li:last-child .media-body a").textContent;
      return title.replace(/\t/g, '').replace('Name Pending', '').replace(/ +/g,' ').replace(/^ | $/g,'')`
      );
   } catch (err) {
      console.log(
         RESET,
         `[Status update] No ${language} version found for ${id}. Adding general reference to the board game to your collection.`
      );
      return await addGameWithoutVersion(driver);
   }
}

(async function accessBgg() {
   // Setting up...
   const options = new browserPackage.Options();

   // The expression in squared brackets just makes the first letter of "chrome" / "firefox" upper case
   const driver = new Builder()
      .forBrowser(browser)
      [
         `set${browser.charAt(0).toUpperCase()}${browser.slice(1)}Options`
      ](options)
      .build();

   // Logging in...
   try {
      await driver.get(`${BASE_URL}/login`);
      console.log(RESET, "[Status update] Logging in...");
      await driver.sleep(3000);
      await driver.executeScript(
         `if (document.querySelector("button[class~='fc-cta-consent']")) document.querySelector("button[class~='fc-cta-consent']").click();`
      );
      await driver.findElement(By.id("inputUsername")).sendKeys(userName);
      await driver.findElement(By.id("inputPassword")).sendKeys(password);
      await driver.executeScript(
         `document.querySelector(".btn-primary").click()`
      );
      // Give the front page some time to load before checking if login was successful
      await driver.sleep(5000);
      const pageTitle = await driver.getTitle();
      if (pageTitle !== "BoardGameGeek | Gaming Unplugged Since 2000")
         throw "[Error] Login failed. Please check username and password";
      console.log(GREEN, "[Success] Login succeeded!");

      const arIdsAlreadyInCollection =
         await (async function getIdsAlreadyInCollection() {
            // The new API policy of BGG no prohibits unregistered API access. Therefore, instead of elegantly getting the existing IDs via API, we now navigate to the collection and scrape them.
            let arIdsAlreadyInCollection = [];
            await driver.get(`${BASE_URL}/collection/user/${userName}`);
            const numberOfPagesInCollection = await driver.executeScript(
               `return +document.querySelector(".geekpages a:last-child").textContent;`
            );
            if (isDebuggingMode)
               console.log(
                  RESET,
                  `[Debugging mode] Your collection has ${numberOfPagesInCollection} pages.`
               );
            for (let i = 1; i <= numberOfPagesInCollection; i++) {
               if (i !== 1) {
                  await driver
                     .findElement(By.css("[name='pageset']"))
                     .sendKeys(i);
                  await driver.executeScript(
                     `document.querySelector(".geekinput[type='submit']").click()`
                  );
                  await driver.sleep(3000);
               }
               const nodelistLinks = await driver.executeScript(
                  `return document.querySelectorAll('[id^="results_objectname"] a.primary')`
               );
               for (const node of nodelistLinks) {
                  const href = await node.getAttribute("href");
                  const hrefSegments = href.split("/");
                  arIdsAlreadyInCollection.push(+hrefSegments[4]);
               }
            }
            const numberOfFoundItems = arIdsAlreadyInCollection.length;
            console.log(
               GREEN,
               `[Success] Access to your existing BGG collection was successful. Found ${numberOfFoundItems} items.`
            );
            return arIdsAlreadyInCollection;
         })();
      if (arIdsAlreadyInCollection.length === 0) {
         if (isDebuggingMode) {
            console.log(RESET, "[Debugging mode] ID's from your FILE:");
            console.log(BLUE, arIdsFromInput.join(";"));
         }
         addGamesToCollection(driver, arIdsFromInput);
         return;
      }
      const arNewIds = arIdsFromInput.filter(
         (id) => !arIdsAlreadyInCollection.includes(id)
      );
      console.log(
         RESET,
         `[Status update] ${
            arIdsFromInput.length - arNewIds.length
         } of the ID's in your file are already in your collection. ${
            arNewIds.length
         } new ID's to be added.`
      );
      if (isDebuggingMode) {
         console.log(RESET, "[Debugging mode] ID's from your FILE:");
         console.log(BLUE, arIdsFromInput.join(";"));
         console.log(RESET, "[Debugging mode] ID's from your COLLECTION:");
         console.log(BLUE, arIdsAlreadyInCollection.join(";"));
         console.log(RESET, "[Debugging mode] NEW ID's to be added:");
         console.log(BLUE, arNewIds.join(";"));
      }
      addGamesToCollection(driver, arNewIds);
   } catch (err) {
      console.log(RED, err);
   }
})();

// Without this function, selenium always throws an unhandled error at the very end after the node script ended
process.on("uncaughtException", (err) => {
   if (err.code === "EACCES" && err.syscall === "kill") {
      // ignore selenium cleanup bug
      return;
   }
   throw err;
});
