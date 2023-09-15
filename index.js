const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const token = ''
const Datastore = require('nedb');
let db = new Datastore({ filename: './db', autoload: true });
let dbResponses = new Datastore({ filename: './dbResponses', autoload: true })
  
const bot = new TelegramBot(token, {polling: true});

const url = 'https://mosaic-plazaapi.hexia.io/api/v1/locaties?locale=nl_NL';

const bodyFilter = {"filters":{"$and":[{"$and":[{"municipality.id":{"$eq":"15741"}},{"regio.id":{"$eq":"12"}},{"land.id":{"$eq":"524"}}]}]},"hidden-filters":{"$and":[{"dwellingType.categorie":{"$eq":"woning"}},{"rentBuy":{"$eq":"Huur"}},{"isExtraAanbod":{"$eq":""}},{"isWoningruil":{"$eq":""}},{"$and":[{"$or":[{"street":{"$like":""}},{"houseNumber":{"$like":""}},{"houseNumberAddition":{"$like":""}}]},{"$or":[{"street":{"$like":""}},{"houseNumber":{"$like":""}},{"houseNumberAddition":{"$like":""}}]}]}]}};

async function makeRequest() {
    try {
        const response = await axios.post(url, bodyFilter, { timeout: 3000 });

        if (response.status !== 200) {
            errorOccurred(`Received status code ${response.status}`);
        }

        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.log('Request timed out');
        } else {
            errorOccurred(error);
        }
        return null;
    }
}

function errorOccurred(error) {
    console.error('Error occurred: ', error);

    selectObservers().then((observers) => {
        for (let chatId of observers) {
            bot.sendMessage(chatId, `Error occurred: ${JSON.stringify(error)}`);
        }
    }).catch((error) => {
        console.error("Error occurred while fetching observers: ", error);
    })

}

async function notifyObserversOfNewRoom() {
    console.log("response was different!");
    const observers = await selectObservers();
    console.log("Notifying observers: ", observers);
    for (let chatId of observers) {
        bot.sendMessage(chatId, 'Plaza changed something on its website!');
        bot.sendMessage(chatId, 'check it out https://plaza.newnewnew.space/')
    }
    console.log("Responding to the offers if there are new ones");
}

