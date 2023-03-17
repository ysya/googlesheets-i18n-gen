export interface Config {
  /** 專案名稱 */
  readonly name: string
  /** google sheet id */
  readonly spreadsheetId: string
  /** 工作分頁 */
  readonly worksheet: string
  /** 預設語言 */
  readonly defaultLang: string
  /** 目標語言 */
  readonly langs: string[]
  readonly langKey: string
  readonly outputPath: string[]
}
