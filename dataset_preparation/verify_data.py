import sqlite3

# Connect to the database
db_name = "equipment_management.db"
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

# Check equipment distribution by site
cursor.execute("""
    SELECT 
        rt.site_id,
        COUNT(*) as equipment_count,
        GROUP_CONCAT(em.equipment_id || ' (' || em.type || ')') as equipment_list
    FROM RentalTransactions rt
    JOIN EquipmentMaster em ON rt.equipment_id = em.equipment_id
    GROUP BY rt.site_id
    ORDER BY rt.site_id
""")

results = cursor.fetchall()

print("Equipment Distribution by Site:")
print("=" * 50)
total_equipment = 0
for site_id, count, equipment_list in results:
    print(f"\n{site_id}: {count} equipment")
    print(f"Equipment: {equipment_list}")
    total_equipment += count

print(f"\n" + "=" * 50)
print(f"Total Equipment: {total_equipment}")
print(f"Total Sites: {len(results)}")
print(f"Average per site: {total_equipment / len(results):.1f}")

# Check equipment types distribution
cursor.execute("""
    SELECT 
        type,
        COUNT(*) as count
    FROM EquipmentMaster
    GROUP BY type
    ORDER BY count DESC
""")

type_results = cursor.fetchall()

print(f"\nEquipment Types Distribution:")
print("-" * 30)
for eq_type, count in type_results:
    print(f"{eq_type}: {count}")

conn.close()
