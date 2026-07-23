import sqlite3
import json

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT cache_type, cache_key, result_json FROM ai_general_cache WHERE cache_type='supply_chain'")
    rows = cursor.fetchall()
    updated_count = 0
    for row in rows:
        t, k, data_str = row
        try:
            data = json.loads(data_str)
            changed = False
            if "nodes" in data:
                for node in data["nodes"]:
                    if "group" in node:
                        g = node["group"].lower()
                        old_g = node["group"]
                        if g.startswith("supplier"): node["group"] = "supplier"
                        elif g.startswith("customer") or g.startswith("client"): node["group"] = "customer"
                        elif g.startswith("competitor") or g.startswith("rival"): node["group"] = "competitor"
                        
                        if node["group"] != old_g:
                            changed = True
            
            if changed:
                new_data_str = json.dumps(data, ensure_ascii=False)
                cursor.execute("UPDATE ai_general_cache SET result_json=? WHERE cache_type=? AND cache_key=?", (new_data_str, t, k))
                updated_count += 1
        except Exception as ex:
            print(f"Error parsing JSON for {k}: {ex}")
            
    print(f"Updated {updated_count} supply chain caches!")
except Exception as e:
    print(e)

conn.commit()
conn.close()
