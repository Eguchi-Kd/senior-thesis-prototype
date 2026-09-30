# -*- coding: utf-8 -*-
"""
export_firestore.py が出力したCSV（sessions/trials/tests）の整合性を機械的に検証する。

使い方:
    python validate_export.py analysis/data/export_YYYYMMDD_HHMMSS
    python validate_export.py <フォルダ> --allow-empty   # 0件を許可（通常は0件をエラーにする）

問題IDと正解の照合には analysis/items.json（node analysis/dump_items.mjs で生成）を使う。

判定:
    ERROR = 分析にそのまま使えない（原因を調べて除外・修正が必要）
    WARN  = 分析時に注意（除外基準や感度分析で扱う）
"""
import argparse
import csv
import json
import os
import sys
from collections import Counter, defaultdict

N_TEST = 6
N_GAME = 6
N_SUS = 10
PHASE_ORDER = ["consent", "intakeEnd", "pretestStart", "pretestEnd", "practiceStart", "practiceEnd",
               "gameStart", "gameEnd", "posttestStart", "posttestEnd", "surveyEnd"]
RT_MAX_MS = 10 * 60 * 1000  # 1問10分超は異常
HIDDEN_WARN_MS = 30 * 1000  # 30秒以上の非表示はRT解釈に注意


REQUIRED = {
    "sessions.csv": ["sessionId", "completed", "schemaVersion", "contentVersion", "preForm", "postForm", "susScore",
                     "playMode", "consent_agreed"],
    "trials.csv": ["sessionId", "scenarioId", "isFraud", "decision", "correct", "signalType", "confidence",
                   "reactionTimeMs", "inspectedIds", "inspectEvents", "hintUsed", "hintAtMs"],
    "tests.csv": ["sessionId", "phase", "form", "position", "questionId", "isFraud", "answer", "correct",
                  "confidence", "signalType", "reactionTimeMs"],
}
HERE = os.path.dirname(os.path.abspath(__file__))


class FatalInput(Exception):
    pass


def read(outdir, name):
    """必須ファイルを読む。ファイルがない・ヘッダが足りない場合は FatalInput。0バイトは行なし（export の仕様）"""
    path = os.path.join(outdir, name)
    if not os.path.isfile(path):
        raise FatalInput(f"{name} がありません（エクスポートのフォルダを確認）")
    if os.path.getsize(path) == 0:
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = [c for c in REQUIRED[name] if c not in (reader.fieldnames or [])]
        if missing:
            raise FatalInput(f"{name} に必要な列がありません: {missing}")
        return list(reader)


def load_items():
    path = os.path.join(HERE, "items.json")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def b(v):
    return str(v).strip().lower() == "true"


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def expected_signal(is_fraud, decision_is_report):
    if is_fraud:
        return "hit" if decision_is_report else "miss"
    return "fa" if decision_is_report else "cr"


