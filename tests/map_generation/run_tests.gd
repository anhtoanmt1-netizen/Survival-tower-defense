extends SceneTree
## Chạy: godot --headless --script res://tests/map_generation/run_tests.gd
## (lần đầu chạy `godot --headless --import` để nạp class_name).

var failures := 0


func check(cond: bool, msg: String) -> void:
	print(("PASS  " if cond else "FAIL  ") + msg)
	if not cond:
		failures += 1


func _init() -> void:
	test_ids()
	test_generate_100()
	test_reproducible()
	test_playable_many_seeds()
	test_larger_size()
	print("Thất bại: %d" % failures)
	quit(1 if failures > 0 else 0)


func test_ids() -> void:
	var id := MapId.make("FOREST", 100, 123456789)
	var p := MapId.parse(id)
	check(p.ok and p.seed == 123456789 and p.size == 100 and p.version == MapGenerator.ALGO_VERSION, "Map ID encode/decode round-trip")
	check(not MapId.parse("rac-roi").ok, "Map ID sai định dạng bị từ chối")
	check(MapGenerator.generate("FOREST-V99-100-A8F72K") == null, "Phiên bản thuật toán lạ bị từ chối")


func test_generate_100() -> void:
	var m := MapGenerator.generate("FOREST-V1-100-A8F72K")
	check(m != null and m.width == 100 and m.height == 100 and m.cells.size() == 10000, "Tạo bản đồ 100x100")


func test_reproducible() -> void:
	var a := MapGenerator.generate("FOREST-V1-100-A8F72K")
	var b := MapGenerator.generate("forest-v1-100-a8f72k")
	check(a.cells == b.cells, "Cùng Map ID -> cùng bản đồ (kể cả khác hoa/thường)")
	var c := MapGenerator.generate("FOREST-V1-100-A8F72M")
	check(a.cells != c.cells, "Khác seed -> khác bản đồ")


func test_playable_many_seeds() -> void:
	var all_ok := true
	for k in 20:
		var m := MapGenerator.generate(MapId.make("FOREST", 100, 1000 + k * 7919))
		var visited := MapGenerator.flood(m, MapGenerator.center(m))
		var trapped := 0
		var blocked := 0
		for i in m.cells.size():
			if MapData.is_blocking_terrain(m.cells[i]):
				blocked += 1
			elif visited[i] == 0:
				trapped += 1
		var gp := GridPath.new(m)
		var gates_ok := true
		for g in m.gates:
			if not gp.has_path(g, MapGenerator.center(m)):
				gates_ok = false
		var ratio := float(blocked) / float(m.cells.size())
		if trapped > 0 or not gates_ok or ratio > 0.5:
			all_ok = false
			print("  seed index %d: trapped=%d gates_ok=%s blocked=%.2f" % [k, trapped, gates_ok, ratio])
	check(all_ok, "20 bản đồ: không vùng kẹt, 8 cổng đều có đường tới tâm, mật độ vật cản hợp lý")


func test_larger_size() -> void:
	var m := MapGenerator.generate(MapId.make("FOREST", 150, 42))
	check(m != null and m.cells.size() == 22500, "Bản đồ 150x150 dùng chung code")
