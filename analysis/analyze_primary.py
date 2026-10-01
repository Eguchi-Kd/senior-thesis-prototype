# -*- coding: utf-8 -*-
"""
主要評価と副次評価を、分析計画（docs/分析計画.md）で固定した方法どおりに計算する。
入力は select_sample.py が出力した採用セッションのフォルダ（<export>/sample）。

使い方:
    python analyze_primary.py <export_フォルダ>/sample

主要評価：事前→事後のテスト正答数の差（各6問）
  - 検定：Wilcoxon 符号順位検定（両側）scipy.stats.wilcoxon(zero_method="pratt", method="approx", correction=False)
  - 効果量：対応のある順位双列相関 r_rb（差0を除く。正＝事後が高い）。参考に r = |Z|/√N に r_rb と同じ符号を付けたもの（N=差0を含む参加者数）
  - 推定：差の平均と、参加者ペアのブートストラップ（10,000回, seed=20261103, パーセンタイル95%区間）
  - 全員の差が0なら検定せず「変化なし」
副次（探索的）：見逃し率・誤警報率（各3問）、d′と判断基準c（log-linear 補正）、確信度（正答/誤答別・確信度4以上の誤答）、
  フォーム順（A→B/B→A）別、項目の正答率と項目－残余相関、SUS・自己効力感の要約、priorPlays=0 のみの感度分析
  ※本編の確認行動など、分析計画の他の副次指標はこのスクリプトでは出力しない（別途集計）
"""
import csv
import math
import os
import sys
from collections import defaultdict

import numpy as np
from scipy import stats

SEED = 20261103
N_BOOT = 10_000
N_ITEMS = 6


def read(path):
    if not os.path.isfile(path) or os.path.getsize(path) == 0:
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def b(v):
    return str(v).strip().lower() == "true"


def rank_biserial(diff):
    """対応のある順位双列相関（Kerby の単純差の式）。差0は除く"""
    d = diff[diff != 0]
    if len(d) == 0:
        return float("nan")
    ranks = stats.rankdata(np.abs(d))
    return (ranks[d > 0].sum() - ranks[d < 0].sum()) / ranks.sum()


def sdt(hits, n_signal, fas, n_noise):
    """Hautus (1995) log-linear 補正つきの d′ と判断基準 c（c>0 は「正常」寄り、c<0 は「詐欺」寄り）"""
    zh = stats.norm.ppf((hits + 0.5) / (n_signal + 1))
    zf = stats.norm.ppf((fas + 0.5) / (n_noise + 1))
    return zh - zf, -(zh + zf) / 2


def primary(pre, post, p):
    """主要評価（事前→事後の正答数差）を計算して出力する"""
    diff = post - pre
    n = len(diff)
    p(f"参加者 N = {n}")
    if n == 0:
        p("主要評価：対象者なし")
        return
    p(f"事前 正答数: 平均 {pre.mean():.2f}（中央値 {np.median(pre):.1f}） / 事後: 平均 {post.mean():.2f}（中央値 {np.median(post):.1f}）")
    p(f"差（事後−事前）: 平均 {diff.mean():.2f}、中央値 {np.median(diff):.1f}、上昇 {int((diff > 0).sum())} / 同じ {int((diff == 0).sum())} / 低下 {int((diff < 0).sum())}")
    if np.all(diff == 0):
        p("主要評価：全員の差が0のため検定せず（変化なし）")
        return
    res = stats.wilcoxon(post, pre, zero_method="pratt", method="approx", correction=False)
    z = getattr(res, "zstatistic", None)
    if z is None or (isinstance(z, float) and math.isnan(z)):
        z = stats.norm.isf(res.pvalue / 2)
    rrb = rank_biserial(diff)
    r_ref = math.copysign(abs(z) / math.sqrt(n), rrb if not math.isnan(rrb) else diff.mean())
    rng = np.random.default_rng(SEED)
    idx = rng.integers(0, n, size=(N_BOOT, n))
    lo, hi = np.percentile(diff[idx].mean(axis=1), [2.5, 97.5])
    p(f"Wilcoxon 符号順位検定（Pratt, 正規近似, 連続性補正なし）: W = {res.statistic:.1f}, |Z| = {abs(z):.3f}, p = {res.pvalue:.4f}")
    p(f"効果量：順位双列相関 r_rb = {rrb:.3f}（差0を除く。正＝事後が高い）／ 参考 r = {r_ref:.3f}（|Z|/√N に r_rb の符号, N={n}）")
    p(f"差の平均 {diff.mean():.2f}、ブートストラップ95%区間 [{lo:.2f}, {hi:.2f}]（{N_BOOT}回, seed={SEED}）")


