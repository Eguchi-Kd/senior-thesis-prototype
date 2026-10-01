# -*- coding: utf-8 -*-
"""
分析計画（docs/分析計画.md の「除外基準」）を機械的に適用し、研究分析に使うセッションを確定する。
元のCSVは変更せず、<export_フォルダ>/sample/ に採否一覧と採用分のCSVを書き出す。

使い方:
    python select_sample.py <export_フォルダ> [--content-version 2026-10-05] [--staff staff.csv]

    --content-version : 本収集の対象版（指定すると他の版を除外。複数の版が含まれる場合は必須）
    --include-test    : テスト実行を除外しない（パイロットの確認用。本実験の分析では使わない）
    --staff           : 担当者記録（参加者コード単位）。列：participantCode, exclude(1/0), reason
                        例）本人初回でないと確認できた、操作を大きく手伝った、途中で交代した 等
出力:
    sample/inclusion.csv  … 全セッションの採否と理由（除外理由は複数あり得る）
    sample/sessions.csv, trials.csv, tests.csv … 採用セッションのみ
"""
import argparse
import csv
import os
import sys
from collections import defaultdict

from validate_export import FatalInput, check, read

MIN_DURATION_SEC = 180


def b(v):
    return str(v).strip().lower() in ("true", "1")


def load_staff(path):
    if not path:
        return {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        return {r["participantCode"].strip().upper(): r for r in csv.DictReader(f) if r.get("participantCode")}


def write(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("outdir")
    ap.add_argument("--content-version")
    ap.add_argument("--staff")
    ap.add_argument("--include-test", action="store_true", help="パイロット確認用：testRun を除外しない")
    a = ap.parse_args()

    try:
        issues, _ = check(a.outdir, allow_empty=True)
        sessions = read(a.outdir, "sessions.csv")
        trials = read(a.outdir, "trials.csv")
        tests = read(a.outdir, "tests.csv")
    except FatalInput as e:
        sys.exit(f"[ERROR] {e}")

    errors = defaultdict(list)
    for lv, sid, msg in issues:
        if lv == "ERROR":
            errors[sid].append(msg)
    staff = load_staff(a.staff)

    # 異なる版を合算しない（分析計画 6.）。複数の版があるのに対象版の指定がなければ止める
    versions = sorted({s.get("contentVersion", "") for s in sessions})
    if len(versions) > 1 and not a.content_version:
        sys.exit(f"[ERROR] 複数の版が含まれています {versions}。--content-version で対象版を指定してください")

    decisions = []
    included = set()
    for s in sessions:
        sid = s["sessionId"]
        reasons, notes = [], []
        if b(s.get("testRun")) and not a.include_test:
            reasons.append("テスト実行")
        if s.get("playMode") == "free":
            reasons.append("自由プレイ")
        if not b(s.get("consent_agreed")):
            reasons.append("同意なし")
        if not b(s.get("completed")):
            reasons.append("未完了")
        if errors.get(sid):
            reasons.append("検証エラー: " + " / ".join(errors[sid][:3]))
        dur = s.get("totalDurationSec", "")
        if dur not in ("", None) and float(dur) < MIN_DURATION_SEC:
            reasons.append(f"所要時間{MIN_DURATION_SEC // 60}分未満")
        if len([v for v in s.get("contentVersionsSeen", "").split("|") if v]) > 1:
            reasons.append("版の混在")
        if a.content_version and s.get("contentVersion") != a.content_version:
            reasons.append(f"対象外の版({s.get('contentVersion')})")
        st = staff.get(s.get("participantCode", "").upper())
        if st and b(st.get("exclude")):
            reasons.append("担当者記録: " + (st.get("reason") or "除外"))
        # 自動除外はしないが確認が必要なもの（分析計画 5.）
        if float(s.get("priorPlays") or 0) >= 1 and not st:
            notes.append("priorPlays≥1（担当者記録と照合）")
        if float(s.get("resumeCount") or 0) >= 1:
            notes.append("再読み込みあり（該当試行のRTのみ除外）")
        ok = not reasons
        if ok:
            included.add(sid)
        decisions.append({
            "sessionId": sid,
            "participantCode": s.get("participantCode", ""),
            "included": ok,
            "reasons": "; ".join(reasons),
            "notes": "; ".join(notes),
        })

    out = os.path.join(a.outdir, "sample")
    os.makedirs(out, exist_ok=True)
    write(os.path.join(out, "inclusion.csv"), decisions, ["sessionId", "participantCode", "included", "reasons", "notes"])
    for name, rows in (("sessions.csv", sessions), ("trials.csv", trials), ("tests.csv", tests)):
        kept = [r for r in rows if r["sessionId"] in included]
        if rows:
            write(os.path.join(out, name), kept, list(rows[0].keys()))
        else:
            open(os.path.join(out, name), "w").close()

    print(f"セッション {len(sessions)} 件 → 採用 {len(included)} 件 / 除外 {len(sessions) - len(included)} 件")
    tally = defaultdict(int)
    for d in decisions:
        for r in filter(None, d["reasons"].split("; ")):
            tally[r.split(":")[0]] += 1
    for r, c in sorted(tally.items(), key=lambda x: -x[1]):
        print(f"  除外理由 {r}: {c} 件")
    print(f"出力: {out}")


if __name__ == "__main__":
    main()
