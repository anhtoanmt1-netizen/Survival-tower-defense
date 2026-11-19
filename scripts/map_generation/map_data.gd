class_name MapData
extends RefCounted
## Dữ liệu một bản đồ đã sinh. Không chứa logic sinh/hiển thị.

enum Terrain { GRASS, DIRT, TREE, ROCK, RIVER, BUSH }

var map_id := ""
var theme := "FOREST"
var algo_version := 1
var seed_value := 0
var width := 0
var height := 0
var cells := PackedByteArray()
## 8 cổng quái: TL, TM, TR, MR, BR, BM, BL, ML
var gates: Array[Vector2i] = []


func init_size(w: int, h: int) -> void:
	width = w
	height = h
	cells.resize(w * h)
	cells.fill(Terrain.GRASS)


func in_bounds(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < width and c.y < height


func get_t(x: int, y: int) -> int:
	return cells[y * width + x]


func set_t(x: int, y: int, t: int) -> void:
	cells[y * width + x] = t


static func is_blocking_terrain(t: int) -> bool:
	return t == Terrain.TREE or t == Terrain.ROCK or t == Terrain.RIVER


func is_walkable(c: Vector2i) -> bool:
	return in_bounds(c) and not is_blocking_terrain(get_t(c.x, c.y))


## Ô có thể xây tháp theo địa hình (chưa tính tháp/người chơi, sẽ làm ở Giai đoạn 3).
func is_buildable_terrain(c: Vector2i) -> bool:
	if not in_bounds(c):
		return false
	var t := get_t(c.x, c.y)
	return t == Terrain.GRASS or t == Terrain.DIRT
