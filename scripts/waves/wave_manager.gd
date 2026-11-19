class_name WaveManager
extends Node
## Đợt quái bản cơ bản (Giai đoạn 2): đợt kế tiếp tự bắt đầu theo giờ, KHÔNG cần diệt hết đợt trước.
## Công thức độ khó chỉnh ở count_for / speed_for / pick_tier. Cân bằng đầy đủ + mốc thử thách: Giai đoạn 4.

signal wave_started(number: int)

const FIRST_DELAY := 8.0
const WAVE_SECONDS := 25.0
const TOTAL_WAVES := 100

var active := false
var wave := 0
var time_to_next := FIRST_DELAY
var _monsters: MonsterManager
var _gate := Vector2i.ZERO
var _queue: Array[int] = []
var _cd := 0.0
var _interval := 0.5


static func count_for(w: int) -> int:
	return int(4.0 + w * 1.6 + pow(float(w), 1.3) * 0.35)


static func speed_for(tier: int, w: int) -> float:
	return minf(55.0 + tier * 10.0 + w * 0.5, 125.0)


static func pick_tier(w: int) -> int:
	for t: int in [4, 3, 2, 1]:
		var p: float = clampf(float(w - t * 10) / 60.0, 0.0, 0.4)
		if randf() < p:
			return t
	return 0


func setup(m: MonsterManager, gate: Vector2i) -> void:
	_monsters = m
	_gate = gate


func start() -> void:
	active = true
	wave = 0
	time_to_next = FIRST_DELAY
	_queue.clear()
	_cd = 0.0


func pending() -> int:
	return _queue.size()


func _physics_process(dt: float) -> void:
	if not active or _monsters == null:
		return
	time_to_next -= dt
	if time_to_next <= 0.0 and wave < TOTAL_WAVES:
		wave += 1
		time_to_next = WAVE_SECONDS
		var n := count_for(wave)
		for i in n:
			_queue.append(pick_tier(wave))
		_interval = clampf(WAVE_SECONDS * 0.6 / float(n), 0.08, 0.8)
		wave_started.emit(wave)
	if not _queue.is_empty():
		_cd -= dt
		if _cd <= 0.0:
			if _monsters.spawn(_queue[0], _gate, wave):
				_queue.remove_at(0)
			_cd = _interval