def main(folder):
    tests = read(os.path.join(folder, "tests.csv"))
    sessions = {s["sessionId"]: s for s in read(os.path.join(folder, "sessions.csv"))}
    if not tests:
        sys.exit("tests.csv に採用データがありません（select_sample.py の出力フォルダを指定）")

    by = defaultdict(lambda: {"pre": [], "post": []})
    for t in tests:
        by[t["sessionId"]][t["phase"]].append(t)
    complete = {sid: v for sid, v in by.items() if len(v["pre"]) == N_ITEMS and len(v["post"]) == N_ITEMS}
    missing = len(by) - len(complete)

    # 異なる版を合算しない（分析計画 6.）
    versions = sorted({sessions.get(sid, {}).get("contentVersion", "") for sid in complete})
    if len(versions) > 1:
        sys.exit(f"[ERROR] 採用データに複数の版が含まれています {versions}。select_sample.py で --content-version を指定してください")

    sids = sorted(complete)
    pre = np.array([sum(b(t["correct"]) for t in complete[s]["pre"]) for s in sids], dtype=float)
    post = np.array([sum(b(t["correct"]) for t in complete[s]["post"]) for s in sids], dtype=float)

    lines = []
    p = lines.append
    p(f"対象版: {versions[0] if versions else '-'}（事前・事後がそろわず主解析から除外: {missing} 名）")
    primary(pre, post, p)

    # 副次：見逃し・誤警報・d′
    p("")
    p("── 副次（探索的）──")
    for phase in ("pre", "post"):
        miss, fa, dps, cs = [], [], [], []
        for s in sids:
            arr = complete[s][phase]
            fraud = [t for t in arr if b(t["isFraud"])]
            safe = [t for t in arr if not b(t["isFraud"])]
            hits = sum(t["answer"] == "fraud" for t in fraud)
            fas = sum(t["answer"] == "fraud" for t in safe)
            miss.append((len(fraud) - hits) / len(fraud) if fraud else float("nan"))
            fa.append(fas / len(safe) if safe else float("nan"))
            d, c = sdt(hits, len(fraud), fas, len(safe))
            dps.append(d)
            cs.append(c)
        label = "事前" if phase == "pre" else "事後"
        p(f"{label}: 見逃し率 {np.nanmean(miss):.2f} / 誤警報率 {np.nanmean(fa):.2f} / d′ 平均 {np.mean(dps):.2f} / c 平均 {np.mean(cs):.2f}")

    # 確信度（1〜5の順序尺度。確率には変換しない）
    def med(xs):
        return f"{np.median(xs):.1f}" if xs else "-"

    for phase in ("pre", "post"):
        conf_ok = [float(t["confidence"]) for s in sids for t in complete[s][phase] if b(t["correct"])]
        conf_ng = [float(t["confidence"]) for s in sids for t in complete[s][phase] if not b(t["correct"])]
        high_err = sum(1 for x in conf_ng if x >= 4)
        label = "事前" if phase == "pre" else "事後"
        p(f"{label} 確信度の中央値: 正答 {med(conf_ok)}（{len(conf_ok)}回答） / 誤答 {med(conf_ng)}（{len(conf_ng)}回答）、確信度4以上の誤答 {high_err} 件")

    # フォーム順
    p("")
    p("── フォームの割付順 ──")
    groups = defaultdict(list)
    for i, s in enumerate(sids):
        ss = sessions.get(s, {})
        groups[f"{ss.get('preForm', '?')}→{ss.get('postForm', '?')}"].append(i)
    for g, ix in sorted(groups.items()):
        p(f"{g}: {len(ix)} 名、事前 {pre[ix].mean():.2f} → 事後 {post[ix].mean():.2f}（差 {(post[ix] - pre[ix]).mean():.2f}）")

    # 項目分析（段階ごと。項目－残余相関＝その項目を除いた合計との相関）
    p("")
    p("── 項目分析（正答率・項目－残余相関）──")
    for phase in ("pre", "post"):
        mat = defaultdict(dict)
        for s in sids:
            for t in complete[s][phase]:
                mat[t["questionId"]][s] = 1.0 if b(t["correct"]) else 0.0
        total = {s: sum(mat[q].get(s, 0) for q in mat) for s in sids}
        for q in sorted(mat):
            xs = np.array([mat[q][s] for s in sids if s in mat[q]])
            rest = np.array([total[s] - mat[q][s] for s in sids if s in mat[q]])
            r = np.corrcoef(xs, rest)[0, 1] if len(xs) > 2 and xs.std() > 0 and rest.std() > 0 else float("nan")
            p(f"{'事前' if phase == 'pre' else '事後'} {q}: n={len(xs)} 正答率 {xs.mean():.2f} 項目－残余相関 {r:.2f}")

    # 使用体験・主観（単一項目は検証済み尺度として扱わない）
    p("")
    p("── 使用体験・主観 ──")

    def col(name):
        xs = []
        for sid in sids:
            try:
                x = float(sessions.get(sid, {}).get(name, ""))
            except ValueError:
                continue
            if math.isfinite(x):
                xs.append(x)
        return np.array(xs)

    sus = col("susScore")
    if len(sus):
        p(f"SUS: 平均 {sus.mean():.1f}、中央値 {np.median(sus):.1f}（n={len(sus)}、操作性の指標で学習効果ではない）")
    se_pre, se_post = col("selfEfficacyPre"), col("selfEfficacyPost")
    if len(se_pre) and len(se_post):
        p(f"自己効力感（単一項目）: 事前 中央値 {np.median(se_pre):.1f} → 事後 {np.median(se_post):.1f}")

    # 感度分析：この端末で初めてのプレイ（priorPlays=0）のみ
    p("")
    p("── 感度分析：priorPlays=0 のみ ──")
    keep = [i for i, sid in enumerate(sids) if str(sessions.get(sid, {}).get("priorPlays", "0")) in ("0", "0.0")]
    primary(pre[keep], post[keep], p)

    report = "\n".join(lines)
    print(report)
    with open(os.path.join(folder, "primary_report.txt"), "w", encoding="utf-8") as f:
        f.write(report + "\n")
    print(f"\n保存: {os.path.join(folder, 'primary_report.txt')}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("使い方: python analyze_primary.py <export_フォルダ>/sample")
    main(sys.argv[1])
