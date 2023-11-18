#!/usr/bin/python3
import requests
import json
import random
from time import sleep
import sys

ids_to_respond = sys.argv[1:]

if len(ids_to_respond) == 0:
    print("python here")
    exit(1)

def error_occurred(msg):
    print("An error occurred:", msg)
    exit(1)

session = requests.session()

burp0_url = "https://plaza.newnewnew.space:443/"
burp0_headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/117.0", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5", "Accept-Encoding": "gzip, deflate", "DNT": "1", "Connection": "close", "Upgrade-Insecure-Requests": "1", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1", "Sec-GPC": "1"}
res = session.get(burp0_url, headers=burp0_headers)
if not res.ok:
    error_occurred("could not get https://plaza.newnewnew.space:443")
sleep(0.1)

burp0_url = "https://plaza.newnewnew.space:443/portal/account/frontend/getloginconfiguration/format/json"
#burp0_cookies = {"__Host-PHPSESSID": "c0bb964ad1e9df05978aac593be698ca", "__cf_bm": ".s_ShEqsKLZ_0ni0Ngc4dRl719p8yAVo90x6X73Uzss-1694250357-0-ASqp9koXIpojpBxmICNMPa/qR+yMjo1GBz/n/51IcoQtuNCjfOmWdxD/9lFAQhLSZilO326215p6bScJ7p199Ms="}
res = session.post(burp0_url, headers=burp0_headers)
if not res.ok:
    error_occurred("could not post to getloginconfiguration")
_hash = res.json()["loginForm"]["elements"]["__hash__"]["initialData"]
sleep(0.1)

burp0_url = "https://plaza.newnewnew.space:443/portal/account/frontend/loginbyservice/format/json"
#burp0_cookies = {"__Host-PHPSESSID": "c0bb964ad1e9df05978aac593be698ca", "__cf_bm": ".s_ShEqsKLZ_0ni0Ngc4dRl719p8yAVo90x6X73Uzss-1694250357-0-ASqp9koXIpojpBxmICNMPa/qR+yMjo1GBz/n/51IcoQtuNCjfOmWdxD/9lFAQhLSZilO326215p6bScJ7p199Ms="}
burp0_data = {"__id__": "Account_Form_LoginFrontend", "__hash__": _hash, "username": "bmeluzzi", "password": "4Jx$KvXK"}
res = session.post(burp0_url, headers=burp0_headers, data=burp0_data)
if not res.ok:
    error_occurred("could not post to loginbyservice")
sleep(0.1)

burp0_url = "https://mosaic-plazaapi.hexia.io:443/api/v1/actueel-aanbod?limit=60&locale=nl_NL&page=0&sort=!reactionData.zoekprofielMatchOrder,-reactionData.zoekprofielMatchOrder,%2BreactionData.aangepasteTotaleHuurprijs"
burp0_json={"hidden-filters": {"$and": [{"dwellingType.categorie": {"$eq": "woning"}}, {"rentBuy": {"$eq": "Huur"}}, {"isExtraAanbod": {"$eq": ""}}, {"isWoningruil": {"$eq": ""}}, {"$and": [{"$or": [{"street": {"$like": ""}}, {"houseNumber": {"$like": ""}}, {"houseNumberAddition": {"$like": ""}}]}, {"$or": [{"street": {"$like": ""}}, {"houseNumber": {"$like": ""}}, {"houseNumberAddition": {"$like": ""}}]}]}]}, "woningzoekende": {"aantalMeeverhuizendeKinderen": 0, "aantalMeeverhuizendeKinderenOnder18": 0, "aowLeeftijdBereiktA1": False, "aowLeeftijdBereiktA2": None, "blokkadeVoorCorporatieIds": None, "eigenWoningId": None, "gemeenteGeoLocatieNaamA1": None, "gemeenteIdA1": 16044, "geslachtA1": "man", "geslachtA2": None, "heeftA2": False, "heeftBlokkade": False, "heeftEenTMin2Inkomen": False, "heeftElkHuishoudLidOnderbouwdInkomen": True, "heeftToegangTotExtraAanbod": False, "heeftVermogen": False, "huidigeWoonsituatieId": None, "huishoudgrootte": 1, "huisnummerA1": "11", "huisnummerA2": None, "huisnummertoevoegingA1": "16", "huisnummertoevoegingA2": None, "huurperiodeVanEinddatum": None, "huurperiodeVanStartdatum": None, "inschrijvingTypes": [{"id": "1", "inCode": "regulier"}], "isAlleenAccomodate": False, "isRechtspersoon": False, "isStudent": False, "landIdA1": 56, "landIdA2": None, "latitudeA1": 50.8363, "latitudeA2": None, "leeftijdA1": 23, "leeftijdA2": None, "longitudeA1": 4.44179, "longitudeA2": None, "onderwijsinstellingBrincode": None, "opleidingstypeId": None, "postcodeA1": "1150", "postcodeA2": None, "regioIdA1": 7, "regioIdA2": None, "soortWoningzoekendeStarterDoorstromer": None, "stageRegioId": 0, "startdatumStage": None, "startdatumStudie": None, "startDatumStudieLigtInVoorrangsPeriode": False, "studeertBijOnderwijsinstellingACTA": False, "studeertBijOnderwijsinstellingInRegioHaaglanden": False, "studeertBijOnderwijsinstellingVU": False, "studieRegioId": 0, "subtypeInschrijvingId": None, "verzamelinkomen": 41842, "voorrangen": [], "woontInNederland": False, "woontVerderVanOnderwijsinstelling": False, "woontVerderVanStudieVoorRegioHaaglanden": False}, "zoekprofiel": {"regio": [12]}}
res = session.post(burp0_url, headers=burp0_headers, json=burp0_json)
if not res.ok:
    error_occurred("could not retrieve current offers")
