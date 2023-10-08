const request = require('request-promise')
const moment = require('moment')
const xml2js = require('xml2js').parseString
const util = require('util');
xml2js.promise = util.promisify(xml2js);


async function getDepartures(stops) {
    let endpoint = 'http://xmlopen.rejseplanen.dk/bin/rest.exe/multiDepartureBoard?format=json'
    for (let i = 0; i < stops.length; i++) {
        endpoint = endpoint + "&id" + (i + 1) + "=" + stops[i]
    }
    let response = await request(endpoint, {json: true});
    return response["MultiDepartureBoard"]["Departure"];
}

function transformDeparture(departure) {
    let date = departure.rtDate ? departure.rtDate : departure.date
    let time = departure.rtTime ? departure.rtTime : departure.time
    dateTime = moment(date + " " + time, "DD.MM.YY hh:mm")
    let minutes = Math.trunc((dateTime - moment()) / 1000 / 60)
    
    let transformedStop = {
        line: departure.line,
        minutes: minutes
    }

    return transformedStop;
}

function transformDepartures(departures) {
    return departures.map((departure) => transformDeparture(departure));
}

function filterDepartures(departures, lines, directions) {
    return departures.filter((departure) => {
        return lines.includes(departure.line) && directions.includes(departure.direction);
    })
}

function sortTransformedDeparturesByMinutes(transformedDepartures) {
    transformedDepartures.sort((a, b) => a.minutes > b.minutes ? 1 : -1)
    return transformedDepartures;
}

const findStopInfo = async (req, res) => {
    let stops = req.query.stops.split(',')
    let directions = req.query.directions.split(',')
    let lines = req.query.lines.split(',')
    let stopList = []

    stops.forEach((stop, stopIndex) => {
        if (stop in cache) {
            let filteredList = cache[stop].filter((departure) => {
                return lines[stopIndex] == departure.line && directions[stopIndex] == departure.direction
            })
            filteredList = filteredList.map(departure => {
                let date = departure.rtDate ? departure.rtDate : departure.date
                let time = departure.rtTime ? departure.rtTime : departure.time
                dateTime = moment(date + " " + time, "DD.MM.YY hh:mm")
                let minutes = Math.trunc((dateTime - moment()) / 1000 / 60)
                return {
                    line: departure.line,
                    minutes: minutes
                }
            })
            filteredList = filteredList.filter(departure => departure.minutes >= 0)
            stopList.push(...filteredList)
        }
        else if (stopsToUpdate.indexOf(stop) === -1) {
            stopsToUpdate.push(stop)
            updateStop(stop) // Update the stop immediately
        }
    })


    stopList.sort((a, b) => a.minutes > b.minutes ? 1 : -1)
    res = {
        body: JSON.stringify(stopList)
    }
}

async function getFinalTimetable(req) {
    let stops = req.query.stops.split(',')
    let directions = req.query.directions.split(',')
    let lines = req.query.lines.split(',')

    let departures = await getDepartures(stops);
    let filteredDepartures = filterDepartures(departures, lines, directions);
    let transformedDepartures = transformDepartures(filteredDepartures);
    transformedDepartures = transformedDepartures.filter(departure => departure.minutes >= 0);

    let finalList = sortTransformedDeparturesByMinutes(transformedDepartures);

    return finalList;
}

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    jsonData = await getFinalTimetable(req);

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: jsonData
    };
}