class_name MapGenerator
extends RefCounted
## Sinh bản đồ theo seed. Hoàn toàn tất định: không dùng RNG/noise của engine
## (chúng có thể đổi giữa các bản Godot), chỉ dùng hash + LCG tự viết bên dưới.
## Nếu đổi thuật toán: tăng ALGO_VERSION và GIỮ lại code của phiên bản cũ.

const ALGO_VERSION := 1
const MAX_BLOCKED_RATIO := 0.32
const GATE_MARGIN := 4
const GATE_CLEAR_RADIUS := 3
const CENTER_CLEAR_RADIUS := 5

## Mỗi chủ đề là một bảng tham số; thêm chủ đề mới = thêm một mục (và asset tương ứng).
const THEMES := {
	"FOREST": {"tree_threshold": 0.56, "rock_threshold": 0.77, "dirt_threshold": 0.64, "river": true},
}


class Rng:
	var state: int
	func _init(s: int) -> void:
		state = (s * 2654435761 + 1013904223) & 0xFFFFFFFF
	func next_u32() -> int:
		state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
		return state
	func f() -> float:
		return float(next_u32() >> 8) / 16777216.0
	func i(a: int, b: int) -> int:
		return a + int(f() * float(b - a + 1))
	func fr(a: float, b: float) -> float:
		return a + f() * (b - a)


static func hash01(x: int, y: int, s: int) -> float:
	var h := (x * 374761393 + y * 668265263 + s * 1274126177) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	h = h ^ (h >> 16)
	return float(h & 0xFFFF) / 65535.0


static func _vnoise(x: float, y: float, s: int) -> float:
	var x0 := int(floor(x))
	var y0 := int(floor(y))
	var fx := x - x0
	var fy := y - y0
	fx = fx * fx * (3.0 - 2.0 * fx)
	fy = fy * fy * (3.0 - 2.0 * fy)
	var a := hash01(x0, y0, s)
	var b := hash01(x0 + 1, y0, s)
	var c := hash01(x0, y0 + 1, s)
	var d := hash01(x0 + 1, y0 + 1, s)
	return float(lerp(lerp(a, b, fx), lerp(c, d, fx), fy))


static func _fbm(x: float, y: float, s: int) -> float:
	return _vnoise(x * 0.07, y * 0.07, s) * 0.65 + _vnoise(x * 0.17, y * 0.17, s + 101) * 0.35


static func gate_positions(w: int, h: int) -> Array[Vector2i]:
	var m := GATE_MARGIN
	var cx := int(w * 0.5)
	var cy := int(h * 0.5)
	var g: Array[Vector2i] = [
		Vector2i(m, m), Vector2i(cx, m), Vector2i(w - 1 - m, m), Vector2i(w - 1 - m, cy),
		Vector2i(w - 1 - m, h - 1 - m), Vector2i(cx, h - 1 - m), Vector2i(m, h - 1 - m), Vector2i(m, cy),
	]
	return g


## Trả về null nếu ID sai, theme chưa hỗ trợ hoặc phiên bản thuật toán không còn được hỗ trợ.
static func generate(map_id: String) -> MapData:
	var p := MapId.parse(map_id)
	if not p.ok or p.version != ALGO_VERSION or not THEMES.has(p.theme):
		return null
	var w: int = p.size
	var h: int = p.size
	var s: int = p.seed
	var params: Dictionary = THEMES[p.theme]
	var rng := Rng.new(s)

	var m := MapData.new()
	m.init_size(w, h)
	m.map_id = MapId.make(p.theme, w, s)
	m.theme = p.theme
	m.algo_version = ALGO_VERSION
	m.seed_value = s
	m.gates = gate_positions(w, h)

	_place_trees(m, s, params, rng)
	_scatter(m, s + 13, params.dirt_threshold, 0.0, MapData.Terrain.DIRT, rng)
	_scatter(m, s + 7, params.rock_threshold, 0.004, MapData.Terrain.ROCK, rng)
	if params.river:
		_carve_river(m, s, rng)
	_clear_zones(m)
	_thin_trees(m, rng)
	_ensure_connected(m)
	_place_bushes(m, s, rng)
	return m


static func _place_trees(m: MapData, s: int, params: Dictionary, rng: Rng) -> void:
	var w := m.width
	var h := m.height
	var tree := PackedByteArray()
	tree.resize(w * h)
	for y in h:
		for x in w:
			tree[y * w + x] = 1 if (_fbm(x, y, s) > params.tree_threshold or rng.f() < 0.04) else 0
	# Cellular automata: làm mịn thành cụm cây.
	for _pass in 3:
		var nxt := tree.duplicate()
		for y in h:
			for x in w:
				var n := 0
				for dy in range(-1, 2):
					for dx in range(-1, 2):
						if dx == 0 and dy == 0:
							continue
						var nx := x + dx
						var ny := y + dy
						if nx >= 0 and ny >= 0 and nx < w and ny < h:
							n += tree[ny * w + nx]
				var i := y * w + x
				if tree[i] == 1:
					nxt[i] = 1 if n >= 3 else 0
				else:
					nxt[i] = 1 if n >= 5 else 0
		tree = nxt
	for i in w * h:
		if tree[i] == 1:
			m.cells[i] = MapData.Terrain.TREE


static func _scatter(m: MapData, salt: int, threshold: float, extra: float, terrain: int, rng: Rng) -> void:
	for y in m.height:
		for x in m.width:
			var r := rng.f()  # luôn gọi để thứ tự RNG ổn định
			if m.get_t(x, y) != MapData.Terrain.GRASS:
				continue
			if _fbm(x, y, salt) > threshold or r < extra:
				m.set_t(x, y, terrain)


