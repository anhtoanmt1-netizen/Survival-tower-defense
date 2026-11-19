extends Node2D
## Màn chơi Giai đoạn 1: bản đồ + nhân vật + điều khiển cảm ứng.
## UI tạm thời chỉ gồm các nút THẬT: tải Map ID, bản đồ mới, sao chép ID.

const T := GameConfig.TILE_SIZE

var map: MapData
var grid_path: GridPath
var player: Player
var camera: Camera2D
var ground: MapView
var back: MapView
var front: MapView
var joystick: VirtualJoystick
var info: Label
var id_edit: LineEdit


func _ready() -> void:
	ground = MapView.new()
	ground.layer = MapView.Layer.GROUND
	back = MapView.new()
	back.layer = MapView.Layer.BACK
	player = Player.new()
	front = MapView.new()
	front.layer = MapView.Layer.FRONT
	for n in [ground, back, player, front]:
		add_child(n)
	camera = Camera2D.new()
	camera.zoom = Vector2(1.8, 1.8)
	camera.position_smoothing_enabled = true
	player.add_child(camera)
	_build_ui()
	load_map(MapId.random_id(GameConfig.DEFAULT_THEME, GameConfig.DEFAULT_MAP_SIZE))


func load_map(id: String) -> bool:
	var m := MapGenerator.generate(id)
	if m == null:
		info.text = "Map ID không hợp lệ hoặc phiên bản không được hỗ trợ."
		return false
	map = m
	grid_path = GridPath.new(m)
	for v in [ground, back, front]:
		v.map = m
		v.player = player
	player.setup(m, grid_path, MapGenerator.center(m))
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = m.width * T
	camera.limit_bottom = m.height * T
	camera.reset_smoothing()
	id_edit.text = m.map_id
	return true


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	joystick = VirtualJoystick.new()
	joystick.anchor_top = 1.0
	joystick.anchor_bottom = 1.0
	joystick.offset_left = 40
	joystick.offset_top = -300
	joystick.offset_right = 300
	joystick.offset_bottom = -40
	layer.add_child(joystick)
	joystick.moved.connect(func(d: Vector2) -> void: player.joystick_dir = d)

	var box := VBoxContainer.new()
	box.position = Vector2(16, 12)
	layer.add_child(box)
	info = Label.new()
	info.add_theme_font_size_override("font_size", 20)
	box.add_child(info)
	var row := HBoxContainer.new()
	box.add_child(row)
	id_edit = LineEdit.new()
	id_edit.custom_minimum_size = Vector2(360, 0)
	id_edit.add_theme_font_size_override("font_size", 20)
	row.add_child(id_edit)
	row.add_child(_button("Tải ID", func() -> void:
		load_map(id_edit.text)
		id_edit.release_focus()))
	row.add_child(_button("Bản đồ mới", func() -> void:
		load_map(MapId.random_id(GameConfig.DEFAULT_THEME, GameConfig.DEFAULT_MAP_SIZE))))
	row.add_child(_button("Sao chép ID", func() -> void:
		DisplayServer.clipboard_set(id_edit.text)))


func _button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 20)
	b.pressed.connect(cb)
	return b


func _process(_d: float) -> void:
	if map != null and not info.text.begins_with("Map ID không"):
		info.text = "%dx%d | FPS %d" % [map.width, map.height, Engine.get_frames_per_second()]


func _unhandled_input(event: InputEvent) -> void:
	if map == null:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if joystick.get_global_rect().has_point(event.position):
			return
		var c := Vector2i((get_global_mouse_position() / T).floor())
		if map.is_walkable(c):
			player.move_to_cell(c)