def check(outdir, allow_empty=False):
    """検証して (issues, counts) を返す。入力自体が読めない場合は FatalInput。select_sample.py からも使う"""
    if not os.path.isdir(outdir):
        raise FatalInput(f"フォルダがありません: {outdir}")
    sessions = read(outdir, "sessions.csv")
    trials = read(outdir, "trials.csv")
    tests = read(outdir, "tests.csv")
    issues = []  # (level, sessionId, message)

    def add(level, sid, msg):
        issues.append((level, sid, msg))

    if not sessions and not allow_empty:
        add("ERROR", "-", "セッションが0件です（パイロットなら --include-test を付けてエクスポートしたか確認。0件が正しい場合は --allow-empty）")

    items = load_items()
    test_def = {t["id"]: t for t in items["tests"]} if items else {}
    scn_def = {str(sc["id"]): sc for sc in items["scenarios"]} if items else {}
    if items is None:
        add("WARN", "-", "analysis/items.json がないため、問題IDと正解の照合を省略（node analysis/dump_items.mjs で生成）")

    trials_by = defaultdict(list)
    for t in trials:
        trials_by[t["sessionId"]].append(t)
    tests_by = defaultdict(lambda: defaultdict(list))
    for t in tests:
        tests_by[t["sessionId"]][t["phase"]].append(t)

    versions = set()
    for s in sessions:
        sid = s["sessionId"]
        completed = b(s.get("completed"))
        # ─ 区分・同意
        if s.get("playMode") not in ("research", "free"):
            add("ERROR", sid, f"playMode が不正: {s.get('playMode')!r}")
        if not b(s.get("consent_agreed")):
            add("ERROR", sid, "同意（consent_agreed）がない。研究分析に使えない")
        elif not s.get("consent_timestamp"):
            add("WARN", sid, "同意の時刻が記録されていない")
        free = s.get("playMode") == "free"  # 自由プレイは事前/事後テスト・アンケートなし（研究用データと分けて扱う）
        versions.add((s.get("schemaVersion", ""), s.get("contentVersion", "")))
        seen = [v for v in s.get("contentVersionsSeen", "").split("|") if v]
        if len(seen) > 1:
            add("WARN", sid, f"途中で配信が更新された（見た版: {seen}）。版の混在として扱う")
        if items and s.get("contentVersion") and s.get("contentVersion") != items.get("contentVersion"):
            add("WARN", sid, f"contentVersion {s.get('contentVersion')} が items.json の版 {items.get('contentVersion')} と異なる（照合結果に注意）")
        pre, post, game = tests_by[sid]["pre"], tests_by[sid]["post"], trials_by[sid]

        # ─ 件数（完了セッションは全部そろっているはず）
        if completed and free:
            if len(game) != N_GAME:
                add("ERROR", sid, f"自由プレイの本編が{len(game)}件（期待{N_GAME}）")
            if pre or post:
                add("ERROR", sid, "自由プレイなのにテストの回答がある")
        elif completed:
            if len(pre) != N_TEST:
                add("ERROR", sid, f"事前テストが{len(pre)}件（期待{N_TEST}）")
            if len(post) != N_TEST:
                add("ERROR", sid, f"事後テストが{len(post)}件（期待{N_TEST}）")
            if len(game) != N_GAME:
                add("ERROR", sid, f"ゲーム本編が{len(game)}件（期待{N_GAME}）")
            sus = [s.get(f"sus{i}", "") for i in range(1, N_SUS + 1)]
            if any(v == "" for v in sus):
                add("ERROR", sid, "SUSに欠損あり")
            if s.get("susScore", "") == "":
                add("ERROR", sid, "susScoreが計算できない")
            # 1〜5の整数で答える項目（UIは制約しているが、収集後の品質確認として検査する）
            likert = {f"sus{i}": s.get(f"sus{i}") for i in range(1, N_SUS + 1)}
            likert.update({k: s.get(k) for k in ("selfEfficacyPre", "selfEfficacyPost", "survey_learning",
                                                  "survey_immersion", "survey_difficulty", "itConfidence")})
            for k, v in likert.items():
                x = num(v)
                if x is None or x != int(x) or not (1 <= x <= 5):
                    add("ERROR", sid, f"{k} が1〜5の整数でない: {v!r}")
            if not s.get("resultType"):
                add("WARN", sid, "resultType（タイプ診断）が未保存")
        else:
            add("WARN", sid, f"未完了（最後のphase={s.get('phase')}, 非表示時のphase={s.get('lastHiddenPhase')}）")

        # ─ フォームと出題順
        if not free and s.get("preForm") and s.get("preForm") == s.get("postForm"):
            add("ERROR", sid, "事前と事後が同じフォーム")
        for phase, arr, form in (("pre", pre, s.get("preForm")), ("post", post, s.get("postForm"))):
            if arr:
                forms = {t.get("form") for t in arr}
                if form and forms != {form}:
                    add("ERROR", sid, f"{phase}のformが割付({form})と不一致: {forms}")
                pos = sorted(int(num(t.get("position")) or 0) for t in arr)
                if pos != list(range(1, len(arr) + 1)):
                    add("ERROR", sid, f"{phase}の出題順が1..nの並べ替えでない: {pos}")
                ids = [t["questionId"] for t in arr]
                if len(ids) != len(set(ids)):
                    add("ERROR", sid, f"{phase}で同じ問題に重複回答（再読み込みで二重記録の疑い）")

        # ─ テストのSDT整合・RT
        for t in pre + post:
            qd = test_def.get(t["questionId"])
            if items and qd is None:
                add("ERROR", sid, f"{t['questionId']}: 未知の問題ID")
            elif qd:
                if b(t["isFraud"]) != qd["isFraud"]:
                    add("ERROR", sid, f"{t['questionId']}: isFraud が問題定義と不一致")
                if t.get("form") and t["form"] != qd["form"]:
                    add("ERROR", sid, f"{t['questionId']}: form が問題定義({qd['form']})と不一致")
            conf = num(t.get("confidence"))
            if conf is None or not (1 <= conf <= 5):
                add("ERROR", sid, f"{t['questionId']}: 確信度が1〜5の範囲外 {t.get('confidence')}")
            if b(t.get("restarted")):
                add("WARN", sid, f"{t['questionId']}: 回答中に再読み込み（RTは測り直し）")
            is_fraud = b(t["isFraud"])
            rep = t["answer"] == "fraud"
            if b(t["correct"]) != (rep == is_fraud):
                add("ERROR", sid, f"{t['questionId']}: correct が答えと不一致")
            if t["signalType"] != expected_signal(is_fraud, rep):
                add("ERROR", sid, f"{t['questionId']}: signalType 不一致")
            rt = num(t["reactionTimeMs"])
            if rt is None or rt <= 0 or rt > RT_MAX_MS:
                add("WARN", sid, f"{t['questionId']}: RTが異常値 {t['reactionTimeMs']}")
            if (num(t.get("hiddenMs")) or 0) >= HIDDEN_WARN_MS:
                add("WARN", sid, f"{t['questionId']}: 回答中に{int(num(t['hiddenMs']) / 1000)}秒 画面非表示（RT注意）")
            if not t.get("difficulty"):
                add("ERROR", sid, f"{t['questionId']}: difficulty が空")

        # ─ ゲーム本編
        orders = sorted(int(num(t.get("presentationOrder")) or 0) for t in game)
        if completed and orders != list(range(1, N_GAME + 1)):
            add("ERROR", sid, f"本編の提示順が1..6でない: {orders}")
        dup = [k for k, c in Counter(t["scenarioId"] for t in game).items() if c > 1]
        if dup:
            add("ERROR", sid, f"本編で同じシナリオが重複記録: {dup}")
        for t in game:
            scn = t["scenarioId"]
            sd = scn_def.get(str(scn))
            if items and sd is None:
                add("ERROR", sid, f"本編{scn}: 未知のシナリオID")
            elif sd and b(t["isFraud"]) != sd["isFraud"]:
                add("ERROR", sid, f"本編{scn}: isFraud がシナリオ定義と不一致")
            conf = num(t.get("confidence"))
            if conf is None or not (1 <= conf <= 5):
                add("ERROR", sid, f"本編{scn}: 確信度が1〜5の範囲外 {t.get('confidence')}")
            is_fraud = b(t["isFraud"])
            rep = t["decision"] == "report"
            if b(t["correct"]) != (rep == is_fraud):
                add("ERROR", sid, f"本編{scn}: correct が判定と不一致")
            if t["signalType"] != expected_signal(is_fraud, rep):
                add("ERROR", sid, f"本編{scn}: signalType 不一致")
            ids = [x for x in t.get("inspectedIds", "").split("|") if x]
            events = [e for e in t.get("inspectEvents", "").split("|") if e]
            ev_ids = [e.split("@")[0] for e in events]
            if set(ids) != set(ev_ids):
                add("ERROR", sid, f"本編{scn}: inspectedIds と inspectEvents が不一致")
            if not ids:
                add("WARN", sid, f"本編{scn}: 何も調べずに判定")
            open_ms = [num(e.split("@")[1].split("+")[0]) for e in events if "@" in e]
            if open_ms != sorted(open_ms):
                add("ERROR", sid, f"本編{scn}: 調査イベントの時刻が逆順")
            if any((num(e.split("+")[1]) or 0) <= 0 for e in events if "+" in e):
                add("WARN", sid, f"本編{scn}: 閉じた記録のない調査（dwell=0）")
            hint = b(t["hintUsed"])
            if hint != (t.get("hintAtMs", "") != ""):
                add("ERROR", sid, f"本編{scn}: hintUsed と hintAtMs が不一致")
            rt, lat, fin = num(t["reactionTimeMs"]), num(t["decisionLatencyMs"]), num(t.get("finalJudgeLatencyMs"))
            if rt is None or rt <= 0 or rt > RT_MAX_MS:
                add("WARN", sid, f"本編{scn}: RTが異常値 {t['reactionTimeMs']}")
            if lat is not None and fin is not None and fin > lat:
                add("ERROR", sid, f"本編{scn}: 最後の判定画面→決定 が 最初の判定画面→決定 より長い")
            if lat is not None and rt is not None and lat > rt:
                add("ERROR", sid, f"本編{scn}: 判定画面→決定 が 初回調査→決定 より長い")
            if (num(t.get("judgeOpenCount")) or 0) < 1:
                add("ERROR", sid, f"本編{scn}: judgeOpenCount が0")
            if (num(t.get("hiddenMs")) or 0) >= HIDDEN_WARN_MS:
                add("WARN", sid, f"本編{scn}: シナリオ中に{int(num(t['hiddenMs']) / 1000)}秒 画面非表示（RT注意）")
            if b(t.get("restarted")):
                add("WARN", sid, f"本編{scn}: 再読み込みでやり直し（調査ログはやり直し後のみ）")

        # ─ フェーズ時刻の順序と所要時間
        times = [(p, num(s.get(f"t_{p}"))) for p in PHASE_ORDER]
        present = [(p, v) for p, v in times if v]
        for (p1, v1), (p2, v2) in zip(present, present[1:]):
            if v2 < v1:
                add("ERROR", sid, f"フェーズ時刻が逆順: {p1} > {p2}")
        if completed and not free:
            missing = [p for p, v in times if not v]
            if missing:
                add("WARN", sid, f"フェーズ時刻の欠損: {missing}")
            dur = num(s.get("totalDurationSec"))
            if dur is not None and (dur < 180 or dur > 3600):
                add("WARN", sid, f"所要時間が極端: {int(dur)}秒")
        if (num(s.get("resumeCount")) or 0) > 0:
            add("WARN", sid, f"再読み込みで{s['resumeCount']}回再開")
        if (num(s.get("priorPlays")) or 0) > 0:
            add("WARN", sid, f"この端末で過去に{s['priorPlays']}回プレイ（共用端末なら別人の可能性）")

    if len(versions) > 1:
        add("WARN", "-", f"複数の版が混在: {sorted(versions)}（版ごとに分けて分析）")

    return issues, (len(sessions), len(trials), len(tests))


def main(outdir, allow_empty=False):
    try:
        issues, (ns, nt, nq) = check(outdir, allow_empty)
    except FatalInput as e:
        print(f"[ERROR] {e}")
        return 1
    n_err = sum(1 for lv, _, _ in issues if lv == "ERROR")
    n_warn = sum(1 for lv, _, _ in issues if lv == "WARN")
    print(f"sessions={ns} trials={nt} tests={nq}")
    for lv, sid, msg in issues:
        print(f"[{lv}] {sid}: {msg}")
    print(f"\n結果: ERROR {n_err} 件 / WARN {n_warn} 件")
    return 1 if n_err else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("outdir", help="export_firestore.py の出力フォルダ")
    ap.add_argument("--allow-empty", action="store_true", help="0件でもエラーにしない")
    a = ap.parse_args()
    sys.exit(main(a.outdir, a.allow_empty))
