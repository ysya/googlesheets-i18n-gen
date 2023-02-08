import { writeFileSync } from 'fs'
import { authorize, getDataFromSpreadsheet } from './googleSheets'
import config from '../config.json'
interface Data {
  [key: string]: string
}

/** 讀取 csv */
const readCSV = async () => {
  const gAuth = await authorize()
  if (!gAuth) {
    throw Error('google auth 錯誤')
  }
  let arr_ = await getDataFromSpreadsheet(gAuth)
  return arr_
}

/** csv 陣列整理 */
const filterCSVData = async (/** 目標語言 */ lang: string): Promise<Data> => {
  const csv = await readCSV()
  /** 預設語言 目標語言沒有翻譯時使用 */
  const defaultLangIndex = csv[0].indexOf(config.defaultLang)
  if (defaultLangIndex < 0) {
    console.log('Cant find default lang in google sheet')
    process.exit()
  }
  /** 目標語言 */
  const targetLangIndex = csv[0].indexOf(lang)
  if (targetLangIndex < 0) {
    console.log('Cant find target lang in google sheet')
    process.exit()
  }

  let d: Data = {}
  csv.forEach((x: any, index: number) => {
    // 略過第一行標題
    if (index == 0) return
    const langKey = `${x[0]}.${x[1]}`
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

const main = async () => {
  config.langs.forEach(async (x) => {
    const json = await filterCSVData(x)
    try {
      writeFileSync(`output/${x}.json`, JSON.stringify(json))
    } catch (error) {
      console.log(error)
    }
  })
  console.log('Generation Success!')
}

main()
