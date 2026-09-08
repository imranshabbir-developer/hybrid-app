import re
import sqlite3
from pathlib import Path

import psycopg2

root = Path(__file__).resolve().parents[1]
sqlite_path = root / "data" / "erp.sqlite"
con = sqlite3.connect(sqlite_path)
print("SQLITE", sqlite_path)
for t in ["PurchaseOrder", "SupplierEntry", "SupplierMaster", "ImportShipment", "User"]:
    print(" ", t, con.execute(f"select count(*) from {t}").fetchone()[0])
print(
    "  DEMO POs",
    con.execute(
        "select poNumber from PurchaseOrder where poNumber like 'DEMO-%' order by poNumber"
    ).fetchall(),
)
con.close()

url = "postgresql://postgres:ipsdb@127.0.0.1:5432/erp_db"
env = root / ".env"
if env.exists():
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL_POSTGRES="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

m = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)", url)
user, pw, host, port, db = m.groups()
pg = psycopg2.connect(dbname=db, user=user, password=pw, host=host, port=port)
cur = pg.cursor()
print("POSTGRES", db)
for t in ["PurchaseOrder", "SupplierEntry", "SupplierMaster", "ImportShipment", "User"]:
    cur.execute(f'select count(*) from "{t}"')
    print(" ", t, cur.fetchone()[0])
cur.execute(
    'select "poNumber" from "PurchaseOrder" where "poNumber" like %s order by "poNumber"',
    ("DEMO-%",),
)
print("  DEMO POs", cur.fetchall())
pg.close()
