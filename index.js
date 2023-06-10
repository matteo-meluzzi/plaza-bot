const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const token = ''
const Datastore = require('nedb');
let db = new Datastore({ filename: './db', autoload: true });
  
const bot = new TelegramBot(token, {polling: true});

const url = 'https://mosaic-plazaapi.hexia.io/api/v1/locaties?locale=nl_NL';

const bodyFilter = {"filters":{"$and":[{"$and":[{"municipality.id":{"$eq":"15741"}},{"regio.id":{"$eq":"12"}},{"land.id":{"$eq":"524"}}]}]},"hidden-filters":{"$and":[{"dwellingType.categorie":{"$eq":"woning"}},{"rentBuy":{"$eq":"Huur"}},{"isExtraAanbod":{"$eq":""}},{"isWoningruil":{"$eq":""}},{"$and":[{"$or":[{"street":{"$like":""}},{"houseNumber":{"$like":""}},{"houseNumberAddition":{"$like":""}}]},{"$or":[{"street":{"$like":""}},{"houseNumber":{"$like":""}},{"houseNumberAddition":{"$like":""}}]}]}]}};

async function makeRequest() {
    try {
        const response = await axios.post(url, bodyFilter, { timeout: 5000 });

        if (response.status !== 200) {
            errorOccurred(`Received status code ${response.status}`);
        }

        return response.data;
    } catch (error) {
        errorOccurred(error);
    }
}

function errorOccurred(error) {
    console.error('Error occurred: ', error);

    selectObservers().then((observers) => {
        for (let charId of observers) {
            bot.sendMessage(charId, `Error occurred: ${JSON.stringify(error)}`);
        }
    }).catch((error) => {
        console.error("Error occurred while fetching observers: ", error);
    })

}

async function responseWasUpdated() {
    console.log("response was different!");
    const observers = await selectObservers();
    console.log("Notifying observers: ", observers);
    for (let chatId of observers) {
        bot.sendMessage(chatId, 'Plaza changed something on its website!');
        bot.sendMessage(chatId, 'check it out https://plaza.newnewnew.space/te-huur#?passendheid=compleet&gesorteerd-op=prijs%2B&locatie=Delft-Nederland%2B-%2BZuid-Holland')
    }
}

function findOneAsync(query) {
    return new Promise((resolve, reject) => {
      db.findOne(query, (err, doc) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
  }
  

async function addObserver(observer) {
    try {
        const existingDoc = await findOneAsync({ observer: observer });
        
        if (!existingDoc) {
            // Value doesn't exist, insert it
            db.insert({ observer: observer }, (err, newDoc) => {
                if (err) {
                    errorOccurred(err);
                } else {
                    console.log('Value inserted:', newDoc);
                }
            });
            return true;
        } else {
            console.log('Value already exists:', existingDoc);
            return false;
        }
    } catch (error) {
        errorOccurred(error);
    }
}

function findAsync(query) {
    return new Promise((resolve, reject) => {
      db.find(query, (err, docs) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs);
        }
      });
    });
  }
  

async function selectObservers() {
    try {
       const docs = await findAsync({});
       return docs.map((d) => d.observer);
    } catch (error) {
        errorOccurred(error);
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    console.log(`received message ${JSON.stringify(msg)}`)

    if (msg.text === "yolo" || msg.text === "Yolo") {
        if (await addObserver(chatId) === false) {
            bot.sendMessage(chatId, 'you are already an observer');
        } else {
            bot.sendMessage(chatId, 'from now on I will send you a notification if there is an update in the plaza website');
        }
    } else {
        bot.sendMessage(chatId, 'Hello, this is the Plaza Watcher bot');
    }
});

bot.on('polling_error', (error) => {
    console.log(`Polling error: ${error}`);
});

lastResponseStr = ""

async function loop() {
    console.log("Checking Plaza website");
    const response = await makeRequest();
    const responseStr = JSON.stringify(response);
    
    if (lastResponseStr != responseStr) {
        lastResponseStr = responseStr;

        responseWasUpdated();
    } else {
        console.log("no change detected");
    }
}

const interval = 30000;
console.log(`Starting to poll plaza, once every ${interval/1000}s`)
loop();
setInterval(async () => {
    loop();
}, interval);

