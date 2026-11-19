class_name MapView
extends Node2D
## Vẽ bản đồ (placeholder bằng hình khối) chỉ cho vùng đang nhìn thấy.
## 3 lớp để sắp xếp chiều sâu so với người chơi: GROUND, BACK (vật ở hàng <= người chơi,
## vẽ trước người chơi), FRONT (hàng > người chơi, vẽ sau người chơi).

enum Layer { GROUND, BACK, FRONT }

const T := GameConfig.TILE_SIZE

@export var layer: Layer = Layer.GROUND
var map: MapData
var player: Node2D


func _process(_d: float) -> void:
	queue_redraw()


func _draw() -> void:
	if map == null:
		return
	var vr: Rect2 = get_canvas_transform().affine_inverse() * get_viewport_rect()
	var x0 := maxi(int(floor(vr.position.x / T)) - 1, 0)
	var x1 := mini(int(ceil(vr.end.x / T)) + 1, map.width - 1)
	var y0 := maxi(int(floor(vr.position.y / T)) - 1, 0)
	var y1 := mini(int(ceil(vr.end.y / T)) + 2, map.height - 1)
	var prow := int(floor(player.position.y / T)) if player != null else -1
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			var t := map.get_t(x, y)
			if layer == Layer.GROUND:
				_ground(x, y, t)
			else:
				if (layer == Layer.BACK) != (y <= prow):
					continue
				_object(x, y, t)


func _ground(x: int, y: int, t: int) -> void:
	var v := MapGenerator.hash01(x, y, 99) * 0.06
	var r := Rect2(x * T, y * T, T, T)
	var col := Color(0.30 + v, 0.55 + v, 0.26 + v)
	match t:
		MapData.Terrain.DIRT:
			col = Color(0.55 + v, 0.42 + v, 0.27 + v)
		MapData.Terrain.RIVER:
			col = Color(0.2, 0.42 + v, 0.75 + v)
	draw_rect(r, col)
	if t == MapData.Terrain.RIVER and MapGenerator.hash01(x, y, 5) > 0.7:
		draw_line(r.position + Vector2(6, 16), r.position + Vector2(18, 16), Color(1, 1, 1, 0.25), 2.0)


func _object(x: int, y: int, t: int) -> void:
	var o := Vector2(x * T, y * T)
	match t:
		MapData.Terrain.TREE:
			draw_rect(Rect2(o.x + 13, o.y + 14, 6, 17), Color(0.4, 0.27, 0.15))
			draw_circle(o + Vector2(16, 8), 17.0, Color(0.12, 0.38, 0.17))
			draw_circle(o + Vector2(12, 5), 9.0, Color(0.18, 0.48, 0.22))
		MapData.Terrain.ROCK:
			draw_colored_polygon(PackedVector2Array([o + Vector2(3, 29), o + Vector2(6, 11), o + Vector2(16, 5),
				o + Vector2(27, 12), o + Vector2(29, 29)]), Color(0.5, 0.5, 0.55))
			draw_colored_polygon(PackedVector2Array([o + Vector2(6, 11), o + Vector2(16, 5), o + Vector2(27, 12),
				o + Vector2(16, 16)]), Color(0.68, 0.68, 0.72))
		MapData.Terrain.BUSH:
			draw_circle(o + Vector2(16, 21), 9.0, Color(0.2, 0.5, 0.2))
			draw_circle(o + Vector2(20, 19), 5.0, Color(0.28, 0.6, 0.25))
