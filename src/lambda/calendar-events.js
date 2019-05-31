require('dotenv').config()
const { google } = require('googleapis')

// const MAX_RESULTS = process.env.MAX_RESULTS
const CALENDAR_ID = process.env.CALENDAR_ID
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI

const TOKEN = {
  access_token: process.env.ACCESS_TOKEN,
  refresh_token: process.env.REFRESH_TOKEN,
  scope: "https://www.googleapis.com/auth/calendar.readonly",
  token_type: "Bearer",
  expiry_date: process.env.EXPIRY_DATE
}

const Authorize = async () => {
  let oAuth2Client = await new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
  oAuth2Client.setCredentials(TOKEN)
  return await google.calendar({
    version: 'v3',
    auth: oAuth2Client
  })
}

const getEvents = async ({ maxEvents = null, date = null }) => {
  maxEvents = parseInt(maxEvents)
  console.log(maxEvents)
  let _query = {
    calendarId: CALENDAR_ID,
    timeMin: (new Date()).toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime'
  }

  if (date && !maxEvents) {
    _query.timeMin = `${date.replace(/\"/g, '')}T05:00:00.000Z`
    _query.timeMax = `${date.replace(/\"/g, '')}T23:30:00-05:00`
    _query.maxResults = maxEvents || 1
  } else if(date && maxEvents || !date && maxEvents) {
      _query.timeMin =  date ? `${date}T05:00:00.000Z` : (new Date()).toISOString()
      _query.maxResults = maxEvents
  } else {
    // defaults...
  }

  const calendar = await Authorize()

  return await calendar.events.list(_query)
}

exports.handler = (event, context, callback) => {
  let { maxEvents, date } = event.queryStringParameters
  getEvents({ maxEvents, date }).then(res => {
    const events = res.data.items
    const calEvents = {
      success: true,
      message: 'success',
      events: []
    }
    if (events.length) {
      calEvents.events = events.map(event => ({
        id: event.id,
        status: event.status,
        iCalUID: event.iCalUID,
        recurringEventId: event.recurringEventId,
        htmlLink: event.htmlLink,
        extendedPropertiesShared: event.extendedProperties.shared,
        extendedPropertiesPrivate: event.extendedProperties.private,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        summary: event.summary || '',
        description: event.description || ''
      }))
      return calEvents
    } else {
      calEvents.events = "none"
      return calEvents
    }
  })
    .then(res => {
      callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          'Access-Control-Allow-Headers': 'application/json',
        },
        body: JSON.stringify(res)
      })
    })
    .catch(e => {
      callback(e +":you must enter a minimum of a date or maxEvents=1")
    })
}