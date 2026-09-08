import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    user="postgres",
    password="ipsdb",
    dbname="postgres",
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", ("erp_db",))
if not cur.fetchone():
    cur.execute("CREATE DATABASE erp_db")
    print("CREATED erp_db")
else:
    print("erp_db EXISTS")
cur.close()
conn.close()
