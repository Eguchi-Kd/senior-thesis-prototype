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

export interface ScenarioObject {
  id: string; // Room.tsx の形状定義に対応（smartphone/calendar/id_card/receipt/poster）
  label: string;
  position: [number, number, number];
  content: string | DigitalContent; // string=物理オブジェクト / DigitalContent=デジタル端末
}

export interface Scenario {
  id: number;
  title: string;
  description: string;
  anomaly: { type: string; clue: string };
  objects: ScenarioObject[];
  isFraud: boolean;
  difficulty: Difficulty;
  explanation: string;
  learningPoint: string;
}
