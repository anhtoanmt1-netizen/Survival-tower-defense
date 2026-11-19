class_name Player
extends Node2D
## Nhân vật nông dân. Hình vẽ hiện tại là PLACEHOLDER vẽ bằng code (chưa phải pixel art).
## Di chuyển: joystick / phím mũi tên, hoặc chạm để tự đi theo A*. Có 3 HP.

signal hp_changed(hp: int)
signal died

const T := GameConfig.TILE_SIZE
const HALF := 9.0
const MAX_HP := 3
const INVULN_AFTER_HIT := 1.2

@export var speed_tiles_per_sec := 4.5
@export var shirt_color := Color(0.85, 0.25, 0.2)

var map: MapData
var grid_path: GridPath
var joystick_dir := Vector2.ZERO
var hp := MAX_HP
var alive := true
var invuln := 0.0
var _path: Array[Vector2i] = []
var _moving := false
var _t := 0.0


func setup(m: MapData, gp: GridPath, start: Vector2i) -> void:
	map = m
	grid_path = gp
	_path.clear()
	position = (Vector2(start) + Vector2(0.5, 0.5)) * T
	hp = MAX_HP
	alive = true
	invuln = 0.0
	modulate = Color.WHITE
	hp_changed.emit(hp)


func cell() -> Vector2i:
	return Vector2i((position / T).floor())


func move_to_cell(target: Vector2i) -> void:
	if not alive or grid_path == null:
		return
	var p := grid_path.find_path(cell(), target)
	if p.size() > 1:
		p.remove_at(0)
		_path = p


func take_hit() -> void:
	if not alive or invuln > 0.0:
		return
	hp -= 1
	invuln = INVULN_AFTER_HIT
	hp_changed.emit(hp)
	if hp <= 0:
		alive = false
		_path.clear()
		modulate = Color(1.0, 0.35, 0.35, 0.7)
		died.emit()


func _physics_process(delta: float) -> void:
	if map == null:
		return
	if invuln > 0.0:
		invuln = maxf(invuln - delta, 0.0)
	if alive:
		var blink := invuln > 0.0 and int(invuln * 12.0) % 2 == 0
		modulate.a = 0.35 if blink else 1.0
	else:
		queue_redraw()
		return
	var dir := joystick_dir
	if dir == Vector2.ZERO:
		dir = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if dir != Vector2.ZERO:
		_path.clear()
	elif not _path.is_empty():
		var target := (Vector2(_path[0]) + Vector2(0.5, 0.5)) * T
		var to := target - position
		if to.length() < 4.0:
			_path.remove_at(0)
		else:
			dir = to.normalized()
	_moving = dir != Vector2.ZERO
	if _moving:
		_move(dir.limit_length(1.0) * speed_tiles_per_sec * T * delta)
	_t += delta
	queue_redraw()


func _move(v: Vector2) -> void:
	var nx := position + Vector2(v.x, 0.0)
	if not _collides(nx):
		position = nx
	var ny := position + Vector2(0.0, v.y)
	if not _collides(ny):
		position = ny


func _collides(p: Vector2) -> bool:
	for off in [Vector2(-HALF, -HALF), Vector2(HALF, -HALF), Vector2(-HALF, HALF), Vector2(HALF, HALF)]:
		if not map.is_walkable(Vector2i(((p + off) / T).floor())):
			return true
	return false


func _draw() -> void:
	var bob := sin(_t * 14.0) * 1.5 if _moving else 0.0
	draw_set_transform(Vector2(0, 2), 0.0, Vector2(1.0, 0.4))
	draw_circle(Vector2.ZERO, 10.0, Color(0, 0, 0, 0.3))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	draw_rect(Rect2(-6, -16 + bob, 12, 14), shirt_color)
	draw_rect(Rect2(-5, -4 + bob, 4, 5), Color(0.25, 0.2, 0.4))
	draw_rect(Rect2(1, -4 - bob, 4, 5), Color(0.25, 0.2, 0.4))
	draw_circle(Vector2(0, -21 + bob), 5.5, Color(0.95, 0.78, 0.6))
	draw_rect(Rect2(-7, -28 + bob, 14, 4), Color(0.85, 0.7, 0.3))
	draw_rect(Rect2(8, -16 + bob, 2, 12), Color(0.45, 0.3, 0.15))
	draw_rect(Rect2(6, -19 + bob, 7, 5), Color(0.55, 0.55, 0.6))
