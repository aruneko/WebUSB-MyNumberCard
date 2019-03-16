export class PersonalData {
  readonly name: string
  readonly address: string
  readonly birthday: Date
  readonly sex: string

  constructor(rawData: Uint8Array) {
    // デコード用
    const decoder = new TextDecoder("UTF-8")

    // 全体のヘッダを切り落とす
    let tmpRawData = rawData.slice(3)

    // データのヘッダを切り落とす
    const headerLength = tmpRawData[2]
    tmpRawData = tmpRawData.slice(3 + headerLength)

    // 名前の取得
    const nameLength = tmpRawData[2]
    this.name = decoder.decode(tmpRawData.slice(3, 3 + nameLength))
    tmpRawData = tmpRawData.slice(3 + nameLength)

    // 住所の取得
    const addressLength = tmpRawData[2]
    this.address = decoder.decode(tmpRawData.slice(3, 3 + addressLength))
    tmpRawData = tmpRawData.slice(3 + addressLength)

    // 誕生日の取得
    const birthdayLength = tmpRawData[2]
    const birthday = decoder.decode(tmpRawData.slice(3, 3 + birthdayLength))
    const year = Number(birthday.slice(0, 4))
    const month = Number(birthday.slice(4, 6)) - 1
    const date = Number(birthday.slice(6, 8))
    console.error(year, month, date)
    this.birthday = new Date(year, month, date)
    tmpRawData = tmpRawData.slice(3 + birthdayLength)

    // 性別の取得
    const sex = decoder.decode(Uint8Array.of(tmpRawData[3]))
    if (sex === "1") {
      this.sex = "男性"
    } else if (sex === "2") {
      this.sex = "女性"
    } else if (sex === "9") {
      this.sex = "適用不能"
    } else {
      this.sex = "不明"
    }
  }
}