
import xml.etree.ElementTree as ET

xml_data = """<?xml version="1.0" encoding="EUC-KR" ?>
<protocol>
    <chartdata symbol="005930" name="Samsung" count="30" timeframe="day" precision="0" origintime="19900103">
        <item data="20250101|100|110|90|105|1000" />
        <item data="20250102|105|115|95|110|2000" />
    </chartdata>
</protocol>
"""

root = ET.fromstring(xml_data)
print(f"Root tag: {root.tag}")

items_direct = root.findall("item")
print(f"Direct items found: {len(items_direct)}")

items_nested = root.findall("chartdata/item")
print(f"Nested items found: {len(items_nested)}")

items_recursive = root.findall(".//item")
print(f"Recursive items found: {len(items_recursive)}")
