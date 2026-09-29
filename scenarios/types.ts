// シナリオ共通の型定義。
// デジタル情報は senderAddress / url を独立フィールドで持ち、調査UIで手がかりとして精査させる。

export type Difficulty = "easy" | "medium" | "hard";

export interface DigitalContent {
  type: "sms" | "email" | "app" | "system";
  sender: string; // 表示名（例: Amazon）
  senderAddress?: string; // 実アドレス/ドメイン（例: info@amazon-jp.delivery-support.com）
  body: string;
  url?: string; // リンク先URL（例: http://amazon-jp.delivery-support.com/redelivery）
  timestamp: string;
}

// 部屋に常設する4オブジェクト（Room.tsx の形状・定位置に対応）
export type ObjectId = "calendar" | "receipt" | "poster" | "smartphone";

export interface ScenarioObject {
  id: ObjectId;
  label: string;
  position?: [number, number, number]; // 省略時は Room.tsx の定位置
  content: string | DigitalContent[]; // string=物理オブジェクト / 配列=スマホの通知一覧（ダミー通知を含む）
}

export interface Scenario {
  id: number;
  title: string;
  description: string;
  anomaly: { type: string; clue: string }; // clue=研究者向けの正解根拠（プレイヤーには出さない）
  hint: string; // プレイヤー向けヒント：答えではなく「どこを見比べるか」だけを示す
  relevantIds: ObjectId[]; // 判定に必要なオブジェクト（残りはダミー）
  objects: ScenarioObject[];
  isFraud: boolean;
  difficulty: Difficulty;
  explanation: string;
  learningPoint: string;
}