function findOneAsync(query, database) {
    return new Promise((resolve, reject) => {
        database.findOne(query, (err, doc) => {
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
        const existingDoc = await findOneAsync({ observer: observer }, db);
        
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

function findAsync(query, database) {
    return new Promise((resolve, reject) => {
        database.find(query, (err, docs) => {
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
       const docs = await findAsync({}, db);
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

async function getPlazaNewNewNewSpace(headers) {
    const url = "https://plaza.newnewnew.space:443";
    const response = await axios.get(url, headers=headers)
    if (response.status !== 200) {
        errorOccurred("could not get https://plaza.newnewnew.space:443");
    }
}

async function postLoginConfiguration(headers) {
    const url = "https://plaza.newnewnew.space:443/portal/account/frontend/getloginconfiguration/format/json";
    const response = await axios.post(url, headers=headers);
    if (response.status != 200) {
        errorOccurred("could not post getloginconfiguration");
    }
    const hash = response.data["loginForm"]["elements"]["__hash__"]["initialData"];
    return hash;
}

async function postLoginByService(headers, hash) {
    const url = "https://plaza.newnewnew.space:443/portal/account/frontend/loginbyservice/format/json";
    const data = {"__id__": "Account_Form_LoginFrontend", "__hash__": hash, "username": "bmeluzzi", "password": "4Jx$KvXK"}
    const response = await axios.post(url, data, headers=headers);
    if (response.status != 200) {
        errorOccurred("could not post loginbyservice")
    }
}

async function postListAvailableRooms(headers) {
    const url = "https://mosaic-plazaapi.hexia.io:443/api/v1/actueel-aanbod?limit=60&locale=nl_NL&page=0&sort=!reactionData.zoekprofielMatchOrder,-reactionData.zoekprofielMatchOrder,%2BreactionData.aangepasteTotaleHuurprijs"
    const json_data = {"hidden-filters": {"$and": [{"dwellingType.categorie": {"$eq": "woning"}}, {"rentBuy": {"$eq": "Huur"}}, {"isExtraAanbod": {"$eq": ""}}, {"isWoningruil": {"$eq": ""}}, {"$and": [{"$or": [{"street": {"$like": ""}}, {"houseNumber": {"$like": ""}}, {"houseNumberAddition": {"$like": ""}}]}, {"$or": [{"street": {"$like": ""}}, {"houseNumber": {"$like": ""}}, {"houseNumberAddition": {"$like": ""}}]}]}]}, "woningzoekende": {"aantalMeeverhuizendeKinderen": 0, "aantalMeeverhuizendeKinderenOnder18": 0, "aowLeeftijdBereiktA1": false, "aowLeeftijdBereiktA2": null, "blokkadeVoorCorporatieIds": null, "eigenWoningId": null, "gemeenteGeoLocatieNaamA1": null, "gemeenteIdA1": 16044, "geslachtA1": "man", "geslachtA2": null, "heeftA2": false, "heeftBlokkade": false, "heeftEenTMin2Inkomen": false, "heeftElkHuishoudLidOnderbouwdInkomen": true, "heeftToegangTotExtraAanbod": false, "heeftVermogen": false, "huidigeWoonsituatieId": null, "huishoudgrootte": 1, "huisnummerA1": "11", "huisnummerA2": null, "huisnummertoevoegingA1": "16", "huisnummertoevoegingA2": null, "huurperiodeVanEinddatum": null, "huurperiodeVanStartdatum": null, "inschrijvingTypes": [{"id": "1", "inCode": "regulier"}], "isAlleenAccomodate": false, "isRechtspersoon": false, "isStudent": false, "landIdA1": 56, "landIdA2": null, "latitudeA1": 50.8363, "latitudeA2": null, "leeftijdA1": 23, "leeftijdA2": null, "longitudeA1": 4.44179, "longitudeA2": null, "onderwijsinstellingBrincode": null, "opleidingstypeId": null, "postcodeA1": "1150", "postcodeA2": null, "regioIdA1": 7, "regioIdA2": null, "soortWoningzoekendeStarterDoorstromer": null, "stageRegioId": 0, "startdatumStage": null, "startdatumStudie": null, "startDatumStudieLigtInVoorrangsPeriode": false, "studeertBijOnderwijsinstellingACTA": false, "studeertBijOnderwijsinstellingInRegioHaaglanden": false, "studeertBijOnderwijsinstellingVU": false, "studieRegioId": 0, "subtypeInschrijvingId": null, "verzamelinkomen": 41842, "voorrangen": [], "woontInNederland": false, "woontVerderVanOnderwijsinstelling": false, "woontVerderVanStudieVoorRegioHaaglanden": false}, "zoekprofiel": {"regio": [12]}};
    const response = await axios.post(url, json_data, headers={...headers, 'Content-Type': 'application/json'});
    if (response.status != 200) {
        errorOccurred("could not get current houses");
    }
    const houses = response.data["data"];
    return houses;
}

async function respondToRoom(headers, add, id, key) {
    const urlSubmitOnly = "https://plaza.newnewnew.space:443/portal/core/frontend/getformsubmitonlyconfiguration/format/json";
    const resSubmitOnly = await axios.get(urlSubmitOnly, headers=headers);
    if (resSubmitOnly.status !== 200) {
        errorOccurred("could not get submit only url");
    }
    const hash = resSubmitOnly.data.form.elements.__hash__.initialData;
    
    const url = "https://plaza.newnewnew.space:443/portal/object/frontend/react/format/json";
    const data = {"__id__": "Portal_Form_SubmitOnly", "__hash__": hash, "add": add, "dwellingID": id};
    const res = await axios.post(url, data, headers=headers)
    if (res.staus !== 200) {
        errorOccurred(`could not react to ${id}`)
    }

    dbResponses.insert({ name: key, id: id}, (err, newDoc) => {
        if (err) {
            errorOccurred(err);
        } else {
            console.log('Value inserted:', newDoc);
        }
    });    
}

async function respondToNewRooms() {
    const headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/117.0", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5", "Accept-Encoding": "gzip, deflate", "DNT": "1", "Connection": "close", "Upgrade-Insecure-Requests": "1", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1", "Sec-GPC": "1"};
    await getPlazaNewNewNewSpace(headers);
    const hash = await postLoginConfiguration(headers);
    await postLoginByService(headers, hash);
    const houses = await postListAvailableRooms(headers);
    const housesInDelft = houses.filter(h => h.gemeenteGeoLocatieNaam == "Delft");

    const observers = await selectObservers();

    for (const house of housesInDelft) {
        const key = house.urlKey;
        const id = house.id;
        const add = house.toewijzingID;
        const street = house.street;
        if (street.toLowerCase() !== 'jan de oudeweg') {
            const alreadyResponded = await findOneAsync({ name: key }, dbResponses);
            if (!alreadyResponded) {
                dbResponses.insert({ name: key, id: id}, (err, newDoc) => {
                    if (err) {
                        errorOccurred(err);
                    } else {
                        console.log('Value inserted:', newDoc);
                    }
                });                
            }
            for (const chatId of observers) {
                bot.sendMessage(chatId, `the new room is in ${street}, so I will not respond to the offer`);
            }
            console.log(`the room is in ${street}, so I won't respond`)
            continue;
        }

        const alreadyResponded = await findOneAsync({ name: key }, dbResponses);
        if (!alreadyResponded) {
            respondToRoom(headers, add, id, key);
            for (const chatId of observers) {
                bot.sendMessage(chatId, `I responded to ${key}`);
            }
        } else {
            console.log(`room ${key} has already been responded to`);
            for (const chatId of observers) {
                bot.sendMessage(chatId, `I have already responded to room ${key}`);
            }
        }
    }
}

bot.on('polling_error', (error) => {
    console.log(`Polling error: ${error}`);
});

async function loop() { // called regularly at intervals of x seconds
    console.log("Checking Plaza website");
    const response = await makeRequest();
    if (response === null) {
        return;
    }
    const ids = response.data.map(d => d.id);

    const alreadyRespondedIds = (await findAsync({}, dbResponses)).map(r => r.id);
    console.log(ids);
    console.log(alreadyRespondedIds);
    for (const i of ids) {
        if (!alreadyRespondedIds.includes(i)) {
            notifyObserversOfNewRoom();
            respondToNewRooms();
            return;
        }
    }
    console.log("no new room was published")
}

const interval = 4000;
console.log(`Starting to poll plaza, once every ${interval/1000}s`)
loop();
setInterval(async () => {
    loop();
}, interval);

