import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { google } from 'googleapis'
import { authenticate } from '@google-cloud/local-auth'
import { OAuth2Client } from 'google-auth-library'
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
import config from '../config.json'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')

/** Reads previously authorized credentials from the save file. */
async function loadSavedCredentialsIfExist() {
  try {
    const content = (await readFile(TOKEN_PATH)).toString()
    const credentials = JSON.parse(content)
    return google.auth.fromJSON(credentials)
  } catch (err) {
    return null
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON. */
async function saveCredentials(client: OAuth2Client) {
  const content = (await readFile(CREDENTIALS_PATH)).toString()
  const keys = JSON.parse(content)
  const key = keys.installed || keys.web
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  })
  await writeFile(TOKEN_PATH, payload)
}

/**
 * Load or request or authorization to call APIs.
 *
 */
export async function authorize() {
  let client = await loadSavedCredentialsIfExist()
  if (client) {
    return client
  }
  const clientOAuth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  })
  await saveCredentials(clientOAuth)
  return client
}

/** 從 google spreadsheet 拿 csv */
export async function getDataFromSpreadsheet(auth: JSONClient) {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: config.worksheet,
  })
  const rows = res.data.values?.filter((x) => x.length > 0)
  if (!rows || rows.length === 0) {
    throw Error('No data found.')
  }
  let toCSV: string[] = []
  rows.forEach(async (row) => {
    toCSV.push(row.join(','), '\n')
    // console.log(toCSV)
  })
  // console.log(toCSV.toString())

  await writeFile('spreadsheet.csv', toCSV)
  return rows
}
