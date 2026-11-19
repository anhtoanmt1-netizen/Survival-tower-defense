class_name FlowField
extends RefCounted
## Bản đồ khoảng cách (BFS) tới một mục tiêu. Mọi slime dùng chung một bản,
## mỗi slime chỉ tra ô lân cận có khoảng cách nhỏ nhất -> không chạy A* riêng cho từng con.
## Dùng đúng quy tắc địa hình MapData.is_blocking_terrain như người chơi.

const UNREACHED := 1000000
var width := 0
var height := 0
var dist := PackedInt32Array()
var _walk := PackedByteArray()
var _queue := PackedInt32Array()


func _init(m: MapData) -> void:
	width = m.width
	height = m.height
	_walk.resize(width * height)
	for i in width * height:
		_walk[i] = 0 if MapData.is_blocking_terrain(m.cells[i]) else 1
	dist.resize(width * height)
	dist.fill(UNREACHED)
	_queue.resize(width * height)


func in_bounds(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < width and c.y < height


func walk_at(c: Vector2i) -> bool:
	return in_bounds(c) and _walk[c.y * width + c.x] == 1


func dist_at(c: Vector2i) -> int:
	if not in_bounds(c):
		return UNREACHED
	return dist[c.y * width + c.x]


func rebuild(target: Vector2i) -> void:
	dist.fill(UNREACHED)
	if not walk_at(target):
		return
	var head := 0
	var tail := 0
	var s := target.y * width + target.x
	dist[s] = 0
	_queue[tail] = s
	tail += 1
	while head < tail:
		var cur := _queue[head]
		head += 1
		var d := dist[cur] + 1
		var cx := cur % width
		if cx > 0 and _walk[cur - 1] == 1 and dist[cur - 1] == UNREACHED:
			dist[cur - 1] = d
			_queue[tail] = cur - 1
			tail += 1
		if cx < width - 1 and _walk[cur + 1] == 1 and dist[cur + 1] == UNREACHED:
			dist[cur + 1] = d
			_queue[tail] = cur + 1
			tail += 1
		if cur >= width and _walk[cur - width] == 1 and dist[cur - width] == UNREACHED:
			dist[cur - width] = d
			_queue[tail] = cur - width
			tail += 1
		if cur < width * (height - 1) and _walk[cur + width] == 1 and dist[cur + width] == UNREACHED:
			dist[cur + width] = d
			_queue[tail] = cur + width
			tail += 1


## Ô kế tiếp (trong 8 hướng, không cắt góc vật cản) gần mục tiêu nhất. Trả về chính c nếu không có đường tốt hơn.
func next_step(c: Vector2i) -> Vector2i:
	var best: Vector2i = c
	var best_d: int = dist_at(c)
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			var n := Vector2i(c.x + dx, c.y + dy)
			if not walk_at(n):
				continue
			if dx != 0 and dy != 0:
				if not walk_at(Vector2i(c.x + dx, c.y)) or not walk_at(Vector2i(c.x, c.y + dy)):
					continue  # không cắt góc vật cản
			var nd: int = dist_at(n)
			if nd < best_d:
				best_d = nd
				best = n
	return best
