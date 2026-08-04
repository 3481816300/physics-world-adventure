# -*- coding: utf-8 -*-
import json
from pathlib import Path

surnames = [
    "罗", "叶", "汪", "史", "程", "云", "章", "丁", "杨", "常",
    "关", "艾", "维", "希", "林", "陈", "江", "刘", "韩", "周",
    "何", "马", "李", "严", "华", "赵", "孙", "吴", "郑", "王",
    "冯", "褚", "卫", "蒋", "沈", "许", "苏", "秦", "陆", "雷"
]

given = [
    "辑", "文洁", "淼", "强", "心", "天明", "北海", "仪", "冬",
    "一帆", "维德", "启", "朵朵", "培强", "磊", "倩", "宝库",
    "星辰", "华", "梦", "恒", "远", "航", "星", "澜"
]

names = sorted({s + g for s in surnames for g in given})
root = Path(__file__).resolve().parent.parent
(root / "data" / "name_pool.json").write_text(
    json.dumps(names, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

values = ", ".join("('" + n + "')" for n in names)
seed = (
    "delete from public.name_pool;\n"
    "insert into public.name_pool (nickname) values\n"
    + values +
    "\non conflict (nickname) do nothing;\n"
)
(root / "supabase" / "seed_names.sql").write_text(seed, encoding="utf-8")
print(len(names), "unique Chinese sci-fi names")
