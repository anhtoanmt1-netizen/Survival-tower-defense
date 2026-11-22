#!/usr/bin/env python3
"""Ghi metadata đã sửa trong Asset Inspector (registry.edited.json) vào src/map/terrain/registry.js.
Chạy: python3 tools/apply_registry_json.py registry.edited.json
(Lưu ý: lần chạy tools/build_terrain_assets.py kế tiếp sẽ sinh lại registry từ bảng META; muốn giữ lâu dài hãy sửa bảng META.)"""
import sys, json
data = json.load(open(sys.argv[1]))
open('src/map/terrain/registry.js', 'w').write('// Cập nhật từ Asset Inspector.\nexport const REGISTRY = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n'); print(len(data), 'asset đã ghi')
