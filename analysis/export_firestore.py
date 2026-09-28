# -*- coding: utf-8 -*-
"""
Firestore の sessions コレクションを Admin SDK で全件取得し、分析用CSV（3粒度）に整形して出力する。

セキュリティルールで sessions は読み取り禁止だが、サービスアカウント鍵を使う Admin SDK は
ルールをバイパスするため取得できる（無料プランで可）。

使い方:
    pip install -r requirements.txt
    # 鍵を analysis/serviceAccountKey.json に配置（または GOOGLE_APPLICATION_CREDENTIALS を設定）
    python export_firestore.py                # testRun を除外して出力
    python export_firestore.py --include-test # テスト実行も含める
"""
import os
import sys
import csv
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


def g(d, key, default=""):
    v = d.get(key, default)
    return default if v is None else v


def flatten_sessions(docs, include_test):
    sessions, trials, tests = [], [], []
    for doc in docs:
        d = doc.to_dict() or {}
        test_run = bool(d.get("testRun", False))
        if test_run and not include_test:
            continue

        dev = d.get("deviceInfo") or {}
        demo = d.get("demographics") or {}
        surv = d.get("survey") or {}
        sus = surv.get("sus") or []
        logs = d.get("logs") or []
        pre = d.get("preTest") or []
        post = d.get("transferTest") or []

        srow = {
            "sessionId": d.get("sessionId", doc.id),
            "startedAt": d.get("startedAt", ""),
            "completed": d.get("completed", False),
            "phase": d.get("phase", ""),
            "dropoutPhase": d.get("dropoutPhase", ""),
            "testRun": test_run,
            "deviceInfo_ua": g(dev, "ua"),
            "deviceInfo_screen": g(dev, "screen"),
            "deviceInfo_language": g(dev, "language"),
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
        for i in range(5):
            srow[f"sus{i+1}"] = sus[i] if i < len(sus) else ""
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
                "decision": lg.get("decision", ""),
                "confidence": lg.get("confidence", ""),
                "hintUsed": lg.get("hintUsed", ""),
                "correct": lg.get("correct", ""),
                "signalType": lg.get("signalType", ""),
                "viewedBothModalities": lg.get("viewedBothModalities", ""),
            })

        for phase, arr in (("pre", pre), ("post", post)):
            for t in arr:
                tests.append({
                    "sessionId": sid,
                    "testRun": test_run,
                    "phase": phase,
                    "questionId": t.get("questionId", ""),
                    "isFraud": t.get("isFraud", ""),
                    "difficulty": t.get("difficulty", ""),
                    "answer": t.get("answer", ""),
                    "correct": t.get("correct", ""),
                    "confidence": t.get("confidence", ""),
                    "reactionTimeMs": t.get("reactionTimeMs", ""),
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
    args = ap.parse_args()

    db = init_client()
    docs = list(db.collection("sessions").stream())
    sessions, trials, tests = flatten_sessions(docs, args.include_test)

    outdir = os.path.join(HERE, "data", "export_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
    os.makedirs(outdir, exist_ok=True)
    write_csv(os.path.join(outdir, "sessions.csv"), sessions)
    write_csv(os.path.join(outdir, "trials.csv"), trials)
    write_csv(os.path.join(outdir, "tests.csv"), tests)

    print(f"取得ドキュメント: {len(docs)} 件（テスト除外後 sessions={len(sessions)}）")
    print(f"trials={len(trials)} / tests={len(tests)}")
    print(f"出力先: {outdir}")


if __name__ == "__main__":
    main()
