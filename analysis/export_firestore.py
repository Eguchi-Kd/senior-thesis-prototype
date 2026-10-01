# -*- coding: utf-8 -*-
"""
Firestore の sessions コレクションを Admin SDK で全件取得し、分析用CSV（3粒度）に整形して出力する。

セキュリティルールで sessions は読み取り禁止だが、サービスアカウント鍵を使う Admin SDK は
ルールをバイパスするため取得できる（無料プランで可）。

使い方:
    pip install -r requirements.txt
    # 鍵を analysis/serviceAccountKey.json に配置（または GOOGLE_APPLICATION_CREDENTIALS を設定）
    python export_firestore.py                # testRun を除外して出力
    python export_firestore.py --include-test # テスト実行も含める（パイロットは ?test=1 なので必須）
    python export_firestore.py --include-free # 2回目以降の自由プレイも含める（研究用データとは別。既定は除外）
"""
import os
import sys
import csv
import json
import argparse
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_KEY = os.path.join(HERE, "serviceAccountKey.json")


def init_client():
    key = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", DEFAULT_KEY)
    if not os.path.exists(key):
        sys.exit(
            f"サービスアカウント鍵が見つかりません: {key}\n"
            "Firebaseコンソール → プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成 で取得し、"
            "analysis/serviceAccountKey.json に保存してください。"
        )
    cred = credentials.Certificate(key)
    firebase_admin.initialize_app(cred)
    return firestore.client()


class JsonDoc:
    """JSONの1セッションを Firestore の DocumentSnapshot と同じ使い方にする"""

    def __init__(self, d):
        self._d = d
        self.id = d.get("sessionId", "")

    def to_dict(self):
        return self._d


def g(d, key, default=""):
    v = d.get(key, default)
    return default if v is None else v


PHASES = ["consent", "intakeEnd", "pretestStart", "pretestEnd", "practiceStart", "practiceEnd",
          "gameStart", "gameEnd", "posttestStart", "posttestEnd", "surveyEnd"]


def sus_score(sus):
    """SUS 10項目の得点（0〜100）。旧形式（5項目）や欠損は空文字。"""
    if len(sus) != 10 or any(not isinstance(x, (int, float)) for x in sus):
        return ""
    odd = sum(sus[i] - 1 for i in range(0, 10, 2))
    even = sum(5 - sus[i] for i in range(1, 10, 2))
    return (odd + even) * 2.5


