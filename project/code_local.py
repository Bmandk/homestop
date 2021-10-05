import requests
import json
import math
from datetime import datetime

def json_to_string(val):
    filteredList = [x for x in val["DepartureBoard"]["Departure"] if x["direction"] == "Refshaleøen"]
    now = datetime.now()
    print(now)
    s = ""
    c = 0
    for departure in filteredList:
        time = departure["time"]
        date = departure["date"]
        if "rtTime" in departure:
            time = departure["rtTime"]
        if "rtDate" in departure:
            date = departure["rtDate"]
        date = date.split(".")
        time = time.split(":")
        dDateTimeObject = datetime(int(date[2]) + 2000, int(date[1]), int(date[0]), int(time[0]), int(time[1]))
        if dDateTimeObject < now:
            continue
        minutes = math.floor((dDateTimeObject - now).seconds / 60)
        minutesStr = str(minutes)
        if len(minutesStr) == 1:
            minutesStr = "0" + minutesStr
        s = s + "2A:" + minutesStr + "\n"
        c = c + 1
        if c >= 4:
            break
    return s

endpoint = "https://api.factmaven.com/xml-to-json/?xml=https://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard?id=000000706"
response = requests.get(endpoint)
j = response.json()
print(json_to_string(j))
