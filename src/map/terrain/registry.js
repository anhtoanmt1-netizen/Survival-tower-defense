// SINH TỰ ĐỘNG bởi tools/build_terrain_assets.py — Asset Registry. Sửa metadata trong bảng META của script (hoặc xuất từ tools/asset-inspector.html).
export const REGISTRY = [
 {
  "id": "grass_detail_tuft",
  "name": "Cỏ chi tiết: bụi cỏ",
  "group": "A_GRASS",
  "sub": "Grass_Detail",
  "kind": "tile",
  "layer": 4,
  "weight": 0.6,
  "size": [
   193,
   202
  ],
  "bbox": [
   15,
   237,
   372,
   611
  ],
  "usable": [
   4,
   5,
   190,
   198
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/grass_detail_tuft.png",
  "index": 0
 },
 {
  "id": "grass_detail_flowers",
  "name": "Cỏ có hoa trắng/cam",
  "group": "A_GRASS",
  "sub": "Grass_Detail",
  "kind": "tile",
  "layer": 4,
  "weight": 0.8,
  "size": [
   197,
   205
  ],
  "bbox": [
   391,
   234,
   755,
   613
  ],
  "usable": [
   2,
   3,
   193,
   201
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/grass_detail_flowers.png",
  "index": 1
 },
 {
  "id": "grass_base_a",
  "name": "Cỏ nền",
  "group": "A_GRASS",
  "sub": "Grass_Base",
  "kind": "tile",
  "layer": 4,
  "weight": 3.0,
  "size": [
   192,
   201
  ],
  "bbox": [
   773,
   239,
   1128,
   611
  ],
  "usable": [
   3,
   4,
   189,
   197
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/grass_base_a.png",
  "index": 2
 },
 {
  "id": "grass_detail_rock_flowers",
  "name": "Cỏ có đá nhỏ và hoa",
  "group": "A_GRASS",
  "sub": "Grass_Detail",
  "kind": "tile",
  "layer": 4,
  "weight": 0.6,
  "size": [
   191,
   204
  ],
  "bbox": [
   1147,
   234,
   1500,
   611
  ],
  "usable": [
   4,
   4,
   187,
   200
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/grass_detail_rock_flowers.png",
  "index": 3
 },
 {
  "id": "grass_variation_a",
  "name": "Cỏ biến thể mật độ",
  "group": "A_GRASS",
  "sub": "Grass_Variation",
  "kind": "tile",
  "layer": 4,
  "weight": 2.0,
  "size": [
   188,
   201
  ],
  "bbox": [
   1518,
   239,
   1865,
   611
  ],
  "usable": [
   4,
   4,
   184,
   197
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/grass_variation_a.png",
  "index": 4
 },
 {
  "id": "dirt_grass_blend_patch",
  "name": "Mảng đất xen cỏ",
  "group": "B_DIRT",
  "sub": "Dirt_Grass_Blend",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   193,
   202
  ],
  "bbox": [
   1886,
   239,
   2242,
   613
  ],
  "usable": [
   4,
   5,
   189,
   197
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/dirt_grass_blend_patch.png",
  "index": 5
 },
 {
  "id": "dirt_path_straight",
  "name": "Đường đất thẳng (Bắc-Nam)",
  "group": "B_DIRT",
  "sub": "Dirt_Path",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   193,
   198
  ],
  "bbox": [
   2267,
   244,
   2624,
   611
  ],
  "usable": [
   3,
   3,
   189,
   194
  ],
  "flipX": false,
  "flipY": true,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "dirt",
   "W": "dirt"
  },
  "src": "terrain/dirt_path_straight.png",
  "index": 6
 },
 {
  "id": "dirt_path_wide",
  "name": "Đường đất rộng / ngã ba",
  "group": "B_DIRT",
  "sub": "Dirt_Path_Intersection",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   192,
   198
  ],
  "bbox": [
   2648,
   243,
   3003,
   609
  ],
  "usable": [
   3,
   4,
   189,
   194
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "dirt",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/dirt_path_wide.png",
  "index": 7
 },
 {
  "id": "dirt_open_stones",
  "name": "Bãi đất có đá",
  "group": "B_DIRT",
  "sub": "Dirt_Open_Area",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   193,
   197
  ],
  "bbox": [
   3030,
   245,
   3387,
   609
  ],
  "usable": [
   2,
   3,
   188,
   193
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/dirt_open_stones.png",
  "index": 8
 },
 {
  "id": "sand_stones_plants",
  "name": "Cát/đất có đá, cỏ nhỏ",
  "group": "B_DIRT",
  "sub": "Dirt_With_Stones",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   191,
   188
  ],
  "bbox": [
   19,
   836,
   372,
   1184
  ],
  "usable": [
   3,
   4,
   188,
   185
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "sand",
   "S": "sand",
   "E": "sand",
   "W": "sand"
  },
  "src": "terrain/sand_stones_plants.png",
  "index": 9
 },
 {
  "id": "dirt_base",
  "name": "Cát/đất nền",
  "group": "B_DIRT",
  "sub": "Dirt_Base",
  "kind": "tile",
  "layer": 4,
  "weight": 3.0,
  "size": [
   195,
   189
  ],
  "bbox": [
   393,
   835,
   753,
   1184
  ],
  "usable": [
   3,
   4,
   191,
   186
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "sand",
   "S": "sand",
   "E": "sand",
   "W": "sand"
  },
  "src": "terrain/dirt_base.png",
  "index": 10
 },
 {
  "id": "sand_stone",
  "name": "Cát có đá",
  "group": "B_DIRT",
  "sub": "Dirt_With_Stones",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   190,
   189
  ],
  "bbox": [
   777,
   835,
   1128,
   1184
  ],
  "usable": [
   3,
   4,
   186,
   186
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "sand",
   "S": "sand",
   "E": "sand",
   "W": "sand"
  },
  "src": "terrain/sand_stone.png",
  "index": 11
 },
 {
  "id": "grass_to_sand_edge",
  "name": "Cỏ chuyển sang cát (cạnh)",
  "group": "A_GRASS",
  "sub": "Grass_To_Sand",
  "kind": "tile",
  "layer": 5,
  "weight": 1.0,
  "size": [
   188,
   189
  ],
  "bbox": [
   1150,
   835,
   1497,
   1184
  ],
  "usable": [
   3,
   4,
   185,
   186
  ],
  "flipX": true,
  "flipY": false,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "sand",
   "E": "grass|sand",
   "W": "grass|sand"
  },
  "src": "terrain/grass_to_sand_edge.png",
  "index": 12
 },
 {
  "id": "grass_to_sand_corner",
  "name": "Cỏ chuyển sang cát (góc)",
  "group": "A_GRASS",
  "sub": "Grass_To_Sand",
  "kind": "tile",
  "layer": 5,
  "weight": 1.0,
  "size": [
   186,
   191
  ],
  "bbox": [
   1518,
   834,
   1861,
   1187
  ],
  "usable": [
   3,
   4,
   183,
   186
  ],
  "flipX": false,
  "flipY": false,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "sand",
   "E": "grass",
   "W": "sand"
  },
  "src": "terrain/grass_to_sand_corner.png",
  "index": 13
 },
 {
  "id": "stone_pave",
  "name": "Đá lát",
  "group": "B_DIRT",
  "sub": "Stone_Pave",
  "kind": "tile",
  "layer": 4,
  "weight": 1.0,
  "size": [
   193,
   190
  ],
  "bbox": [
   1886,
   834,
   2242,
   1186
  ],
  "usable": [
   3,
   3,
   189,
   186
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "stone",
   "S": "stone",
   "E": "stone",
   "W": "stone"
  },
  "src": "terrain/stone_pave.png",
  "index": 14
 },
 {
  "id": "stone_pave_grass",
  "name": "Đá lát xen cỏ",
  "group": "B_DIRT",
  "sub": "Stone_Pave",
  "kind": "tile",
  "layer": 4,
  "weight": 0.6,
  "size": [
   192,
   188
  ],
  "bbox": [
   2267,
   840,
   2622,
   1188
  ],
  "usable": [
   3,
   3,
   189,
   183
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "stone",
   "S": "stone",
   "E": "stone",
   "W": "stone"
  },
  "src": "terrain/stone_pave_grass.png",
  "index": 15
 },
 {
  "id": "stone_pave_grass_edge",
  "name": "Đá lát có mép cỏ phía bắc",
  "group": "B_DIRT",
  "sub": "Stone_Pave",
  "kind": "tile",
  "layer": 5,
  "weight": 0.6,
  "size": [
   193,
   189
  ],
  "bbox": [
   2646,
   836,
   3003,
   1186
  ],
  "usable": [
   4,
   3,
   190,
   186
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "stone",
   "E": "stone",
   "W": "stone"
  },
  "src": "terrain/stone_pave_grass_edge.png",
  "index": 16
 },
 {
  "id": "rock_cluster_tile",
  "name": "Cụm đá lớn trên nền cỏ (ô)",
  "group": "D_ROCK_CLIFF",
  "sub": "Rock_Cluster",
  "kind": "tile",
  "layer": 6,
  "weight": 0.8,
  "size": [
   193,
   190
  ],
  "bbox": [
   3030,
   835,
   3387,
   1186
  ],
  "usable": [
   1,
   4,
   190,
   186
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "rock",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/rock_cluster_tile.png",
  "index": 17
 },
 {
  "id": "water_deep_a",
  "name": "Nước sâu",
  "group": "C_WATER",
  "sub": "Water_Deep",
  "kind": "tile",
  "layer": 1,
  "weight": 3.0,
  "size": [
   190,
   196
  ],
  "bbox": [
   0,
   1441,
   351,
   1803
  ],
  "usable": [
   0,
   4,
   185,
   190
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "deep",
   "S": "deep",
   "E": "deep",
   "W": "deep"
  },
  "src": "terrain/water_deep_a.png",
  "index": 18
 },
 {
  "id": "water_deep_b",
  "name": "Nước sâu (biến thể)",
  "group": "C_WATER",
  "sub": "Water_Deep",
  "kind": "tile",
  "layer": 1,
  "weight": 3.0,
  "size": [
   195,
   194
  ],
  "bbox": [
   369,
   1442,
   730,
   1800
  ],
  "usable": [
   3,
   4,
   190,
   189
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "deep",
   "S": "deep",
   "E": "deep",
   "W": "deep"
  },
  "src": "terrain/water_deep_b.png",
  "index": 19
 },
 {
  "id": "water_shallow_stones",
  "name": "Nước nông có đá",
  "group": "C_WATER",
  "sub": "Water_Shallow",
  "kind": "tile",
  "layer": 2,
  "weight": 1.0,
  "size": [
   192,
   190
  ],
  "bbox": [
   750,
   1444,
   1105,
   1796
  ],
  "usable": [
   4,
   4,
   188,
   187
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "shallow",
   "S": "shallow",
   "E": "shallow",
   "W": "shallow"
  },
  "src": "terrain/water_shallow_stones.png",
  "index": 20
 },
 {
  "id": "shore_sand_a",
  "name": "Bờ cát: cỏ-cát-nước nông",
  "group": "C_WATER",
  "sub": "Water_Shore_Sand",
  "kind": "tile",
  "layer": 5,
  "weight": 1.0,
  "size": [
   188,
   189
  ],
  "bbox": [
   1125,
   1446,
   1473,
   1796
  ],
  "usable": [
   3,
   4,
   185,
   186
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass|sand",
   "S": "shallow",
   "E": "shore",
   "W": "shore"
  },
  "src": "terrain/shore_sand_a.png",
  "index": 21
 },
 {
  "id": "shore_sand_b",
  "name": "Bờ cát có đá",
  "group": "C_WATER",
  "sub": "Water_Shore_Sand",
  "kind": "tile",
  "layer": 5,
  "weight": 1.0,
  "size": [
   187,
   189
  ],
  "bbox": [
   1493,
   1446,
   1839,
   1796
  ],
  "usable": [
   4,
   4,
   183,
   185
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass|sand",
   "S": "shallow",
   "E": "shore",
   "W": "shore"
  },
  "src": "terrain/shore_sand_b.png",
  "index": 22
 },
 {
  "id": "shore_sand_curve",
  "name": "Bờ cát cong",
  "group": "C_WATER",
  "sub": "Water_Shore_Sand",
  "kind": "tile",
  "layer": 5,
  "weight": 1.0,
  "size": [
   191,
   192
  ],
  "bbox": [
   1865,
   1441,
   2218,
   1796
  ],
  "usable": [
   3,
   4,
   187,
   188
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass|sand",
   "S": "shallow",
   "E": "sand",
   "W": "shore"
  },
  "src": "terrain/shore_sand_curve.png",
  "index": 23
 },
 {
  "id": "shore_grass_rocks",
  "name": "Bờ cỏ có đá",
  "group": "C_WATER",
  "sub": "Water_Shore_Grass",
  "kind": "tile",
  "layer": 5,
  "weight": 1.0,
  "size": [
   194,
   192
  ],
  "bbox": [
   2243,
   1441,
   2601,
   1796
  ],
  "usable": [
   3,
   4,
   191,
   188
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "water",
   "W": "grass"
  },
  "src": "terrain/shore_grass_rocks.png",
  "index": 24
 },
 {
  "id": "cliff_water_right_end_a",
  "name": "Vách ven nước: đầu phải",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Water_Edge",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   191,
   192
  ],
  "bbox": [
   2626,
   1441,
   2980,
   1796
  ],
  "usable": [
   3,
   3,
   188,
   188
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "water",
   "W": "cliff"
  },
  "src": "terrain/cliff_water_right_end_a.png",
  "index": 25
 },
 {
  "id": "cliff_water_right_end_b",
  "name": "Vách ven nước: đầu phải (đá lớn)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Water_Edge",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   193,
   190
  ],
  "bbox": [
   3005,
   1444,
   3361,
   1796
  ],
  "usable": [
   2,
   3,
   190,
   187
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "water",
   "W": "cliff"
  },
  "src": "terrain/cliff_water_right_end_b.png",
  "index": 26
 },
 {
  "id": "water_stones_a",
  "name": "Nước có đá",
  "group": "C_WATER",
  "sub": "Water_With_Stones",
  "kind": "tile",
  "layer": 2,
  "weight": 0.5,
  "size": [
   191,
   201
  ],
  "bbox": [
   42,
   2009,
   396,
   2380
  ],
  "usable": [
   3,
   4,
   186,
   197
  ],
  "flipX": true,
  "flipY": true,
  "rotate": false,
  "edges": {
   "N": "deep",
   "S": "deep",
   "E": "deep",
   "W": "deep"
  },
  "src": "terrain/water_stones_a.png",
  "index": 27
 },
 {
  "id": "water_stones_b",
  "name": "Nước có đá (2)",
  "group": "C_WATER",
  "sub": "Water_With_Stones",
  "kind": "tile",
  "layer": 2,
  "weight": 0.5,
  "size": [
   195,
   200
  ],
  "bbox": [
   414,
   2009,
   775,
   2379
  ],
  "usable": [
   4,
   4,
   190,
   196
  ],
  "flipX": true,
  "flipY": true,
  "rotate": false,
  "edges": {
   "N": "deep",
   "S": "deep",
   "E": "deep",
   "W": "deep"
  },
  "src": "terrain/water_stones_b.png",
  "index": 28
 },
 {
  "id": "water_cascade",
  "name": "Thác nhỏ giữa nước (ghềnh)",
  "group": "C_WATER",
  "sub": "Water_Falls",
  "kind": "tile",
  "layer": 2,
  "weight": 0.4,
  "size": [
   192,
   200
  ],
  "bbox": [
   795,
   2009,
   1150,
   2379
  ],
  "usable": [
   4,
   4,
   188,
   197
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "shallow",
   "S": "deep",
   "E": "deep",
   "W": "deep"
  },
  "src": "terrain/water_cascade.png",
  "index": 29
 },
 {
  "id": "water_surface_ripple",
  "name": "Mặt nước gợn sóng",
  "group": "C_WATER",
  "sub": "Water_Surface",
  "kind": "tile",
  "layer": 2,
  "weight": 1.0,
  "size": [
   189,
   200
  ],
  "bbox": [
   1170,
   2009,
   1520,
   2379
  ],
  "usable": [
   3,
   4,
   185,
   197
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "deep",
   "S": "deep",
   "E": "deep",
   "W": "deep"
  },
  "src": "terrain/water_surface_ripple.png",
  "index": 30
 },
 {
  "id": "cliff_water_left_end_a",
  "name": "Vách ven nước: đầu trái",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Water_Edge",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   188,
   206
  ],
  "bbox": [
   1538,
   2000,
   1886,
   2381
  ],
  "usable": [
   3,
   4,
   184,
   202
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "cliff",
   "W": "water"
  },
  "src": "terrain/cliff_water_left_end_a.png",
  "index": 31
 },
 {
  "id": "cliff_water_front_a",
  "name": "Vách ven nước: mặt trước",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Water_Edge",
  "kind": "tile",
  "layer": 6,
  "weight": 1.5,
  "size": [
   192,
   206
  ],
  "bbox": [
   1908,
   2000,
   2263,
   2381
  ],
  "usable": [
   3,
   4,
   188,
   202
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_water_front_a.png",
  "index": 32
 },
 {
  "id": "cliff_water_left_end_b",
  "name": "Vách ven nước: đầu trái (đá lẻ)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Water_Edge",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   194,
   203
  ],
  "bbox": [
   2289,
   2003,
   2648,
   2379
  ],
  "usable": [
   3,
   4,
   190,
   199
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "cliff",
   "W": "water"
  },
  "src": "terrain/cliff_water_left_end_b.png",
  "index": 33
 },
 {
  "id": "cliff_waterfall",
  "name": "Vách có thác nước",
  "group": "C_WATER",
  "sub": "Water_Falls",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   191,
   204
  ],
  "bbox": [
   2671,
   2002,
   3025,
   2379
  ],
  "usable": [
   3,
   4,
   188,
   200
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_waterfall.png",
  "index": 34
 },
 {
  "id": "cliff_water_front_b",
  "name": "Vách ven nước: mặt trước (đá giữa)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Water_Edge",
  "kind": "tile",
  "layer": 6,
  "weight": 1.5,
  "size": [
   207,
   204
  ],
  "bbox": [
   3050,
   2002,
   3433,
   2379
  ],
  "usable": [
   3,
   4,
   204,
   201
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "water",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_water_front_b.png",
  "index": 35
 },
 {
  "id": "cliff_island_arch",
  "name": "Khối vách đảo (vòm)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Island",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   187,
   191
  ],
  "bbox": [
   19,
   2630,
   365,
   2983
  ],
  "usable": [
   3,
   3,
   183,
   188
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "open",
   "W": "open"
  },
  "src": "terrain/cliff_island_arch.png",
  "index": 36
 },
 {
  "id": "cliff_top_front_a",
  "name": "Vách mặt trước A",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Top",
  "kind": "tile",
  "layer": 6,
  "weight": 1.5,
  "size": [
   190,
   196
  ],
  "bbox": [
   400,
   2628,
   751,
   2990
  ],
  "usable": [
   2,
   2,
   187,
   193
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_top_front_a.png",
  "index": 37
 },
 {
  "id": "cliff_top_front_b",
  "name": "Vách mặt trước B (đá lớn)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Top",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   192,
   196
  ],
  "bbox": [
   773,
   2628,
   1128,
   2990
  ],
  "usable": [
   4,
   3,
   189,
   193
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_top_front_b.png",
  "index": 38
 },
 {
  "id": "cliff_top_front_c",
  "name": "Vách mặt trước C (cây bụi)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Top",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   189,
   196
  ],
  "bbox": [
   1150,
   2628,
   1500,
   2990
  ],
  "usable": [
   4,
   3,
   184,
   192
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_top_front_c.png",
  "index": 39
 },
 {
  "id": "cliff_corner_right_a",
  "name": "Vách góc đầu phải A",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Top_Right",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   191,
   197
  ],
  "bbox": [
   1511,
   2628,
   1865,
   2992
  ],
  "usable": [
   3,
   2,
   188,
   193
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "open",
   "W": "cliff"
  },
  "src": "terrain/cliff_corner_right_a.png",
  "index": 40
 },
 {
  "id": "cliff_corner_right_b",
  "name": "Vách góc đầu phải B",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Top_Right",
  "kind": "tile",
  "layer": 6,
  "weight": 1.0,
  "size": [
   193,
   192
  ],
  "bbox": [
   1886,
   2628,
   2242,
   2983
  ],
  "usable": [
   3,
   4,
   190,
   190
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "open",
   "W": "cliff"
  },
  "src": "terrain/cliff_corner_right_b.png",
  "index": 41
 },
 {
  "id": "cliff_top_front_d",
  "name": "Vách mặt trước D (rộng)",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Top",
  "kind": "tile",
  "layer": 6,
  "weight": 1.2,
  "size": [
   208,
   198
  ],
  "bbox": [
   2283,
   2624,
   2667,
   2990
  ],
  "usable": [
   4,
   5,
   205,
   195
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "grass",
   "S": "ground",
   "E": "cliff",
   "W": "cliff"
  },
  "src": "terrain/cliff_top_front_d.png",
  "index": 42
 },
 {
  "id": "rock_mound_large",
  "name": "Gò đá lớn phủ cỏ",
  "group": "D_ROCK_CLIFF",
  "sub": "Rock_Large",
  "kind": "object",
  "layer": 8,
  "weight": 1.0,
  "size": [
   216,
   208
  ],
  "bbox": [
   2677,
   2624,
   3077,
   3008
  ],
  "usable": [
   3,
   3,
   214,
   205
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/rock_mound_large.png",
  "index": 43
 },
 {
  "id": "cliff_island_mound",
  "name": "Đảo đá nhỏ phủ cỏ",
  "group": "D_ROCK_CLIFF",
  "sub": "Cliff_Island",
  "kind": "object",
  "layer": 8,
  "weight": 1.0,
  "size": [
   189,
   201
  ],
  "bbox": [
   3086,
   2637,
   3436,
   3008
  ],
  "usable": [
   3,
   4,
   186,
   198
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/cliff_island_mound.png",
  "index": 44
 },
 {
  "id": "bush_cluster",
  "name": "Bụi cây",
  "group": "E_DECOR",
  "sub": "Grass_Bushes",
  "kind": "object",
  "layer": 8,
  "weight": 1.0,
  "size": [
   198,
   152
  ],
  "bbox": [
   43,
   3036,
   410,
   3317
  ],
  "usable": [
   5,
   5,
   194,
   148
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/bush_cluster.png",
  "index": 45
 },
 {
  "id": "dirt_blob",
  "name": "Mảng đất tròn có cỏ viền",
  "group": "E_DECOR",
  "sub": "Dirt_Open_Area",
  "kind": "tile",
  "layer": 7,
  "weight": 1.0,
  "size": [
   191,
   170
  ],
  "bbox": [
   479,
   3025,
   832,
   3339
  ],
  "usable": [
   3,
   3,
   187,
   167
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/dirt_blob.png",
  "index": 46
 },
 {
  "id": "sand_blob",
  "name": "Mảng cát tròn",
  "group": "E_DECOR",
  "sub": "Dirt_Open_Area",
  "kind": "tile",
  "layer": 7,
  "weight": 1.0,
  "size": [
   194,
   177
  ],
  "bbox": [
   869,
   3019,
   1227,
   3346
  ],
  "usable": [
   5,
   5,
   191,
   173
  ],
  "flipX": true,
  "flipY": true,
  "rotate": true,
  "edges": {
   "N": "grass",
   "S": "grass",
   "E": "grass",
   "W": "grass"
  },
  "src": "terrain/sand_blob.png",
  "index": 47
 },
 {
  "id": "rock_cluster_plants",
  "name": "Cụm đá và cây dại",
  "group": "D_ROCK_CLIFF",
  "sub": "Rock_Medium",
  "kind": "object",
  "layer": 8,
  "weight": 1.0,
  "size": [
   200,
   174
  ],
  "bbox": [
   1285,
   3025,
   1655,
   3346
  ],
  "usable": [
   3,
   4,
   196,
   170
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/rock_cluster_plants.png",
  "index": 48
 },
 {
  "id": "rock_large_tip",
  "name": "Đá lớn có đỉnh cỏ",
  "group": "D_ROCK_CLIFF",
  "sub": "Rock_Large",
  "kind": "object",
  "layer": 8,
  "weight": 1.0,
  "size": [
   263,
   200
  ],
  "bbox": [
   1700,
   2976,
   2186,
   3346
  ],
  "usable": [
   3,
   3,
   258,
   197
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/rock_large_tip.png",
  "index": 49
 },
 {
  "id": "rock_cluster_wide",
  "name": "Cụm đá lớn rộng",
  "group": "D_ROCK_CLIFF",
  "sub": "Rock_Cluster",
  "kind": "object",
  "layer": 8,
  "weight": 1.0,
  "size": [
   293,
   188
  ],
  "bbox": [
   2235,
   3008,
   2777,
   3355
  ],
  "usable": [
   4,
   3,
   290,
   185
  ],
  "flipX": true,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/rock_cluster_wide.png",
  "index": 50
 },
 {
  "id": "fill_grass",
  "name": "Texture nền liền mạch grass",
  "group": "A_GRASS",
  "sub": "Fill",
  "kind": "fill",
  "layer": 3,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_grass.png",
  "index": -1
 },
 {
  "id": "fill_flower",
  "name": "Texture nền liền mạch flower",
  "group": "A_GRASS",
  "sub": "Fill",
  "kind": "fill",
  "layer": 3,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_flower.png",
  "index": -1
 },
 {
  "id": "fill_dirt",
  "name": "Texture nền liền mạch dirt",
  "group": "B_DIRT",
  "sub": "Fill",
  "kind": "fill",
  "layer": 3,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_dirt.png",
  "index": -1
 },
 {
  "id": "fill_sand",
  "name": "Texture nền liền mạch sand",
  "group": "B_DIRT",
  "sub": "Fill",
  "kind": "fill",
  "layer": 3,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_sand.png",
  "index": -1
 },
 {
  "id": "fill_deep",
  "name": "Texture nền liền mạch deep",
  "group": "C_WATER",
  "sub": "Fill",
  "kind": "fill",
  "layer": 1,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_deep.png",
  "index": -1
 },
 {
  "id": "fill_shallow",
  "name": "Texture nền liền mạch shallow",
  "group": "C_WATER",
  "sub": "Fill",
  "kind": "fill",
  "layer": 3,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_shallow.png",
  "index": -1
 },
 {
  "id": "fill_pave",
  "name": "Texture nền liền mạch pave",
  "group": "B_DIRT",
  "sub": "Fill",
  "kind": "fill",
  "layer": 3,
  "weight": 1.0,
  "size": [
   128,
   128
  ],
  "bbox": [
   0,
   0,
   128,
   128
  ],
  "usable": [
   0,
   0,
   128,
   128
  ],
  "flipX": false,
  "flipY": false,
  "rotate": false,
  "edges": {
   "N": "any",
   "S": "any",
   "E": "any",
   "W": "any"
  },
  "src": "terrain/fill_pave.png",
  "index": -1
 }
];
