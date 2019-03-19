# マイナンバーカードドライバー
## これなに
WebUSBでマイナンバーカードを制御するドライバーです。

## インストール方法
```bash
$ npm i my_number_card_driver
# or
$ yarn add my_number_card_driver
```

## 動作環境
- NFCカードリーダー
    - Sony RC-S380
- WebUSB実装ブラウザー
    - Google Chrome
    - Chromium
    - Opera

## 実装済み機能
- 認証用証明書
    - 公開鍵の読み込み
    - 秘密鍵によるメッセージのサイン
- PIN認証
- マイナンバー取得API
- 4情報取得API

## 未実装の機能
- 署名用証明書
- 顔写真取得API

## 使い方
### マイナンバーの読み取り
券面情報入力用のPINを入力すると取得できます。

```TypeScript
import { MyNumberCard } from 'my_number_card_driver'

async getMyNumber(): Promise<string> {
    const pin = "0000";
    const myNumberCard = await MyNumberCard.connect();
    const myNumber = await myNumberCard.getMyNumber(pin);
    return myNumber;
  }
```

### 4情報の取得
4情報(住所・氏名・年齢・性別)を取得できます。

```TypeScript
import { MyNumberCard } from 'my_number_card_driver'

async getPersonalData(): Promise<PersonalData> {
    const pin = "0000";
    const myNumberCard = await MyNumberCard.connect();
    const personalData = await myNumberCard.getPersonalData(pin);
    return personalData;
}
```


### 公開鍵の読み出し
特に認証などは必要ありません。カードに接続したらいきなり読み出せます。

```TypeScript
import { MyNumberCard } from 'my_number_card_driver'

async readPublicKey(): Promise<Uint8Array> {
    const myNumberCard = await MyNumberCard.connect();
    const publicKey = await myNumberCard.getPublicKey();
    return publicKey;
}
```

### 秘密鍵を使ったメッセージのサイン
4ケタのPINとサインしたいメッセージ、ダイジェストに使うハッシュのアルゴリズムを指定する必要があります。

ハッシュに使うアルゴリズムは文字列で指定しますが、TypeScriptにより下記のように定義してあります。
いずれかの文字列をご利用ください。

```TypeScript
type HashType = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
```

カードに接続してPINとメッセージを入力すると、サイン済みのバイナリ列を受け取れます。

```TypeScript
import { MyNumberCard } from 'my_number_card_driver'

async signWithPrivateKey(message: string, hashType: string): Promise<Uint8Array> {
    const pin = "0000";
    const myNumberCard = await MyNumberCard.connect();
    const signedMessage = await myNumberCard.signMessageWithPrivateKey(
      hashType,
      pin,
      message
    );
    return signedMessage;
}
```

### 応用例 - 非対称鍵を使ったWebサービスのログイン
下記のようなシーケンスを行うバックエンドを構築すれば、
任意のWebサービスにマイナンバーカードを使ったパスワードレス認証を組み込めます。

![認証シーケンス](./auth_with_my_number_card.png)

## npm package
[my_number_card_driver](https://www.npmjs.com/package/my_number_card_driver)

## ライセンス
MIT
