const request = require('request-promise')
const moment = require('moment')
const xml2js = require('xml2js').parseString
const util = require('util');
xml2js.promise = util.promisify(xml2js);


async function getStopInfo(context, stop) {
    let endpoint = 'http://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard?id=' + stop

    let response = await request(endpoint, {});

    jsonResult = await xml2js.promise(response);
    let l = jsonResult.DepartureBoard.Departure.map(departure => {
        return departure.$
    });
    return l;
}

async function updateStop(stop) {
    await getStopInfo(stop, (info) => {
        cache[stop] = info
    })
}

async function getStops(context, stops, callback) {
    let l = []
    context.log(stops.length)
    for (let i = 0; i < stops.length; i++) {
        let stopInfo = await getStopInfo(context, stops[i]);
        context.log(stopInfo);
        l.push(stopInfo)
    }
    return l;
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

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const name = (req.query.name || (req.body && req.body.name));
    const responseMessage = name
        ? "Hello, " + name + ". This HTTP triggered function executed successfully."
        : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

    jsonData = await getStops(context, req.query.stops.split(','));
    context.log("Root")

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: jsonData
    };
}