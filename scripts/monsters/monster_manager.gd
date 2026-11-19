class_name MonsterManager
extends Node2D
## Quản lý toàn bộ slime trong MỘT node (không tạo node cho từng con): cập nhật + vẽ gộp.
## Slime đi theo FlowField tới người chơi, không xuyên vật cản. Chưa bị tháp tiêu diệt (Giai đoạn 3).

const T := GameConfig.TILE_SIZE
const MAX_ACTIVE := 150
const FLOW_MIN_INTERVAL := 0.3
const HIT_DIST_SQ := 169.0  # 13 px
const TIER_COLORS: Array[Color] = [
	Color(0.30, 0.78, 0.30),  # xanh lá  - thường
	Color(0.30, 0.50, 0.95),  # xanh dương
	Color(0.62, 0.32, 0.85),  # tím
	Color(0.90, 0.25, 0.25),  # đỏ
	Color(0.95, 0.85, 0.25),  # vàng - đặc biệt
]


class Slime:
	var pos := Vector2.ZERO
	var hp := 3
	var speed := 55.0
	var tier := 0
	var phase := 0.0


var map: MapData
var player: Player
var flow: FlowField
var slimes: Array[Slime] = []
var _flow_timer := 0.0
var _last_target := Vector2i(-1, -1)


func setup(m: MapData, p: Player) -> void:
	map = m
	player = p
	flow = FlowField.new(m)
	slimes.clear()
	_last_target = p.cell()
	flow.rebuild(_last_target)
	_flow_timer = FLOW_MIN_INTERVAL


func count() -> int:
	return slimes.size()


func spawn(tier: int, gate: Vector2i, wave: int) -> bool:
	if map == null or slimes.size() >= MAX_ACTIVE:
		return false
	var cell := gate
	for _try in 8:
		var c := gate + Vector2i(randi_range(-2, 2), randi_range(-2, 2))
		if map.is_walkable(c):
			cell = c
			break
	var s := Slime.new()
	s.pos = (Vector2(cell) + Vector2(randf_range(0.2, 0.8), randf_range(0.2, 0.8))) * T
	s.tier = clampi(tier, 0, TIER_COLORS.size() - 1)
	s.speed = WaveManager.speed_for(s.tier, wave)
	s.hp = 3 + s.tier * 2
	s.phase = randf() * TAU
	slimes.append(s)
	return true


func _physics_process(delta: float) -> void:
	if map == null or player == null:
		return
	_flow_timer -= delta
	var pc := player.cell()
	if _flow_timer <= 0.0 and pc != _last_target:
		flow.rebuild(pc)
		_last_target = pc
		_flow_timer = FLOW_MIN_INTERVAL
	var pp := player.position
	for s in slimes:
		_step(s, delta)
		if player.alive and s.pos.distance_squared_to(pp) < HIT_DIST_SQ:
			player.take_hit()
	queue_redraw()


func _step(s: Slime, dt: float) -> void:
	s.phase += dt * 6.0
	var c := Vector2i((s.pos / T).floor())
	var target := Vector2.ZERO
	if c == player.cell() or s.pos.distance_to(player.position) < T * 0.9:
		target = player.position
	else:
		var nxt := flow.next_step(c)
		if nxt == c:
			return  # không có đường đi: đứng yên, không bao giờ xuyên vật cản
		target = (Vector2(nxt) + Vector2(0.5, 0.5)) * T
	var to := target - s.pos
	var d := to.length()
	if d > 0.5:
		s.pos += to / d * minf(s.speed * dt, d)


func _draw() -> void:
	if map == null:
		return
	var vr: Rect2 = get_canvas_transform().affine_inverse() * get_viewport_rect()
	vr = vr.grow(T)
	for s in slimes:
		if vr.has_point(s.pos):
			_draw_slime(s)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_slime(s: Slime) -> void:
	var r := 9.0 * (1.0 + 0.12 * float(s.tier))
	var hop := absf(sin(s.phase))
	var squash := 1.0 + 0.15 * (1.0 - hop)
	var col: Color = TIER_COLORS[s.tier]
	draw_set_transform(s.pos + Vector2(0, 2), 0.0, Vector2(1.0, 0.4))
	draw_circle(Vector2.ZERO, r, Color(0, 0, 0, 0.3))
	draw_set_transform(s.pos + Vector2(0, -hop * 5.0), 0.0, Vector2(squash, 2.0 - squash))
	draw_circle(Vector2(0, -r * 0.9), r, col)
	draw_circle(Vector2(-r * 0.3, -r * 1.2), r * 0.3, col.lightened(0.35))
	draw_circle(Vector2(-r * 0.35, -r), 2.2, Color.WHITE)
	draw_circle(Vector2(r * 0.35, -r), 2.2, Color.WHITE)
	draw_circle(Vector2(-r * 0.35, -r), 1.1, Color.BLACK)
	draw_circle(Vector2(r * 0.35, -r), 1.1, Color.BLACK)
	if s.tier == 4:
		draw_arc(Vector2(0, -r * 0.9), r + 3.0, 0.0, TAU, 20, Color(1.0, 1.0, 0.5, 0.8), 1.5)
