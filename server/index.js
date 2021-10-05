const express = require('express')
const request = require('request')
const moment = require('moment')
const xml2js = require('xml2js').parseString
const app = express()
const port = 3001

var cache = {}
var stopsToUpdate = []

function updateAllStops() {
    console.log(stopsToUpdate)
    stopsToUpdate.forEach((stop, endpointIndex) => {
        updateStop(stop)
    })
    console.log(cache)
}

function getStopInfo(stop, callback) {
    let endpoint = 'http://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard?id=' + stop

    request(endpoint, {}, (err, getRes, body) => {
        if (err) {return console.log(err)}

        xml2js(body, (err, result) => {
            l = result.DepartureBoard.Departure.map(departure => {
                return departure.$
            })
            typeof callback === 'function' && callback(l)
        })
    })
}

function updateStop(stop) {
    getStopInfo(stop, (info) => {
        cache[stop] = info
    })
}

app.get('/departures', (req, res) => {
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
    res.send(stopList)
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

setInterval(updateAllStops, 5000)