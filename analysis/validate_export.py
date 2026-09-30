# -*- coding: utf-8 -*-
"""
export_firestore.py が出力したCSV（sessions/trials/tests）の整合性を機械的に検証する。

使い方:
    python validate_export.py analysis/data/export_YYYYMMDD_HHMMSS

判定:
    ERROR = 分析にそのまま使えない（原因を調べて除外・修正が必要）
    WARN  = 分析時に注意（除外基準や感度分析で扱う）
"""
import csv
import os
import sys
from collections import defaultdict

N_TEST = 6
N_GAME = 6
N_SUS = 10
PHASE_ORDER = ["consent", "intakeEnd", "pretestStart", "pretestEnd", "practiceStart", "practiceEnd",
               "gameStart", "gameEnd", "posttestStart", "posttestEnd", "surveyEnd"]
RT_MAX_MS = 10 * 60 * 1000  # 1問10分超は異常
HIDDEN_WARN_MS = 30 * 1000  # 30秒以上の非表示はRT解釈に注意


def read(path):
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


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


def main(outdir):
    sessions = read(os.path.join(outdir, "sessions.csv"))
    trials = read(os.path.join(outdir, "trials.csv"))
    tests = read(os.path.join(outdir, "tests.csv"))
    issues = []  # (level, sessionId, message)

    def add(level, sid, msg):
        issues.append((level, sid, msg))

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
        versions.add((s.get("schemaVersion", ""), s.get("contentVersion", "")))
        pre, post, game = tests_by[sid]["pre"], tests_by[sid]["post"], trials_by[sid]

        # ─ 件数（完了セッションは全部そろっているはず）
        if completed:
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
            if not s.get("resultType"):
                add("WARN", sid, "resultType（タイプ診断）が未保存")
        else:
            add("WARN", sid, f"未完了（最後のphase={s.get('phase')}, 非表示時のphase={s.get('lastHiddenPhase')}）")

        # ─ フォームと出題順
        if s.get("preForm") and s.get("preForm") == s.get("postForm"):
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
        for t in game:
            scn = t["scenarioId"]
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
        if completed:
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

    # ─ 出力
    n_err = sum(1 for lv, _, _ in issues if lv == "ERROR")
    n_warn = sum(1 for lv, _, _ in issues if lv == "WARN")
    print(f"sessions={len(sessions)} trials={len(trials)} tests={len(tests)}")
    for lv, sid, msg in issues:
        print(f"[{lv}] {sid}: {msg}")
    print(f"\n結果: ERROR {n_err} 件 / WARN {n_warn} 件")
    return 1 if n_err else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("使い方: python validate_export.py <export_フォルダ>")
    sys.exit(main(sys.argv[1]))