def flatten_sessions(docs, include_test, include_free=False):
    sessions, trials, tests = [], [], []
    for doc in docs:
        d = doc.to_dict() or {}
        test_run = bool(d.get("testRun", False))
        if test_run and not include_test:
            continue
        play_mode = d.get("playMode", "research")
        if play_mode == "free" and not include_free:
            continue

        dev = d.get("deviceInfo") or {}
        demo = d.get("demographics") or {}
        surv = d.get("survey") or {}
        sus = surv.get("sus") or []
        logs = d.get("logs") or []
        pre = d.get("preTest") or []
        post = d.get("transferTest") or []
        forms = d.get("testForms") or {}
        consent = d.get("consent") or {}
        times = d.get("phaseTimes") or {}

        srow = {
            "sessionId": d.get("sessionId", doc.id),
            "participantCode": d.get("participantCode", ""),
            "startedAt": d.get("startedAt", ""),
            "completed": d.get("completed", False),
            "phase": d.get("phase", ""),
            "dropoutPhase": d.get("dropoutPhase", ""),
            "testRun": test_run,
            "playMode": play_mode,
            "consent_agreed": bool(consent.get("agreed", False)),
            "consent_timestamp": consent.get("timestamp", "") or "",
            "schemaVersion": d.get("schemaVersion", 1),
            "contentVersion": d.get("contentVersion", ""),
            "contentVersionsSeen": "|".join(d.get("contentVersionsSeen") or []),
            "priorPlays": d.get("priorPlays", ""),
            "resumeCount": d.get("resumeCount", ""),
            "hiddenCount": d.get("hiddenCount", ""),
            "hiddenTotalMs": d.get("hiddenTotalMs", ""),
            "lastHiddenPhase": d.get("lastHiddenPhase", ""),
            "resultType": d.get("resultType", ""),
            "preForm": g(forms, "pre"),
            "postForm": g(forms, "post"),
            "deviceInfo_ua": g(dev, "ua"),
            "deviceInfo_screen": g(dev, "screen"),
            "deviceInfo_language": g(dev, "language"),
            "deviceInfo_viewport": g(dev, "viewport"),
            "deviceInfo_touch": g(dev, "touch"),
            "deviceInfo_orientation": g(dev, "orientation"),
            "ageGroup": g(demo, "ageGroup"),
            "occupation": g(demo, "occupation"),
            "gender": g(demo, "gender"),
            "scamExperience": g(demo, "scamExperience"),
            "itConfidence": g(demo, "itConfidence"),
            "selfEfficacyPre": d.get("selfEfficacyPre", ""),
            "selfEfficacyPost": d.get("selfEfficacyPost", ""),
            "survey_learning": g(surv, "learning"),
            "survey_immersion": g(surv, "immersion"),
            "survey_difficulty": g(surv, "difficulty"),
            "survey_freeText": g(surv, "freeText"),
            "scenarioOrder": "|".join(str(x) for x in (d.get("scenarioOrder") or [])),
            "n_logs": len(logs),
            "n_preTest": len(pre),
            "n_transfer": len(post),
        }
        for i in range(10):
            srow[f"sus{i+1}"] = sus[i] if i < len(sus) else ""
        srow["susScore"] = sus_score(sus)
        for p in PHASES:
            srow[f"t_{p}"] = times.get(p, "")
        start, end = times.get("consent"), times.get("surveyEnd")
        srow["totalDurationSec"] = round((end - start) / 1000) if start and end else ""
        sessions.append(srow)

        sid = srow["sessionId"]
        for lg in logs:
            trials.append({
                "sessionId": sid,
                "testRun": test_run,
                "scenarioId": lg.get("scenarioId", ""),
                "isFraud": lg.get("isFraud", ""),
                "difficulty": lg.get("difficulty", ""),
                "presentationOrder": lg.get("presentationOrder", ""),
                "reactionTimeMs": lg.get("reactionTimeMs", ""),
                "explorationTimeMs": lg.get("explorationTimeMs", ""),
                "decisionLatencyMs": lg.get("decisionLatencyMs", ""),
                "finalJudgeLatencyMs": g(lg, "finalJudgeLatencyMs"),
                "judgeOpenCount": g(lg, "judgeOpenCount"),
                "hiddenMs": g(lg, "hiddenMs"),
                "hiddenAfterFirstInspectMs": g(lg, "hiddenAfterFirstInspectMs"),
                "restarted": g(lg, "restarted"),
                "decision": lg.get("decision", ""),
                "confidence": lg.get("confidence", ""),
                "hintUsed": lg.get("hintUsed", ""),
                "hintAtMs": g(lg, "hintAtMs"),
                "hintAtScenarioMs": g(lg, "hintAtScenarioMs"),
                "decisionBeforeHint": g(lg, "decisionBeforeHint"),
                "correct": lg.get("correct", ""),
                "signalType": lg.get("signalType", ""),
                "viewedBothModalities": lg.get("viewedBothModalities", ""),  # 旧形式のデータ用
                "viewedAllRelevant": lg.get("viewedAllRelevant", ""),
                "distractorsInspected": lg.get("distractorsInspected", ""),
                "inspectedIds": "|".join(lg.get("inspectedIds", []) or []),
                # 調査イベント：id@開始ms+滞在ms を | 区切り（例 calendar@3200+4100|smartphone@9000+6500）
                "inspectEvents": "|".join(
                    f"{e.get('id','')}@{e.get('openMs','')}+{e.get('dwellMs','')}"
                    for e in (lg.get("inspectEvents") or [])
                ),
                "n_inspects": len(lg.get("inspectEvents") or []),
            })

        for phase, arr in (("pre", pre), ("post", post)):
            for t in arr:
                tests.append({
                    "sessionId": sid,
                    "testRun": test_run,
                    "phase": phase,
                    "form": t.get("form", ""),
                    "position": t.get("position", ""),
                    "questionId": t.get("questionId", ""),
                    "isFraud": t.get("isFraud", ""),
                    "difficulty": t.get("difficulty", ""),
                    "answer": t.get("answer", ""),
                    "correct": t.get("correct", ""),
                    "confidence": t.get("confidence", ""),
                    "reactionTimeMs": t.get("reactionTimeMs", ""),
                    "hiddenMs": t.get("hiddenMs", ""),
                    "restarted": t.get("restarted", ""),
                    "signalType": t.get("signalType", ""),
                })
    return sessions, trials, tests


def write_csv(path, rows):
    if not rows:
        # 空でもヘッダ無しの空ファイルを作らず、存在だけ知らせる
        open(path, "w", encoding="utf-8-sig", newline="").close()
        return
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--include-test", action="store_true", help="testRun=Trueのセッションも含める")
    ap.add_argument("--include-free", action="store_true", help="自由プレイ（playMode=free）も含める")
    ap.add_argument("--from-json", help="Firestoreの代わりにJSON（simulate_sessions の出力など）から読み込む")
    args = ap.parse_args()

    if args.from_json:
        with open(args.from_json, encoding="utf-8") as f:
            raw = json.load(f)
        docs = [JsonDoc(d) for d in raw]
    else:
        db = init_client()
        docs = list(db.collection("sessions").stream())
    sessions, trials, tests = flatten_sessions(docs, args.include_test, args.include_free)

    outdir = os.path.join(HERE, "data", "export_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
    os.makedirs(outdir, exist_ok=True)
    write_csv(os.path.join(outdir, "sessions.csv"), sessions)
    write_csv(os.path.join(outdir, "trials.csv"), trials)
    write_csv(os.path.join(outdir, "tests.csv"), tests)

    print(f"取得ドキュメント: {len(docs)} 件（テスト除外後 sessions={len(sessions)}）")
    print(f"trials={len(trials)} / tests={len(tests)}")
    print(f"出力先: {outdir}")
    print(f"検証: python validate_export.py \"{outdir}\"")


if __name__ == "__main__":
    main()
