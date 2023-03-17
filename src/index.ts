import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { authorize, getDataFromSpreadsheet } from './googleSheets'
import { Command } from 'commander'
import { Config } from '../env'
const program = new Command()
program
  .name('i18n-gen')
  .description('generate i18n from google sheet')
  .version('0.1.0')
program
  .command('gen')
  .description('name of config')
  .argument('<projectName>', 'name of project config')
  .action((projectName) => {
    console.log('project config:', projectName)
    main(projectName)
  })
program.parse()

interface Data {
  [key: string]: string
}

/** 讀取 csv */
const readCSV = async (spreadsheetId: string, worksheet: string) => {
  const gAuth = await authorize()
  if (!gAuth) {
    throw Error('google auth 錯誤')
  }
  let arr_ = await getDataFromSpreadsheet(gAuth, { spreadsheetId, worksheet })
  return arr_
}

/** csv 陣列整理 */
const filterCsvData = async (
  /** 預設語言 */ defaultLang: string,
  /** 目標語言 */ lang: string,
  /** key 欄位名稱 */ langKey: string,
  /** 目標csv */ csv: any[][]
): Promise<Data> => {
  /** 預設語言 目標語言沒有翻譯時使用 */
  const defaultLangIndex = csv[0].indexOf(defaultLang)
  if (defaultLangIndex < 0) {
    throw new Error('Cant find default lang in google sheet')
  }
  /** 目標語言 */
  const targetLangIndex = csv[0].indexOf(lang)
  if (targetLangIndex < 0) {
    throw new Error('Cant find target lang in google sheet')
  }

  /** key 欄位 */
  const keyIndex = csv[0].indexOf(langKey)
  if (keyIndex < 0) {
    throw new Error('Cant find langKey in google sheet')
  }

  let d: Data = {}
  csv.forEach((x: any, index: number) => {
    // 略過第一行標題
    if (index == 0) return
    const langKey = x[keyIndex]
    const langValue = x[targetLangIndex]
    // 若目標語言沒有值，使用預設語言
    if (langValue && langValue.length <= 0) {
      d[langKey] = x[defaultLangIndex] || ''
      return
    }
    d[langKey] = langValue
  })
  return d
}

async function checkFolderExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

async function main(projectName: string) {
  try {
    const config: Config = await import(`../${projectName}.config.json`)
    // console.log(config)
    config.langs.forEach(async (x) => {
      const csv = await readCSV(config.spreadsheetId, config.worksheet)
      const json = await filterCsvData(
        config.defaultLang,
        x,
        config.langKey,
        csv
      )
      // 遍歷指定路徑
      config.outputPath.forEach(async (y) => {
        const outPath = `${y}/${projectName}`
        try {
          await checkFolderExists(outPath)
          writeFileSync(`${outPath}/${x}.json`, JSON.stringify(json))
        } catch (error) {
          throw error
        }
      })
    })
    console.log('Generation Success!')
  } catch (error) {
    console.log(error)
  }
}
