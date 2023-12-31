const axios = require('axios');
const httpClient = axios.create();

const querystring = require('querystring');
const TelegramBot = require('node-telegram-bot-api');
const token = '5990199103:AAEDKO1TCDj0X5YpOx_gLTzl5SnDZ7GGgrw'
const Datastore = require('nedb');
let db = new Datastore({ filename: './db', autoload: true });
let dbResponses = new Datastore({ filename: './dbResponses', autoload: true })
  
const bot = new TelegramBot(token, {polling: true});

const util = require('util');
const exec = util.promisify(require('child_process').exec);

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
		if (error.code === 'ECONNABORTED') {
			console.log('Request timed out');
			const observers = await selectObservers();
			for (const chatId of observers) {
				bot.sendMessage(chatId, "the request to plaza timed out");
			}
			await sleep(5000);
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
	const response = await httpClient.get(url, headers=headers)
	if (response.status !== 200) {
		errorOccurred("could not get https://plaza.newnewnew.space:443");
	}
}

async function postLoginConfiguration(headers) {
	const url = "https://plaza.newnewnew.space/portal/account/frontend/getloginconfiguration/format/json";
	const response = await httpClient.post(url, headers=headers);
	if (response.status != 200) {
		errorOccurred("could not post getloginconfiguration");
	}
	const hash = response.data["loginForm"]["elements"]["__hash__"]["initialData"];
	return hash;
}

async function postLoginByService(headers, hash) {
	const url = "https://plaza.newnewnew.space/portal/account/frontend/loginbyservice/format/json ";
	const data = {"__id__": "Account_Form_LoginFrontend", "__hash__": hash, "username": "bmeluzzi", "password": "4Jx$KvXK"}
	const response = await httpClient.post(url, data, headers=headers);
	if (response.status != 200) {
		errorOccurred("could not post loginbyservice")
	}
}

async function postListAvailableRooms(headers) {
	const url = "https://mosaic-plazaapi.hexia.io:443/api/v1/actueel-aanbod?limit=60&locale=nl_NL&page=0&sort=!reactionData.zoekprofielMatchOrder,-reactionData.zoekprofielMatchOrder,%2BreactionData.aangepasteTotaleHuurprijs"
	const json_data = {"hidden-filters": {"$and": [{"dwellingType.categorie": {"$eq": "woning"}}, {"rentBuy": {"$eq": "Huur"}}, {"isExtraAanbod": {"$eq": ""}}, {"isWoningruil": {"$eq": ""}}, {"$and": [{"$or": [{"street": {"$like": ""}}, {"houseNumber": {"$like": ""}}, {"houseNumberAddition": {"$like": ""}}]}, {"$or": [{"street": {"$like": ""}}, {"houseNumber": {"$like": ""}}, {"houseNumberAddition": {"$like": ""}}]}]}]}, "woningzoekende": {"aantalMeeverhuizendeKinderen": 0, "aantalMeeverhuizendeKinderenOnder18": 0, "aowLeeftijdBereiktA1": false, "aowLeeftijdBereiktA2": null, "blokkadeVoorCorporatieIds": null, "eigenWoningId": null, "gemeenteGeoLocatieNaamA1": null, "gemeenteIdA1": 16044, "geslachtA1": "man", "geslachtA2": null, "heeftA2": false, "heeftBlokkade": false, "heeftEenTMin2Inkomen": false, "heeftElkHuishoudLidOnderbouwdInkomen": true, "heeftToegangTotExtraAanbod": false, "heeftVermogen": false, "huidigeWoonsituatieId": null, "huishoudgrootte": 1, "huisnummerA1": "11", "huisnummerA2": null, "huisnummertoevoegingA1": "16", "huisnummertoevoegingA2": null, "huurperiodeVanEinddatum": null, "huurperiodeVanStartdatum": null, "inschrijvingTypes": [{"id": "1", "inCode": "regulier"}], "isAlleenAccomodate": false, "isRechtspersoon": false, "isStudent": false, "landIdA1": 56, "landIdA2": null, "latitudeA1": 50.8363, "latitudeA2": null, "leeftijdA1": 23, "leeftijdA2": null, "longitudeA1": 4.44179, "longitudeA2": null, "onderwijsinstellingBrincode": null, "opleidingstypeId": null, "postcodeA1": "1150", "postcodeA2": null, "regioIdA1": 7, "regioIdA2": null, "soortWoningzoekendeStarterDoorstromer": null, "stageRegioId": 0, "startdatumStage": null, "startdatumStudie": null, "startDatumStudieLigtInVoorrangsPeriode": false, "studeertBijOnderwijsinstellingACTA": false, "studeertBijOnderwijsinstellingInRegioHaaglanden": false, "studeertBijOnderwijsinstellingVU": false, "studieRegioId": 0, "subtypeInschrijvingId": null, "verzamelinkomen": 41842, "voorrangen": [], "woontInNederland": false, "woontVerderVanOnderwijsinstelling": false, "woontVerderVanStudieVoorRegioHaaglanden": false}, "zoekprofiel": {"regio": [12]}};
	const response = await httpClient.post(url, json_data, headers={...headers, 'Content-Type': 'application/json'});
	if (response.status != 200) {
		errorOccurred("could not get current houses");
	}
	const houses = response.data["data"];
	return houses;
}

