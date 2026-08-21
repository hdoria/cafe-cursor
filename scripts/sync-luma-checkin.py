#!/usr/bin/env python3
"""Sincroniza o check-in do Luma com o evento ativo do Cafe Cursor.

Uso:
  ADMIN_USERNAME=... ADMIN_PASSWORD=... python3 scripts/sync-luma-checkin.py <export-do-luma.csv> [--apply] [--base https://cursoraracaju.space]

Sem --apply só mostra o que faria. Lê a coluna checked_in_at do CSV do Luma e
dispara CHECK_IN_USER pra cada inscrito do evento ativo que ainda não tem check-in.
"""
import csv, json, os, sys, urllib.request, http.cookiejar

args = [a for a in sys.argv[1:] if not a.startswith("--")]
apply = "--apply" in sys.argv
base = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--base"), "https://cursoraracaju.space")
if not args:
    print(__doc__); sys.exit(1)

cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def call(path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, headers={"Content-Type": "application/json"}, method="POST" if data else "GET")
    try:
        r = op.open(req, timeout=120); return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

s, r = call("/api/admin/auth", {"username": os.environ["ADMIN_USERNAME"], "password": os.environ["ADMIN_PASSWORD"]})
if s != 200:
    print("login falhou", s, r); sys.exit(2)

luma = list(csv.DictReader(open(args[0], encoding="utf-8-sig")))
checked = {row["email"].strip().lower() for row in luma if row.get("checked_in_at", "").strip()}
print(f"luma: {len(luma)} inscritos, {len(checked)} com check-in")

s, d = call("/api/admin/dashboard")
users = d.get("eligibleUsers", [])
active = next((e for e in d.get("events", []) if e.get("isActive")), {})
print(f"evento ativo: {active.get('name')} | {len(users)} elegíveis no painel")

todo = [u for u in users if u["email"].lower() in checked and not u.get("hasCheckedIn")]
missing = sorted(checked - {u["email"].lower() for u in users})
print(f"a marcar: {len(todo)} | já marcados: {sum(1 for u in users if u.get('hasCheckedIn'))} | com check-in no luma mas fora do painel: {len(missing)}")
for e in missing: print("  fora do painel:", e)

if not apply:
    for u in todo: print("  faria check-in:", u["email"])
    print("\nrode de novo com --apply pra aplicar"); sys.exit(0)

ok = 0
for u in todo:
    s, r = call("/api/admin/actions", {"action": "CHECK_IN_USER", "data": {"userId": u["id"]}})
    if s == 200: ok += 1
    else: print("  erro", u["email"], s, r.get("error"))
print(f"check-in aplicado em {ok}/{len(todo)}")
