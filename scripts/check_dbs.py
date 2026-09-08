import sqlite3
import psycopg2

sqlite_path = r"C:\Users\imran.shabbir\Desktop\erp\data\erp.sqlite"
con = sqlite3.connect(sqlite_path)
print("SQLITE tables:", con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1").fetchall())
print("SQLITE PO count:", con.execute("SELECT count(*) FROM PurchaseOrder").fetchone()[0])
print("SQLITE Entry count:", con.execute("SELECT count(*) FROM SupplierEntry").fetchone()[0])
print("SQLITE Master count:", con.execute("SELECT count(*) FROM SupplierMaster").fetchone()[0])
con.close()

pg = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    user="postgres",
    password="ipsdb",
    dbname="erp_db",
)
cur = pg.cursor()
cur.execute(
    """
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY 1
    """
)
print("POSTGRES tables:", [r[0] for r in cur.fetchall()])
cur.close()
pg.close()