async function respondToRoomSuccess(headers, add, id, key) {
	const cookies = jar.getCookieStringSync("https://plaza.newnewnew.space");

	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	const urlSubmitOnly = "https://plaza.newnewnew.space:443/portal/core/frontend/getformsubmitonlyconfiguration/format/json";
	const resSubmitOnly = await httpClient.get(urlSubmitOnly, headers={...headers, cookie: cookies});
	if (resSubmitOnly.status !== 200) {
		errorOccurred("could not get submit only url");
		return false;
	}
	const hash = resSubmitOnly.data.form.elements.__hash__.initialData;

	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	const url = "https://plaza.newnewnew.space:443/portal/object/frontend/react/format/json";
	const data = {"__id__": "Portal_Form_SubmitOnly", "__hash__": hash, "add": add, "dwellingID": id};
	const res = await httpClient.post(url, querystring.stringify(data), headers={...headers, cookie: cookies})
	if (res.staus !== 200) {
		errorOccurred(`could not react to ${id}, server responded with status code ${res.status}`)
		console.log(res)
		return false;
	}

	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));


	dbResponses.insert({ name: key, id: id}, (err, newDoc) => {
		if (err) {
			errorOccurred(err);
		} else {
			console.log('Value inserted:', newDoc);
		}
	});    
	return true;
}

async function respondToNewRooms() {
	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	const headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/117.0", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5", "Accept-Encoding": "gzip, deflate", "DNT": "1", "Connection": "close", "Upgrade-Insecure-Requests": "1", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1", "Sec-GPC": "1"};
	await getPlazaNewNewNewSpace(headers);
	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	const hash = await postLoginConfiguration(headers);
	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	await postLoginByService(headers, hash);
	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	const houses = await postListAvailableRooms(headers);
	console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));

	const housesInDelft = houses.filter(h => h.gemeenteGeoLocatieNaam == "Delft");

	const observers = await selectObservers();

	for (const house of housesInDelft) {
		const key = house.urlKey;
		const id = house.id;
		const add = house.toewijzingID;
		const street = house.street;

		const alreadyResponded = await findOneAsync({ name: key }, dbResponses);
		if (alreadyResponded) {
			continue;
		}

		// if (street.toLowerCase() !== 'jan de oudeweg') {
		//     for (const chatId of observers) {
		//         bot.sendMessage(chatId, `the new room is in ${street}, so I will not respond to the offer`);
		//     }
		//     console.log(`the room is in ${street}, so I won't respond`)

		//     dbResponses.insert({ name: key, id: id}, (err, newDoc) => {
		//         if (err) {
		//             errorOccurred(err);
		//         } else {
		//             console.log('Value inserted:', newDoc);
		//         }
		//     });                
		// }
		// else { // the room is in jan de oudeweg and it has not been responded to
			
			const cookieStr = jar.getCookieStringSync("https://plaza.newnewnew.space");
			console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));
			const resp = await httpClient.get("https://plaza.newnewnew.space/redirect?code=mijn-overzicht", {
				headers: {
					// cookie: "__cf_bm=pQNap_rDAmoedd3ECakTpKN9lX.Mz7g88FvREhKdJzc-1695135872-0-AdQxV/e6WNn7xTa93IMid7KxpvArqN/+I+mguWK/NNzNW6q43k7BNXR8XzhAEiAhRwMSMZaL8fX6b9kwZ69/LWk=; __Host-PHPSESSID=7511514e38f3222f1084af4c468fdc20"
					"Cookie": cookieStr
				}
			});
			if (resp.status !== 200) {
				errorOccurred("could not get mijn-overzicht to get the right cookies")
			}
			console.log(jar.getCookieStringSync("https://plaza.newnewnew.space"));
		
			let counter = 0;
			let failedToRespond = false;
			while (!await respondToRoomSuccess(headers, add, id, key)) {
				counter += 1;
				sleep(3000); // wait 3s before retrying
				if (counter == 10) { // try to respond 10 times (takes 10 * 3s = 30s)
					failedToRespond = true;
					break;
				}
			}
			if (!failedToRespond) {
				for (const chatId of observers) {
					bot.sendMessage(chatId, `I responded to ${key}`);
				}    
			}    
		// }
	}
}

bot.on('polling_error', (error) => {
	console.log(`Polling error: ${error}`);
});

async function loop() { // called regularly at intervals of x seconds
	// console.log("Checking Plaza website");
	const response = await makeRequest();
	if (response === null) {
		return;
	}
	const ids = response.data.map(d => d.id);

	const alreadyRespondedIds = new Set((await findAsync({}, dbResponses)).map(r => r.id));
	const idsToRespond = ids.filter(i => !alreadyRespondedIds.has(i))

	if (idsToRespond.length > 0) {
		await notifyObserversOfNewRoom();
		try {
			const idsStr = idsToRespond.join(" ");
			console.log("calling python with ids", idsStr);
			const { stdout, stderr } = await exec('python3 bot.py ' + idsStr);
			console.log(`python output: ${stdout}`);
			console.error(`python error output: ${stderr}`);
			for (const id of idsToRespond) {
				dbResponses.insert({ id: id}, (err, newDoc) => {
					if (err) {
						errorOccurred(err);
					} else {
						console.log('Value inserted:', newDoc);
					}
				});        
			}
		  } catch (error) {
			console.log(`Error executing python script: ${error.message}`);
			console.log(`Exit code: ${error.code}`);
			errorOccurred(`Error executing python script: ${error.stdout}`);
			errorOccurred(`Exit code: ${error.code}`);
		  }    
	}
	// console.log("no new room was published")
}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}  

async function main() {
	const interval = 10000;
	console.log(`Starting to poll plaza, with a delay of ${interval/1000}s`)
	while (true) {
		loop();
		await sleep(interval);
	}    
}

main();

async function test() {
	const ids = [1, 2, 3]
	const s = ids.join(" ")
	console.log(s + " b")
}

// test();