static func _carve_river(m: MapData, s: int, rng: Rng) -> void:
	var horizontal := rng.f() < 0.5
	var length := m.width if horizontal else m.height
	var span := m.height if horizontal else m.width
	var pos := rng.fr(0.3, 0.7) * span
	var phase := rng.fr(0.0, TAU)
	var amp := rng.fr(4.0, 9.0)
	var freq := rng.fr(0.04, 0.08)
	var drift := 0.0
	var ford_left := 0
	var next_ford := rng.i(18, 30)
	var prev_c := -1
	for t in length:
		drift = clampf(drift + rng.fr(-0.6, 0.6), -1.0, 1.0)
		pos = clampf(pos + drift * 0.6, 10.0, span - 11.0)
		var c := int(round(pos + sin(phase + t * freq) * amp))
		c = clampi(c, 3, span - 4)
		if prev_c < 0:
			prev_c = c
		next_ford -= 1
		if next_ford <= 0:
			ford_left = 5
			next_ford = rng.i(18, 30)
		var is_ford := ford_left > 0
		if is_ford:
			ford_left -= 1
		var hw := 1 + (1 if _vnoise(t * 0.2, 0.0, s + 31) > 0.5 else 0)
		for cc in range(mini(prev_c, c), maxi(prev_c, c) + 1):  # giữ dòng sông liền 4 hướng
			for k in range(-hw, hw + 1):
				var along := t
				var across := cc + k
				var x := along if horizontal else across
				var y := across if horizontal else along
				if x >= 0 and y >= 0 and x < m.width and y < m.height:
					m.set_t(x, y, MapData.Terrain.DIRT if is_ford else MapData.Terrain.RIVER)
		prev_c = c


static func _clear_disc(m: MapData, c: Vector2i, r: int) -> void:
	for dy in range(-r, r + 1):
		for dx in range(-r, r + 1):
			if dx * dx + dy * dy <= r * r:
				var cell := c + Vector2i(dx, dy)
				if m.in_bounds(cell):
					m.set_t(cell.x, cell.y, MapData.Terrain.GRASS)


static func _clear_zones(m: MapData) -> void:
	for g in m.gates:
		_clear_disc(m, g, GATE_CLEAR_RADIUS)
	_clear_disc(m, center(m), CENTER_CLEAR_RADIUS)


static func center(m: MapData) -> Vector2i:
	return Vector2i(int(m.width * 0.5), int(m.height * 0.5))


static func _thin_trees(m: MapData, rng: Rng) -> void:
	var limit := int(m.width * m.height * MAX_BLOCKED_RATIO)
	var blocked := 0
	var trees: Array[int] = []
	for i in m.cells.size():
		if MapData.is_blocking_terrain(m.cells[i]):
			blocked += 1
		if m.cells[i] == MapData.Terrain.TREE:
			trees.append(i)
	if blocked <= limit:
		return
	for i in range(trees.size() - 1, 0, -1):  # Fisher-Yates tất định
		var j := rng.i(0, i)
		var tmp := trees[i]
		trees[i] = trees[j]
		trees[j] = tmp
	for idx in trees:
		if blocked <= limit:
			break
		m.cells[idx] = MapData.Terrain.GRASS
		blocked -= 1


## BFS 4 hướng từ start trên các ô đi được. Trả về mảng visited (1 = tới được).
static func flood(m: MapData, start: Vector2i) -> PackedByteArray:
	var visited := PackedByteArray()
	visited.resize(m.width * m.height)
	if not m.is_walkable(start):
		return visited
	var queue := PackedInt32Array()
	queue.append(start.y * m.width + start.x)
	visited[queue[0]] = 1
	var head := 0
	while head < queue.size():
		var cur := queue[head]
		head += 1
		var cx := cur % m.width
		var cy := cur / m.width
		for k in 4:
			var nx: int = cx + (1 if k == 0 else (-1 if k == 1 else 0))
			var ny: int = cy + (1 if k == 2 else (-1 if k == 3 else 0))
			var n := Vector2i(nx, ny)
			if m.is_walkable(n) and visited[ny * m.width + nx] == 0:
				visited[ny * m.width + nx] = 1
				queue.append(ny * m.width + nx)
	return visited


static func _ensure_connected(m: MapData) -> void:
	var c := center(m)
	var visited := flood(m, c)
	for g in m.gates:
		if visited[g.y * m.width + g.x] == 0:
			# Đào hành lang rộng 3 ô từ cổng tới tâm (hình chữ L).
			var cur: Vector2i = g
			while cur.x != c.x:
				cur.x += signi(c.x - cur.x)
				_clear_disc(m, cur, 1)
			while cur.y != c.y:
				cur.y += signi(c.y - cur.y)
				_clear_disc(m, cur, 1)
			visited = flood(m, c)
	# Vùng đi được nhưng không nối với tâm = bị mắc kẹt -> lấp thành cây.
	for i in m.cells.size():
		if visited[i] == 0 and not MapData.is_blocking_terrain(m.cells[i]):
			m.cells[i] = MapData.Terrain.TREE


static func _place_bushes(m: MapData, s: int, rng: Rng) -> void:
	for y in m.height:
		for x in m.width:
			var r := rng.f()
			if m.get_t(x, y) == MapData.Terrain.GRASS and _fbm(x, y, s + 19) > 0.6 and r < 0.35:
				m.set_t(x, y, MapData.Terrain.BUSH)