for house in res.json()["data"]:
    if house["gemeenteGeoLocatieNaam"] == "Delft":
        key = house["urlKey"]
        print("house found", key)
        print(ids_to_respond)
        print(house["id"])
        if str(house["id"]) not in ids_to_respond:
            continue
        if house["street"].lower() != "jan de oudeweg":
            print("the house is in", house["street"], "so I dont respond")
            continue
    
        # print("responding to", key)
    
        burp0_url = "https://plaza.newnewnew.space:443/portal/core/frontend/getformsubmitonlyconfiguration/format/json"
        #burp0_cookies = {"__Host-PHPSESSID": "a78f6252b343d0e45ee16d460a9e965a", "__cf_bm": ".s_ShEqsKLZ_0ni0Ngc4dRl719p8yAVo90x6X73Uzss-1694250357-0-ASqp9koXIpojpBxmICNMPa/qR+yMjo1GBz/n/51IcoQtuNCjfOmWdxD/9lFAQhLSZilO326215p6bScJ7p199Ms=", "fe_typo_user": "95ce66439e0c341930ba4fd10b8a1fd9", "staticfilecache": "typo_user_logged_in"}
        res = session.get(burp0_url, headers=burp0_headers)
        _hash = res.json()["form"]["elements"]["__hash__"]["initialData"]
        #burp0_url = "https://plaza.newnewnew.space/aanbod/huurwoningen/details/" + link
        _id = str(house["id"])
        _add = str(house["toewijzingID"])
        burp0_url = "https://plaza.newnewnew.space:443/portal/object/frontend/react/format/json"
        # burp0_cookies = {"__Host-PHPSESSID": "a78f6252b343d0e45ee16d460a9e965a", "__cf_bm": ".s_ShEqsKLZ_0ni0Ngc4dRl719p8yAVo90x6X73Uzss-1694250357-0-ASqp9koXIpojpBxmICNMPa/qR+yMjo1GBz/n/51IcoQtuNCjfOmWdxD/9lFAQhLSZilO326215p6bScJ7p199Ms=", "fe_typo_user": "95ce66439e0c341930ba4fd10b8a1fd9", "staticfilecache": "typo_user_logged_in"}
        burp0_data = {"__id__": "Portal_Form_SubmitOnly", "__hash__": _hash, "add": _add, "dwellingID": _id}
        sleep(0.1)
        res = session.post(burp0_url, headers=burp0_headers, data=burp0_data)
        if not res.ok:
            error_occurred("could not respond to", key)
        print("responded to ", key)

exit(0)